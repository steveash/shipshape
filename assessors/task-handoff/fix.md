# Fixing task handoff conventions

Ground rules for this assessor's fix branches:

- **Convention follows evidence.** A plans/task-state convention you
  document must be distilled from how the repo already works — existing
  plan files, scratch directories, harness settings — with each element
  citable. Where the repo has nothing, the convention you add must be
  minimal (a location, a naming pattern, a template) and marked as a
  starting point, not team policy.
- **Templates stay clean.** When separating a template from baked-in
  results, move the results to a dated instance file (preserving them —
  never delete a run's findings) and restore the template to placeholders.
  Say which lines moved where in the commit message.
- **Handoff runs while context is healthy.** A handoff command you add
  must instruct capturing current state, next steps, and open questions
  into the documented durable location — and must be written in the
  harness format the repo already uses, matching neighboring command
  definitions.
- **Wire hooks only into existing hook usage.** Add a session-start
  state-injection hook only where the repo already configures hooks;
  otherwise the fix stops at documentation and the wiring is an
  opportunity for the team.
- **Documentation goes where agents already look** — the AGENTS.md or
  equivalent the harness loads, not a new orphan doc.
- Keep each branch one coherent change: directory convention,
  template/results separation, and handoff command are separate branches
  unless tiny.
