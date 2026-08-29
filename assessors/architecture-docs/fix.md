# Fixing architecture and layout docs

Ground rules for this assessor's fix branches:

- **The tree is the source of truth for layout.** A layout section you
  write or update must enumerate what actually exists — verify every path
  you list, and describe each entry only from evidence in the repo (the
  package's own README, manifest description, or module docstring). If a
  directory's purpose is not evidenced anywhere, list it with a neutral
  one-liner ("(undocumented)") rather than guessing.
- **Never invent rationale.** You may move, link, and restructure
  architectural prose that already exists; you may not author new design
  decisions, trade-off explanations, or ADRs the repo does not evidence.
  If a finding needs team knowledge, leave it as a finding.
- **Route, don't duplicate.** When moving architecture prose out of the
  agent doc, move it verbatim (light editing for standalone context is
  fine), leave a one-line link behind, and make sure the destination is
  reachable from README or the agent doc.
- **Links you add must resolve.** Verify every path and anchor before
  committing.
- Keep each branch one coherent change: "regenerate layout section" and
  "extract architecture prose from AGENTS.md" are separate branches unless
  tiny.
