# 050 — Report Mode

> Status: ACTIVE. Depends on [020-assessor-contract.md](020-assessor-contract.md),
> [030-profiles.md](030-profiles.md), [040-task-graph.md](040-task-graph.md).

```
shipshape report <path...> [--profile p] [--meta path] [--conventions f.md]...
                 [--out dir] [--resume run-dir] [--assessor id]... [--dry-run]
```

## Pipeline

```
recon ──> plan ──> assess:<id> (fan-out, parallel) ──> synthesize
```

### 1. Recon (tier: scan)

One agent explores the target set read-only and writes:

- `recon/repo-map.md` — orientation for every later agent: what this system
  is, languages, package inventory, build/test entry points as documented,
  where agent-facing docs/config live (the harness surface: AGENTS.md,
  CLAUDE.md, .claude/, .cursor/, .github/workflows agent jobs, hooks, linter
  configs), monorepo/meta-repo structure, notable oddities.
- `recon/packages.json` — structured inventory (per package: path, language,
  build tool, test command if discoverable, agent-doc paths).

Recon exists so 25 assessors don't each re-discover the repo shape; assessors
receive `repo-map.md` in-context and may still explore further themselves.

### 2. Plan (tier: synthesize)

An agent reads the profile's assessor roster + recon output and emits the
`assess:<id>` tasks: which assessors apply (e.g. `ci-agent-safety` is skipped
with reason when the repo has no agent workflows — recorded as `skipped` with
a note that lands in the overall report), and per-assessor target hints for
monorepos (which packages matter most for that practice). It cannot invent
assessors or alter config; it selects and annotates within the validated
roster.

### 3. Assess (tiers: scan, judge)

Per assessor: shipshape composes the prompt from (in precedence order) the
output contract + rubric frame, the assessor's `assess.md`, resolved config,
recon summary, target inventory, then team conventions (labeled as steering).
Steps:

- optional **scan step** (cheap model): gather/sample evidence into
  `resources/`;
- **judge step**: weigh evidence, write `report.md` per the contract.

Shipshape validates frontmatter + sections; an invalid report goes back to
the agent once with the validation errors; a second failure marks the task
failed. Report-mode agents get read-only tools; `needsExecution: true`
assessors additionally get Bash confined to a scratch copy of the target
(see `build-test-locally`), still without network tools.

### 4. Synthesize (tier: synthesize)

One agent reads every assessor report (and skips/failures) and writes
`report.md`:

```yaml
# frontmatter
run: <run-id>
generated: <iso date>
targets: [...]
profile: balanced
overall: 3          # weighted median maturity, see below
confidence: high
assessed: 24
skipped: 1
failed: 0
```

1. `## Scorecard` — overall maturity + a table: assessor, category, level,
   confidence, one-line summary (links to each per-assessor report).
2. `## Maturity by category` — the five categories with short narrative.
3. `## Top opportunities` — cross-assessor, impact-ordered (5-10): the
   changes that would raise maturity most, with which assessors' findings
   support each and effort hints. This is the section a team reads first.
4. `## What's already working` — the practices the repo genuinely nails;
   specific, citable, not filler praise.
5. `## Detailed findings` — per category, per assessor: condensed verdicts
   and every opportunity, so the report is complete without opening
   per-assessor files (which remain the deep-dive layer).
6. `## Run notes` — skipped/failed assessors with reasons, cost summary,
   how to run doctor mode on this directory.

Overall maturity is the weighted median of assessor levels (weights default
to 1; profiles may weight per assessor). Median, not mean: one L5 practice
must not paper over three L1s, and the synthesizer explains the spread rather
than letting a single number carry the story.
