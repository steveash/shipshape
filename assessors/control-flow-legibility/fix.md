# Fixing control-flow legibility

Ground rules for this assessor's fix branches:

- **Never guess a why.** Every invariant/why comment you add must be
  reconstructed from evidence in the repo — a test that pins the behavior,
  a caller that depends on it, a spec/doc/commit message that states it —
  and the commit body must cite that evidence per comment. A
  plausible-sounding wrong invariant is worse than no comment: agents will
  trust it. If you cannot evidence the why, leave the site alone and keep
  it as a report opportunity.
- **Comment at the point of need.** Put the comment on the branch/line it
  explains, in the repo's existing comment style. Say what the code cannot:
  the invariant, the why, the failure mode. Never add comments narrating
  what the code visibly does.
- **De-nesting must be provably safe.** Guard-clause/early-return refactors
  are stageable only when the function is covered by existing tests and the
  suite passes before and after; state both runs in the commit message. The
  diff must be behavior-preserving and small — if inverting a condition
  requires thought about edge cases the tests don't pin, downgrade to
  report-only.
- **Target the sampled sites only** — the ones in
  `resources/complexity-samples.md` — and reference each site's entry in
  the commit. This branch is not a repo-wide commenting pass.
- One site-cluster per branch; never mix comments and refactors in one
  branch.
