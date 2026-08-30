# Fixing agent workflow safety gaps

Ground rules for this assessor's fix branches:

- **Cite the exact workflow lines** every fix touches — the report finding
  named them; the commit body repeats them.
- **Env indirection must be complete.** Converting a raw
  `${{ github.event.* }}` interpolation means the payload value enters ONLY
  through `env:` and the prompt/script refers to the variable — verify no
  second interpolation of the same field survives elsewhere in the file,
  and that the consuming action/shell actually reads the env var (test the
  quoting).
- **Caps must not break the job.** Choose `timeout-minutes` and `max-turns`
  values from evidence: recent run durations if visible, the action's
  documented defaults, or a generous multiple of the job's apparent work.
  State the basis in the commit body. A cap that kills healthy runs is a
  worse outcome than the missing cap.
- **Permissions tightening is derived, not guessed.** Enumerate what each
  step actually does (checkout = contents:read, comment = issues/
  pull-requests:write, …) and grant exactly that. If a step's needs are
  unclear, leave that permission and note it — a broken workflow from an
  over-tightened block is not a safety win.
- **Behavior-preserving only.** Do not change which model runs, what the
  agent is asked to do, whether a gate blocks, or the workflow's triggers.
  Those are team decisions; report them.
- **Never edit workflows in a repo with no agent workflows** — if the
  report scored absence, there is nothing to fix.
- One safety mechanism per branch: interpolation fixes, cap additions, and
  permission tightening are separate branches (they fail and get reviewed
  differently).
