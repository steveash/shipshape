# Fixing untrustworthy test plumbing

Ground rules for this assessor's fix branches:

- **Only fix the plumbing, never the tests' meaning.** Removing `|| true`,
  `; exit 0`, `continue-on-error`, and swallow-all wrappers is in scope;
  changing what any test asserts is not. If removing a swallow reveals red
  tests, keep the removal, list the newly-visible failures in the commit
  body and the review plan, and DO NOT fix or skip them to get green —
  newly-visible red is the fix working.
- **Cite each occurrence** you remove: path, line, and the report finding
  it came from.
- **Skip registration needs a traceable reason.** Convert a bare
  `skip`/`xfail` to a reasoned one only when the reason is discoverable
  (linked issue, blame history, adjacent comment); write the reason with
  its source. If you cannot trace it, leave it for the team.
- **Wire unrun tests with existing commands only.** Adding a test directory
  to CI means invoking the repo's own existing runner/config against it.
  Run it once in the branch's worktree first; if it is red, report instead
  of wiring a known-red job (or wire it explicitly non-blocking ONLY if the
  repo already has a documented convention for that, cited).
- Never delete a test, never add a suppression, never widen a
  timeout/retry to stabilize a flake — flakes are report findings.
- One pattern class per branch: "remove swallow patterns" and "wire orphan
  suite into CI" are separate branches.
