# Assessing the documented review process

## Why this matters

When agents multiply the volume of changes, review becomes the bottleneck —
and an undocumented review process is one that agents cannot participate in
at all. The ideal is a verification stack ordered cheapest-first:
deterministic tools (linters, type checkers, formatters) → hooks → CI →
agent review → human review. Each layer is a net for the next: the linter
catches what would waste the CI run, CI catches what would waste the agent
reviewer, the agent reviewer catches what would waste the human. Local
review before the PR is the cheapest agent-visible layer of all. And the
criteria at every layer must be enumerable: a reviewer (human or agent) told
to check that code is "good" will declare victory early; one given a list of
checkable properties will check them.

## Evidence to gather (scan step)

1. **Hunt for the review surface.** Inventory every place review process
   could be documented: CONTRIBUTING.md, README review sections, AGENTS.md /
   CLAUDE.md review guidance, docs/ review or process docs,
   .github/PULL_REQUEST_TEMPLATE*, CODEOWNERS, .claude/commands/*review*,
   .claude/agents/* with review roles, review checklists anywhere. Record
   path and role of each (up to `maxDocsToInventory` in depth). Write the
   inventory to `resources/review-surface.md`.
2. **Map the verification stack.** From configs (lint/format/typecheck
   configs, git hooks, CI workflows, agent reviewer definitions) reconstruct
   which layers actually exist and in what order a change hits them. Note
   whether the documentation describes this order — "run the gate, then
   local review, then open the PR" — or whether the stack exists but is
   undocumented (and thus undiscoverable to an agent).
3. **Test criteria for enumerability.** For each review checklist or
   reviewer prompt found, classify its criteria: behavioral/checkable
   ("every exported function has a test", "no changes outside the stated
   scope") vs. vibes ("code is good/clean/high quality" with no
   definition). A prompt or checklist containing the word "good" without a
   definition is a named failure mode — record each instance with path and
   line.
4. **Fast vs thorough paths.** Does the process distinguish a quick pass
   (typo-level, docs-only) from a thorough one (behavior, security-sensitive
   paths)? One-size-fits-all review either over-taxes small changes or
   under-reviews big ones.
5. **AI-generated-code checklist.** Look for a documented verification
   checklist for approving agent-authored changes: CI green, author can
   explain the diff, no unrelated changes smuggled in, docs updated in the
   same commit as the behavior they describe. Absence is a finding wherever
   the repo shows agent involvement (agent docs, Co-Authored-By trailers).
6. **Gate-only repos.** If the repo has a strong quality gate (single gate
   command, CI parity) but zero review-process documentation, record the
   gate as a strength — it is real cheapest-first layers — but review is
   still absent above it. If a doc states this is deliberate ("the gate is
   the review"), note the philosophy and judge what remains uncovered.

## Judging

- **L1** — no review process is discoverable in any form: no docs, no PR
  template, no checklists, no reviewer definitions. (A quality gate alone
  does not lift this above L1 for *review*; it earns a Doing-well entry.)
- **L2** — traces exist (a CONTRIBUTING paragraph, a PR template stub, an
  informal checklist) but an agent could not reconstruct what review is
  supposed to happen, in what order, against what criteria.
- **L3** — the process is written down where agents will find it: layers
  and their order are documented, local review documented as preceding the
  PR, criteria mostly enumerable, and the docs match the configs you found
  in step 2.
- **L4** — the process is mechanically prompted, not memory-dependent: PR
  templates with required sections, required CI checks matching the
  documented gate, hooks that remind or block on skipped review steps,
  CODEOWNERS routing thorough review to risky paths.
- **L5** — the process is measured or audited: evidence that review depth
  is held as volume rises (sampled re-reviews, tracked revert/reopen rates
  feeding process changes), reviewer checklists/definitions updated when
  models or tooling change, scheduled audits of the stack itself.

Judgment guidance:

- Weight mechanical prompting over prose volume: a terse doc plus a PR
  template with required checklist sections outranks a beautiful process
  doc nothing enforces.
- Docs describing a stack the configs contradict (doc says pre-commit hook,
  no hook exists) cap at L2 — the doc is unreliable.
- Cite paths for every claim: the doc that documents local-first review,
  the exact vibes-criteria lines, the CI check names.

## Fix marking

Mark as `**Fix:**`: distilling an existing implicit process into a
discoverable doc — only from real evidence (CI workflow steps, hooks, PR
template habits visible in the repo), citing each source; replacing vibes
criteria in an existing checklist or reviewer prompt with enumerable ones
derived from the repo's own gates and invariants; adding a review-order
section to an existing agent doc that already routes elsewhere; adding an
AI-generated-code checklist to an existing PR template. Do NOT mark:
inventing review policy the repo shows no evidence of (who must review
what, approval counts) — that is a team decision.
