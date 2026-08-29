# 010 — Architecture

> Status: ACTIVE. Depends on [000-overview.md](000-overview.md).

## Language and runtime

Shipshape is a Node.js (>= 20) TypeScript CLI, distributed as an npm package
with a `shipshape` bin. Agents are executed through the
`@anthropic-ai/claude-agent-sdk` (`query()`), which drives the Claude Code
runtime in headless mode. Authentication is whatever the invoking user's
Claude Code / `ANTHROPIC_API_KEY` environment provides — shipshape adds no
auth of its own.

## Layering

```
┌────────────────────────────────────────────────────────┐
│ cli/          commander commands: report, doctor,      │
│               list-assessors, validate, show           │
├────────────────────────────────────────────────────────┤
│ pipeline/     report-mode and doctor-mode pipelines:   │
│               build the task graph, wire task handlers │
├────────────────────────────────────────────────────────┤
│ core/                                                  │
│   config.ts     profile + assessor loading, zod schemas│
│   graph.ts      file-backed task graph runner          │
│   agent.ts      Claude Agent SDK wrapper, model tiers, │
│                 cost ledger, transcript capture        │
│   reportio.ts   assessor report parse/validate,        │
│                 frontmatter contract                   │
│   gitops.ts     branch creation/inspection for doctor  │
│   targets.ts    target-set resolution (multi/mono/meta)│
├────────────────────────────────────────────────────────┤
│ assessors/    shipped assessor definitions (data, not  │
│               code: assessor.yaml + assess.md + fix.md)│
│ profiles/     shipped profiles (cheap/balanced/        │
│               thorough as yaml)                        │
└────────────────────────────────────────────────────────┘
```

Rules:

- `cli/` may import `pipeline/` and `core/`; `pipeline/` may import `core/`;
  `core/` imports neither. Shipped `assessors/` and `profiles/` are **data
  only** — no TypeScript lives there. These boundaries are enforced by lint
  (see `eslint.config.js` import restrictions).
- Everything an agent needs at runtime is passed in its prompt or readable
  from the run directory / target repos; agents never import shipshape code.

## The run directory

Every `shipshape report` invocation creates (or resumes) a run directory:

```
<out>/<run-id>/                    # run-id: <utc-stamp>-<slug>
  run.json                         # RunManifest: targets, profile snapshot,
                                   # model map, CLI args, versions
  graph/
    graph.json                     # task graph: nodes, deps, status, attempts
    tasks/<task-id>/               # per-task workspace
      transcript.jsonl             # agent transcript (tail-truncated)
      result.json                  # handler result + cost
  recon/
    repo-map.md                    # shared recon report (agent-written)
    packages.json                  # structured package inventory
  assessors/<assessor-id>/
    report.md                      # the assessor report (spec 020 contract)
    resources/…                    # free-form ancillary files
  report.md                        # the overall report
  costs.json                       # per-task and total token/cost ledger
  doctor/                          # created by doctor mode (spec 060)
    fixes.json                     # branch inventory + review status
    review-plan.md                 # human-facing review ordering report
    reviews/<branch-slug>.md       # adversarial review verdicts
```

The run directory is the **only** mutable state. Deleting it forgets the run;
copying it preserves everything including resumability. Report mode treats
target repos as read-only; doctor mode's only writes to a target are git
branches (and their commits).

## The agent runner (`core/agent.ts`)

A thin, uniform wrapper over the Agent SDK:

- **Input**: system-prompt fragments (assessor prompt, conventions files,
  recon summary, output contract), a working directory, an allowed-tools set,
  a **model tier**, and a max-turn/budget cap.
- **Tiers**: `scan`, `judge`, `synthesize`, `fix`, `review`. The profile maps
  each tier to a concrete model (e.g. `scan: claude-haiku-4-5`,
  `judge: claude-sonnet-…`). An assessor step names a tier, never a model, so
  cost posture is entirely a profile decision. A single assessor may use
  multiple tiers across its steps (cheap scan pass, expensive judgment pass).
- **Permissions**: every agent runs with a restricted base toolset
  (`tools` + `allowedTools` set to exactly the grant, `acceptEdits` mode, no
  target settings loaded). Report-mode agents get Read/Glob/Grep plus
  Write/Edit for their own output directory — the write confinement is
  prompt-level (absolute output paths) and **verified** after every task by
  git-status checks on the targets, which fail the task on stray writes.
  Bash is granted only to recon and `needsExecution: true` assessors
  (instructed read-only / scratch-copy usage; see THREAT_MODEL.md for the
  honest limits of prompt-level confinement). Doctor-mode fix agents get
  write + git inside a dedicated per-branch worktree; non-worktree doctor
  agents are covered by the same working-tree verification. Agents never
  get network tools.
- **Cost ledger**: every SDK result's usage is appended to `costs.json` keyed
  by task id and tier, so reports can state what the run cost.
- **Failure**: a task's agent failure (SDK error, contract-violating output)
  marks the task `failed` with the error captured; the graph runner retries
  once, then continues other branches — one broken assessor never kills a run.

## Orchestration model

The pipelines express work as a **task graph** (spec 040): a plain JSON DAG in
the run directory, executed by a small in-process runner with a concurrency
limit. Deliberately not a workflow engine: no daemon, no queue, no plugin
system. Agentic flexibility comes from *what the tasks do* (each task handler
prompts an agent) and from the **plan task**, which lets an agent decide parts
of the graph's shape (e.g. which assessors are applicable, how to shard a
monorepo) within schema-validated bounds.

## Target-set resolution (`core/targets.ts`)

CLI paths + flags resolve to a `TargetSet`:

- each path → a `Target` (must be a git work tree for doctor mode),
- `--meta <path>` marks the target whose agent instructions/hooks govern the
  group,
- recon may subdivide a target into `packages` (monorepo) — assessors receive
  the whole `TargetSet` and the recon inventory, and decide per practice
  whether to assess at group, repo, or package granularity.

## Steering inputs

- `--conventions <file.md>` (repeatable) and profile-declared conventions
  files are concatenated into a "Team conventions" system-prompt fragment for
  **every** agent (planner, assessors, synthesizer, fixers, reviewers).
  Conventions can tighten or relax what an assessor considers good, and may
  target specific assessors with `## assessor:<id>` sections.
- Conventions never change the report **format** contract — only judgment.

## Security posture

Assessor definitions and conventions files are prompts; running a profile from
an untrusted source is running untrusted instructions with repo access.
Shipshape mitigates but does not eliminate this: report mode is read-only with
no network tools, doctor mode confines writes to branches, and `shipshape
validate` surfaces which assessors request execution or write access. Teams
should review third-party assessors like they review CI config.
