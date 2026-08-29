# Fixing model and cost discipline

Ground rules for this assessor's fix branches:

- **Caps must use the mechanism's own vocabulary.** A turn cap, attempt
  limit, or timeout you add must be a parameter the invocation mechanism
  documents (the action's inputs, the CLI's flags, the SDK's options) —
  cite where that parameter is documented in the commit body. Never invent
  a config key and hope.
- **Pick caps generously, not aspirationally.** A cap's job is to stop
  runaway loops, not to tune performance: choose a ceiling comfortably
  above what the workflow's normal runs plausibly need (say how you
  estimated it — e.g. from the task's shape or existing logs). A cap that
  breaks the workflow's normal operation is a regression, not a fix.
- **Alias swaps must be like-for-like.** Replacing a hardcoded model ID
  with an alias must not change which model family/tier the workflow runs
  today — cite the platform documentation for the alias and state the
  equivalence. If no documented alias exists for that platform, the
  finding stays report-only.
- **Never change routing decisions.** Which model handles which task is
  the team's cost/quality trade-off; your surface is guards (caps,
  timeouts) and indirection (aliases), not model selection.
- **Cannot verify by running.** These workflows execute in CI with real
  credentials and real spend — do not attempt to run them. Verify by
  schema/documentation instead, and say so in the commit message.
- One workflow per branch; keep the diff to the exact cited lines.
