# Fixing agent onboarding docs

Ground rules for this assessor's fix branches:

- **Distill, never invent.** Every rule you write into an onboarding doc must
  be traceable to something real: an existing doc, a config file, a hook, a
  CI workflow. If you cannot cite a source in the repo, do not write the
  rule. Team-specific judgment calls belong to the team.
- **Subtract before adding.** Removing discoverable/duplicated content is
  usually the higher-value edit than writing more.
- **Preserve the repo's chosen shape.** If the repo uses a committed
  AGENTS.md + gitignored CLAUDE.md convention, keep it. If it uses
  CLAUDE.md-as-canonical, improve that rather than imposing a rename —
  unless the report specifically found drifted duplicates, in which case
  converge on one canonical file plus redirects and say so in the commit
  message.
- **References you add must resolve.** Verify every path/command you write.
- Keep each branch one coherent editorial change: e.g. "fix broken
  references" and "add routing section" are separate branches unless tiny.
