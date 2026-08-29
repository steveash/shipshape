# Fixing codebase orientation

Ground rules for this assessor's fix branches:

- **Docs and headers only — never renames.** Renaming directories or moving
  modules is a team decision with a repo-wide blast radius; those stay in
  the report as unstaged opportunities. Your surface is prose: layout
  sections, module docstrings, file headers.
- **Describe the tree that exists.** A layout section you write or repair
  must be derivable from the actual tree and existing docs — list real
  directories with purposes evidenced by their contents (cite representative
  files in the commit body). Never write aspirational architecture.
- **Headers answer the scenario that failed.** When adding a module-purpose
  docstring/header, target exactly the files where
  `resources/orientation-scenarios.md` records a dead end, and write the one
  or two lines that would have completed that walk (what this module owns,
  what it deliberately does not). Reference the scenario in the commit
  message. Match the language's native convention (module docstring, package
  doc comment, header comment).
- **Route, don't duplicate.** If an architecture doc already explains the
  layout, fix the entry doc to point at it rather than restating it.
- Keep each branch one coherent change: "repair layout section" and "add
  headers where scenarios dead-ended" are separate branches unless tiny.
