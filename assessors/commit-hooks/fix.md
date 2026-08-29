# Fixing hook enforcement gaps

Ground rules for this assessor's fix branches:

- **Enforce only what the repo already says.** Every hook you add must
  mechanize a rule that already exists in the repo — a documented command,
  an existing linter config, a written commit-message convention, a CI step.
  Cite the source per hook in the commit body. Never add a hook enforcing a
  rule the repo doesn't document: that is writing policy, not enforcement.
- **Wire existing tools, don't install new ones.** A pre-commit config you
  add invokes the linters/formatters/gate the repo already configures.
  Adding a new tool to the toolchain is out of scope.
- **Make installation real.** A hook config branch is incomplete without its
  install path: add the install step to the documented setup sequence, or to
  an existing bootstrap script — prefer automating over documenting when an
  automation point (prepare script, setup script) already exists.
- **Prefer fast, blocking, and scoped.** Pre-commit hooks should be fast
  enough that people keep them installed; put slow steps (full test suite)
  in pre-push or leave them to CI, and say so in the hook config comments.
- **Never bypass-proof dishonestly.** Do not add hooks that block
  `--no-verify` workarounds or otherwise fight the user; hooks enforce
  process, they do not imprison.
- One hook concern per branch: "add pre-commit gate" and "add commit-msg
  validator" are separate branches.
