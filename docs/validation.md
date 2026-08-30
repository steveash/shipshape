# Validation record

> How shipshape's behavior was validated end-to-end against real repositories,
> and what each run proved or caught. Update this when a validation-relevant
> behavior changes; the cost/duration numbers are observations, not promises.
> (Run outputs lived in session scratch space; the durable evidence is this
> record plus the fixes each run drove, cited by commit below.)

## Method

Unit tests cover everything deterministic (graph semantics, loaders, report
contract, conventions filtering — `tests/`). Agent behavior can only be
validated by real runs, so each pipeline was exercised against three targets
with known ground truth:

1. **shipshape itself** — self-check; ground truth is this repo.
2. **steveash/hitchhikers-guide-to-ai-native-engineering** — a repo with NO
   AGENTS.md/CLAUDE.md but a rich `agents/*.md` + workflow system: the
   canonical trap for presence-checking; also 12 agent CI workflows for
   `ci-agent-safety`.
3. **steveash/simenterprise** — pre-analyzed by an independent research pass
   that produced a written checklist of real strengths/defects (stale status
   claims, broken quickstart, CI-orphaned sub-app, orphaned docs, exemplary
   single-source gate) to grade recall against.

## Report mode

- **SimEnterprise, balanced profile**: 28/28 tasks, 0 failures, ~48 min,
  ~$20. Recall vs the ground-truth checklist was effectively complete: every
  seeded defect class was found with correct file citations, including the
  "M1 scaffold stub" docstring on an implemented 1854-line CLI
  (doc-freshness), the README quickstart that fails without `uv run`
  (reproduced by execution in a scratch copy), and the CI-orphaned Electron
  app (independently by three assessors). Plausible novel findings beyond
  the checklist (injection surfaces, duplicated grounding loops) spot-check
  as real.
- **Hitchhikers guide, cheap profile**: 28/28 tasks, 0 failures. The
  semantic trap passed: `agents-md-quality` scored L3 "no AGENTS.md by
  design" by finding the workflow-loaded agents/ system. Flagship finding —
  a real command-injection via `${{ github.event.comment.body }}` spliced
  into a heredoc in a `contents: write` workflow — was manually verified
  true (Actions expands `${{ }}` before the shell parses, so the quoted
  heredoc is no protection).
- **Self-run, balanced**: overall L3; found real defects in this repo, each
  verified then fixed: a run artifact accidentally committed at the root, a
  layering-lint glob that never bound `src/cli.ts` (negative-tested after
  fixing), untype-checked tests, the hook script outside gate coverage,
  undocumented hook installation, unbounded default `--max-branches`.

## Doctor mode

- **Hitchhikers guide, bounded (2 assessors, cap 3)**: staged 4 local
  `shipshape/*` branches from worktrees (main untouched and verified clean;
  worktrees removed after), each adversarially reviewed; one branch went
  revise → revised → approved; reviewers independently re-verified factual
  claims against workflow YAML and caught a fixer's mid-branch
  self-correction. `review-plan.md` ordered branches by
  impact-per-review-minute with per-branch "check by hand" notes. ~$13.
- **Self-doctor (2 assessors, cap 3)**: 7 branches planned, cap enforced
  exactly, 2 approved and merged into this repo (the root-artifact cleanup +
  guard test, and the task-handoff convention below), 1 rejected by the
  adversarial reviewer for internally contradictory content — the reject
  path doing its job. The revise cycle materially improved a fix (replacing
  a .gitignore approach that would have blinded the cleanliness guard with
  a failing-test guard, with the rationale written into the test).

## Multi-package / meta-repo / steering / resume

- **simenterprise + hitchhikers with `--meta` and a conventions file**: the
  assessor credited group-level enforcement found in the meta-repo (agents
  files mechanically injected via `--append-system-prompt` in CI) and
  followed the conventions to the letter — including flagging the exact
  missing member→meta linkage the conventions asked it to check. The same
  member doc scored L2 solo and L4 with group context: steering and meta
  awareness demonstrably changed judgment.
- **Resume**: re-invoking a completed run with `--resume` is an instant
  no-op with prior spend carried; mid-run crash recovery (running→pending
  demotion) is unit-tested.

## Bugs the validation caught (all fixed, see git history)

1. Root/sandbox environments reject `bypassPermissions` → restricted
   toolset + `acceptEdits`.
2. Relative output paths: small-model agents write "./x" anywhere →
   absolute paths everywhere in prompts, both modes.
3. Stale `dist/` shipped hours-old prompts → the gate now emits the build.
4. Recon was outside the read-only verification, disarming it for the whole
   run once dirty → recon verified; dirty-at-start warned.
5. Judges drifting into generic rubrics (haiku) → title anchoring in
   validation + explicit anchoring instruction + cheap profile judges on
   sonnet.
6. Turn-cap exhaustion before writing → turn-budget instructions; missing
   report re-runs full judgment against saved evidence (run cost/duration
   halved on the next full run).
7. `--max-branches` race let extra branches start → slot claimed
   synchronously.
8. Doctor based branches on origin/HEAD → based on assessed HEAD.
