# Fixing linter enforcement and doc restatement

Ground rules for this assessor's fix branches:

- **Enforce existing intent only.** Wire a tool into CI/hooks only when the
  repo has already adopted it (config file present, tool in dev
  dependencies) and the gap is clearly an oversight — cite the evidence of
  intent in the commit body. Never add new tools or new rule sets.
- **Do not touch strictness.** Raising (or lowering) mypy/eslint/tsc
  strictness changes what code is acceptable — that is team policy. Your
  fixes change *where existing rules run* and *what prose says*, never what
  the rules are.
- **Removing restated rules is a subtraction with receipts.** For every doc
  line you delete, the commit body cites the linter rule (config path +
  rule id) that enforces it. If the rule is only *partially* covered by the
  linter, trim the doc line to the uncovered judgment call instead of
  deleting it.
- **Rationale comments must be true.** Add a rationale to a suppression only
  when you can trace the actual reason (blame history, adjacent code,
  linked issue). A guessed rationale is worse than none — if you cannot
  trace it, leave it and keep it in the report instead.
- Expect the wired tool to pass: run it against the current tree before
  wiring it into CI (in your branch's worktree), and if it fails, report
  that instead of shipping a red gate.
- One concern per branch: "wire formatter into CI" and "deduplicate doc
  rules" are separate branches.
