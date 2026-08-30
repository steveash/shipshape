# Fixing concept and identifier clarity

Ground rules for this assessor's fix branches:

- **A glossary describes, it does not legislate.** Every glossary entry you
  write must be derived from observed usage — cite in the commit body the
  usage sites (from `resources/concept-table.md`) each definition came from.
  Where usage is genuinely split, the entry must say so ("`session` means X
  in api/, Y in agent/") rather than picking a winner; picking the winner is
  the team's call.
- **Renames only when small, mechanical, and proven.** A rename is stageable
  only if ALL hold: the symbol is repo-internal (not exported API, not
  serialized, not in docs/configs by name), the rename is done with
  language-aware tooling or verified-complete search so every reference
  updates, and the full test suite passes afterward. State all three
  verifications in the commit message. Anything less stays report-only.
- **Never change behavior to match a name.** If `validate()` mutates, the
  fix you may stage is documentation (a warning comment citing the behavior)
  or a proven-safe rename — never editing the body to stop mutating.
- **Put the glossary where agents look.** Extend an existing glossary or
  terminology section if one exists; otherwise add one to an existing doc
  reachable from the agent doc, and link it — do not create a new orphan
  file.
- One concept-cluster or one rename per branch; keep diffs reviewable.
