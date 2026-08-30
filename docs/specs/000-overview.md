# 000 — Shipshape Overview

> Status: ACTIVE. This is the entry-point spec. Read this first; each later spec
> deepens one subsystem. Specs are numbered in reading order — lower numbers are
> more foundational and more stable.

## What shipshape is

Shipshape is a CLI that scans one or more code repositories and assesses how
well they follow **agentic engineering best practices** — the practices that
make a codebase easy and safe for AI agents (and the humans steering them) to
work in: agent-discoverable documentation, spec-driven development, enforced
review processes, architectural guardrails, reproducible local builds, and
code that is legible to an agent landing in it cold.

The unit of opinion is the **assessor**: a self-contained definition of one
best practice — what it is, how to gather evidence for it, how to score it on
a maturity scale, and (optionally) how to fix shortfalls. A **profile** is a
configured set of assessors. Shipshape ships an opinionated default set of
assessors and three default profiles (`cheap`, `balanced`, `thorough`); teams
can define their own profiles that reuse, reconfigure, extend, or replace the
shipped assessors, and can steer every assessor with team convention docs.

## The two modes

1. **Report mode** (`shipshape report`) — runs the profile's assessors against
   the target package(s) and produces:
   - one structured markdown report per assessor (standard sections + YAML
     frontmatter, plus free-form ancillary resource files), and
   - one overall report: aggregate maturity, per-assessor status summary, top
     opportunities to improve, top existing strengths, then detailed findings.
   Report mode is **read-only** with respect to the target repos.

2. **Doctor mode** (`shipshape doctor`) — pointed at a previous report run
   directory, re-reads each assessor's own report and resources, and stages
   proposed improvements as **local git branches** in the target repo(s), one
   branch per coherent fix. Every branch is adversarially reviewed by other
   assessors before it is accepted. The output is the set of branches plus a
   **review plan** report ordering them by priority and dependency so humans
   can review the most important changes first. Doctor mode never pushes and
   never opens PRs.

## Design tenets

- **Agentic all the way down.** Planning, evidence gathering, judgment, report
  synthesis, fixing, and fix review are all performed by agents (Claude Agent
  SDK) so behavior adapts to unfamiliar repo shapes and is steerable by team
  conventions. The host CLI provides orchestration, state, validation, and
  guardrails — not hardcoded per-language analysis.
- **Cost is a first-class dimension.** Every agent step declares a **model
  tier** (`scan`, `judge`, `synthesize`, `fix`, `review`); profiles map tiers
  to concrete models. The same assessor runs cheap or thorough by profile
  choice, not by code change.
- **Resumable, inspectable orchestration.** Work is decomposed into a simple
  file-backed task graph in the run directory. No daemon, no database, no
  external service: `--resume` re-enters the graph and skips completed tasks.
- **Own medicine.** This repository follows the practices its assessors check
  for, and its CI/hooks run shipshape's practices against itself.

## Target shapes

- **Single package**: `shipshape report /path/to/repo`
- **Multi-package**: `shipshape report /path/a /path/b /path/c` — assessed as
  one logical system (useful when related packages are not a monorepo).
- **Monorepo**: a single path whose recon phase detects multiple packages;
  assessors see both the whole and the parts.
- **Meta-repo**: `--meta /path/to/meta` marks one package as the carrier of
  shared agent instructions/hooks/conventions that apply to the whole group;
  assessors credit group-level practices found there.

Target repos may be in any language. Python, JS/TS, Java, and Rust are the
first-class targets; assessors are written to reason about conventions rather
than parse syntax, so other languages degrade gracefully.

## Spec index

| Spec | Covers |
| --- | --- |
| [000-overview.md](000-overview.md) | This document |
| [010-architecture.md](010-architecture.md) | CLI, engine layers, run directory layout, agent runner |
| [020-assessor-contract.md](020-assessor-contract.md) | Assessor definition format, report format, maturity levels |
| [030-profiles.md](030-profiles.md) | Profile schema, model tiers, team conventions steering |
| [040-task-graph.md](040-task-graph.md) | Task graph model, persistence, resumption |
| [050-report-mode.md](050-report-mode.md) | Report pipeline: recon → assess → synthesize |
| [060-doctor-mode.md](060-doctor-mode.md) | Fix pipeline: fix planning → branches → adversarial review → review plan |
| [070-assessor-catalog.md](070-assessor-catalog.md) | The default assessor library and its rationale |

## Glossary

- **Assessor** — one best-practice checker: metadata + prompts + config schema.
- **Profile** — a configured set of assessors plus model-tier mappings.
- **Run directory** — the output folder of one report run; also the input to
  doctor mode and the home of all orchestration state.
- **Recon** — the shared repo-mapping phase whose output every assessor reads
  instead of re-discovering repo structure.
- **Maturity level** — L1–L5 score each assessor assigns (see spec 020).
- **Conventions file** — team-provided markdown injected into every agent's
  context to steer assessment and fixes.
