# 070 — Default Assessor Catalog

> Status: ACTIVE. Depends on [020-assessor-contract.md](020-assessor-contract.md).
> The catalog is grounded in the practices distilled from the Hitchhiker's
> Guide to AI-Native Engineering; each assessor's `assess.md` carries its own
> rationale and rubric. This spec is the map.

Twenty-five assessors in five categories. "Origin" marks whether the assessor
came from the initial requirements (R1-R18) or was added from the distilled
guide research (G).

## docs — agent-facing documentation

| id | origin | practice |
| --- | --- | --- |
| `agents-md-quality` | R3 | AGENTS.md (or equivalent) exists, is minimal and current; every reference resolves; prohibitions and surgical rules lead; content passes the "filter test" (nothing an agent can discover on its own); redirect pattern over duplicated per-tool files; monorepos route via nested docs. Respects deliberate alternatives (e.g. gitignored CLAUDE.md with committed AGENTS.md). |
| `architecture-docs` | R1 | Architecture and code-layout choices are documented outside the agent doc (ARCHITECTURE.md/ADRs), reachable from it, and match the actual tree. |
| `spec-organization` | R4 | Specs/plans/decision logs are committed and **ordered** (index, numbering, status markers) so agents can find what matters as the count grows; decision rationale is written down at decision time. |
| `dev-environment-docs` | R7 | Local development is documented well enough for an autonomous agent: setup, build, test, run, per-package command matrix where commands differ. |
| `doc-freshness` | R5 | Recent specs vs code: stale status claims ("not yet implemented" on shipped code), spec features missing from code, orphaned docs unreachable from any entry point, staleness metadata. |

## process — review and workflow

| id | origin | practice |
| --- | --- | --- |
| `review-process` | R6 | A documented agentic review process that both humans and agents can discover; local (pre-PR) review comes first; review criteria are enumerable, not vibes. |
| `reviewer-agents` | R2, R12 | Adversarial reviewer agents are defined and wired: an architecture-consistency reviewer, fast and thorough review paths, reviewers run in separate context with anti-sycophancy prompts and no access to the author's reasoning. |
| `security-reviewer` | R13 | A **dedicated** security reviewer (not a mode of the general reviewer) with durable, repo-specific threat context (THREAT_MODEL.md or equivalent referenced concerns). |
| `doc-drift-automation` | R14 | An agent/workflow exists whose job is finding spec-code drift on a cadence and proposing updates for human merge. |
| `git-history-hygiene` | R15 | The git history shows the documented process actually happening: issue/spec linkage, docs updated in the same commit as code, PR bodies written by an author who read the diff, revert rate on agent-authored work. |
| `task-handoff` | G | Work survives context loss: plan files where the harness preserves them, machine-readable task state, handoff/progress conventions, results kept out of plan templates. |

## enforcement — mechanical guarantees

| id | origin | practice |
| --- | --- | --- |
| `build-test-locally` | R8 | **Runtime check**: actually build and test the package following only the committed docs, in a scratch copy. Every failure or undocumented prerequisite is friction every future agent pays. |
| `quality-gate-parity` | R8/G | Lint/format/typecheck/test exist as documented commands, and local gate == CI (single source, cannot drift). |
| `commit-hooks` | R9 | Git hooks (pre-commit/husky/lefthook…) force the documented process; hook events used well (blocking pre-tool checks, stop-hook stub scans where a harness exists). |
| `code-quality-linters` | R10 | Linters/formatters/type-checkers enforce style so prose doesn't have to; agent docs do **not** restate what the linter enforces. |
| `architecture-linters` | R11 | Architectural choices (cross-package/module dependency rules, layering) are lint-enforced (import-linter, dependency-cruiser, ArchUnit, eslint boundaries…), in CI, not just stated in prose. |
| `enforcement-hierarchy` | G | Every "never/always" found in prose is reconciled against a mechanical control (permissions/settings deny, blocking hook, CI gate, capability removal). Prose-only prohibitions are findings with the specific control they should become; permission allowlists are granular and least-privilege. |
| `test-trustworthiness` | G | The safety net can actually fail: no lying tests (mocked reimplementations, swallow-all harnesses, `\|\| true`), suppression drift (`noqa`/`eslint-disable`/`@ts-ignore`/skips) is bounded, mutation-style spot checks where cheap. |
| `ci-agent-safety` | G | Where agents run in CI: no raw event-payload interpolation into prompts, token scopes split by direction, sandbox/resource limits, attempt caps, shadow→gate rollout for blocking agents. Skipped (with note) when no agent workflows exist. |

## legibility — can an agent understand the code

| id | origin | practice |
| --- | --- | --- |
| `codebase-orientation` | R16a | Holistic: starting from the repo's own docs, how quickly can an agent locate where a new feature or bug fix belongs? Tested by scenario ("where would X go?"), not vibes. |
| `concept-clarity` | R16b | Sample the codebase's key concepts/identifiers and spot-check usage sites: is it locally clear what's happening, or do names collide, shadow, or mislead? |
| `abstraction-consistency` | R17 | Same problem solved the same way everywhere; no gratuitous duplicate/redundant code; abstractions at consistent altitude with well-defined seams. |
| `control-flow-legibility` | R18 | Deeply nested branching, long functions, and non-obvious control flow are either absent or explained by comments stating what the code cannot (invariants, whys); comment density matches complexity. |

## operations — cost, context, model discipline

| id | origin | practice |
| --- | --- | --- |
| `context-economy` | G | The agent-facing surface respects the context budget: agent docs sized to earn their tokens, few MCP servers (prefer skills/CLIs), documented commands use quiet/failure-only output flags, long procedures extracted to skills. |
| `model-cost-discipline` | G | Model selection is routed by task tier rather than hardcoded everywhere; pinned model IDs are treated as versioned dependencies; agent loops have attempt limits/circuit breakers and budget ceilings. Skipped when the repo has no agent workflows/harness. |

## Deliberate non-assessors

- **TDD-in-the-agent-loop** — the guide marks this debated (no measured
  quality gain at 3-8.5× token cost); `test-trustworthiness` covers the
  underlying goal.
- **Agent-doc line-count limits** — sizing is debated and repo-shaped;
  `agents-md-quality`/`context-economy` judge value-per-line, not length.
- **Team/org process** (license allocation, rollout staging, measurement
  layers) — real practices, but not visible in a repo; out of scope for a
  repo scanner. Teams can encode org-visible slices as team assessors.

## Reviewer roles in doctor mode

`reviewer-agents` (canReview: docs, process, legibility, operations),
`architecture-linters` (enforcement), `security-reviewer` (any fix touching
hooks, CI, permissions, or executable config), `agents-md-quality` (docs).
Every fix branch gets at least one category reviewer plus the general
reviewer, per [060-doctor-mode.md](060-doctor-mode.md).
