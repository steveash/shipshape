# Fixing quality gate drift

Ground rules for this assessor's fix branches:

- **Consolidate, never legislate.** A gate script you create must contain
  only steps that already exist in CI or in documented commands — you are
  giving existing policy a single home, not writing new policy. Cite, per
  step, the CI workflow line or doc line it came from in the commit body.
- **Preserve semantics exactly.** When extracting a shared script from CI
  steps, the CI diff must be behavior-preserving: same commands, same flags,
  same failure conditions. If any step needs its flags changed to work
  locally (e.g. adding `--check` for CI vs `--fix` for dev), implement both
  modes and keep CI on the verifying mode.
- **Wire orphaned surfaces with what exists.** Adding a package's tests to
  CI means invoking the package's own existing test command — never writing
  new tests or new config to make it wirable. If the package has no runnable
  test command, that is a report finding, not a fix.
- **Update the docs in the same branch** so the documented command and the
  CI invocation point at the same artifact — parity is the point.
- Never weaken a check to achieve parity: reconcile toward the stricter of
  the two sides unless the report explicitly found the stricter side to be
  the drifted/incorrect one (cite the report finding).
- One coherent change per branch: "extract shared gate" and "wire orphaned
  package into CI" are separate branches.
