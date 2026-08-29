# Fixing stale docs

Ground rules for this assessor's fix branches:

- **Fix only verified claims.** Every edit corrects a specific claim the
  assessment verified against code (it is in
  `resources/claims-checked.md`). Re-read the code yourself before
  editing — the code may have changed since the assessment — and cite
  the code evidence (path and lines) in the commit message for every
  claim you correct.
- **Surgical edits, never rewrites.** Change the false words, keep the
  document. If a doc is wrong wholesale, demote it (status: superseded,
  link to what replaced it) rather than rewriting it — a rewrite is team
  work, not a freshness fix.
- **Counts and versions come from the authoritative source.** When
  updating "D1-D20" to match a table running to D33, the table is the
  source; say so. Prefer making drift-prone prose point AT the source
  ("see the decision table") over restating a number that will drift
  again, when the surrounding text allows it.
- **Metadata must be honest.** Set last_updated/last_checked only on
  docs whose currency you actually established in this branch; never
  stamp fresh dates on unverified content.
- Keep each branch one coherent change: corrections to one doc or one
  claim-cluster per branch; "fix CLI docstring" and "update decision
  counts" are separate branches unless tiny.
