# Fixing context economy

Ground rules for this assessor's fix branches:

- **Verify every flag before writing it.** A quiet flag you add to a
  documented command must exist for that tool at the version the repo pins
  (lockfile, config, tool docs shipped in node_modules/venv). State the
  verification in the commit body. A wrong flag that breaks the documented
  command is strictly worse than verbose output. Do not change what the
  command runs — only how much it prints.
- **Extract, don't delete, procedures.** Moving a long procedure out of the
  agent doc means: create the skill/command file in the repo's existing
  mechanism (do not invent a new one), move the steps verbatim (edit only
  for the new home's format), and leave a one-line pointer where the
  procedure was. The information must survive the move intact.
- **Removals need a surviving source of truth.** Content you remove as
  restated/duplicated must provably live elsewhere the agent can reach —
  cite the surviving location in the commit message next to the removed
  lines. When in doubt, keep the line.
- **Never touch MCP configuration.** Server removals and allowlist policy
  are team workflow decisions; they stay in the report.
- One economy measure per branch: quiet flags, one procedure extraction,
  or one deduplication — not a combined sweep.
