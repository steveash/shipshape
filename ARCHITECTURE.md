# Shipshape architecture

> The source of truth for *how* shipshape is structured. The full design lives
> in the ordered specs under [docs/specs/](docs/specs/000-overview.md); this
> file is the orientation layer. If the tree and this file disagree, fix one
> of them in the same change that caused the drift.

## What it is

A Node/TypeScript CLI that orchestrates Claude Agent SDK agents to (1) assess
repositories against agentic-engineering best practices and produce reports
(`shipshape report`), and (2) stage adversarially-reviewed fix branches from a
prior report (`shipshape doctor`). Assessors and profiles are data (markdown
prompts + yaml), not code.

## Repository layout

```
src/
  cli.ts            commander entry point (report, doctor, list-assessors, validate)
  index.ts          library exports for embedding
  core/             engine primitives; imports neither pipeline/ nor cli/ (lint-enforced)
    types.ts        shared contracts (tiers, tasks, reports, fixes)
    config.ts       assessor/profile loading + zod validation, extends resolution
    graph.ts        file-backed resumable task-graph runner (spec 040)
    agent.ts        Claude Agent SDK wrapper: model tiers, cost ledger, transcripts
    reportio.ts     assessor report + review verdict parsing/validation (specs 020/060)
    targets.ts      CLI paths -> TargetSet (multi-package, meta-repo)
    gitops.ts       doctor-mode git: branches, worktrees, diffs — never push
    log.ts          timestamped console logging
  pipeline/         mode orchestration; may import core/ only
    prompts.ts      prompt composition + conventions filtering (spec 030)
    report.ts       recon -> plan -> assess fan-out -> synthesize (spec 050)
    doctor.ts       fix-plan -> fix -> review -> revise -> review-plan (spec 060)
assessors/<id>/     shipped assessor definitions: assessor.yaml + assess.md + fix.md
profiles/           shipped profiles: balanced.yaml (base), cheap.yaml, thorough.yaml
docs/specs/         numbered design specs, 000 is the index
docs/dev-process.md local development + review process
tests/              vitest unit tests; data-validation.test.ts guards shipped data
scripts/gate.sh     the single-source quality gate (local == CI)
.claude/agents/     reviewer agents for pre-PR adversarial review of this repo
.github/workflows/  CI: runs scripts/gate.sh --check
```

## Key decisions (and where they're argued)

- D1 Agentic everywhere, thin deterministic host — spec 000/010.
- D2 Model tiers (`scan/judge/synthesize/fix/review`) mapped to models by
  profile, never by assessor — spec 030.
- D3 Task graph is a JSON DAG in the run dir, no workflow engine — spec 040.
- D4 Maturity levels L1–L5 weighting enforcement over documentation — spec 020.
- D5 Report mode is read-only on targets, verified via git-status checks;
  doctor mode writes only branches via worktrees, never pushes — specs 050/060.
- D6 Assessor reports are a validated md+frontmatter contract with one
  bounded repair round — spec 020, `src/core/reportio.ts`.
- D7 Shipped data is gate-validated through the same loaders the CLI uses —
  `tests/data-validation.test.ts`.

## Invariants worth protecting

- One broken assessor never kills a run (graph isolates failures).
- Resume is always safe: run state lives only in the run directory; task
  outputs are task-owned paths overwritten on retry.
- Conventions steer judgment but can never change output contracts or
  expand tool access (`src/pipeline/prompts.ts` wraps them with that notice).
- Doctor reviewers never see the fixer's reasoning — only diff, findings,
  and repo.
