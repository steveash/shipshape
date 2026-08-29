# Fixing doc-drift machinery

Ground rules for this assessor's fix branches:

- **Human merge is non-negotiable.** Any workflow you add or modify must
  produce PRs (or issues) for human review — never commits to the default
  branch. The loop's inputs are untrusted; the PR is the governance
  mechanism. Converting an auto-committing workflow to PR-proposing is a
  valid fix; the reverse never is.
- **Skeletons only where the pattern exists.** Add a scheduled drift-check
  workflow only when the repo already runs agent workflows in CI, and copy
  their conventions exactly — same runner setup, same auth pattern, same
  invocation style — citing the source workflow in a comment. If no such
  pattern exists, the fix is documentation, not infrastructure.
- **A skeleton must be honest about being one.** Mark unconfigured choices
  (schedule, scope, model) as explicit TODOs for the team rather than
  guessing values; the workflow should be safe to merge disabled or in
  comment-only mode.
- **Documented cadences must be real.** When documenting a manual process,
  describe only comparisons that are actually possible with the repo's
  tooling, and put the doc where process docs already live.
- Keep each branch one coherent change: workflow skeleton, auto-commit
  conversion, and process documentation are separate branches unless tiny.
