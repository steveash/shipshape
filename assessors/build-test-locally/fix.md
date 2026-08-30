# Fixing build/test documentation friction

- Fix the docs to match reality, or reality to match the docs — prefer the
  smaller, safer diff, and say which you chose and why in the commit body.
- Every command you write into a doc must be one you actually ran
  successfully in this branch's worktree (or in the assessment's execution
  log). Cite the log evidence in the commit message.
- A gate script you create must contain only steps that already exist in CI
  or docs — you are consolidating, not adding new policy. Wire CI to call
  the script only when the change is a strict behavior-preserving
  refactoring of the workflow; otherwise leave CI alone and note the
  follow-up in the review plan.
- Never weaken a check to make it pass.
