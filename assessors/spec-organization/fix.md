# Fixing spec and decision-log organization

Ground rules for this assessor's fix branches:

- **Index what exists; never invent content.** An index you create
  enumerates real files with titles and scopes taken from the docs
  themselves. You may not write rationale for decisions nobody recorded,
  and you may not author status history you cannot evidence.
- **Status claims need evidence.** Mark a doc superseded/done only when
  the repo shows it (a successor doc, merged work, an explicit note).
  When you cannot tell, write `status: unknown` — a wrong status marker
  is worse than none.
- **Follow the repo's existing scheme.** If specs use numbered prefixes,
  number the index to match; if frontmatter is the convention, use
  frontmatter. Do not impose a new organizational system, and do not
  renumber or move files unless a finding specifically calls for it.
- **Template cleanups preserve data.** When removing one run's results
  from a plan template, move the results to a dated file (do not delete
  them) and say where in the commit message.
- **Links you add must resolve.** Verify every path before committing.
- Keep each branch one coherent change: "create index" and "link orphaned
  docs" and "clean plan template" are separate branches unless tiny.
