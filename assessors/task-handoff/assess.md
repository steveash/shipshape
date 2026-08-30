# Assessing task handoff and context survival

## Why this matters

Compaction is a guillotine. Studied harnesses carry exactly three things
across it: recently-read files, invoked skills, and the active plan file
**by name** — everything else, including the conversation and all the
reasoning in it, dies. So the question this assessor asks is: when this
repo's agent loses its context mid-task, what survives? The durable
channels are four: git history, a progress log, a machine-readable
task-state file, and agent config. A repo with plan files in a
harness-known location, a progress-log convention, and a handoff command
written while context is still healthy lets the next session resume; a
repo without them restarts from zero every time. One studied repo also
shows the quiet failure mode: a single run's results were written into the
reusable plan template, and the template stopped being reusable.

## Evidence to gather

1. **Plan and task-state surface.** Hunt for the places work-in-progress
   state lives: .claude/plans/, plans/, plan.md, docs/plans/,
   machine-readable task state (tasks.json, prd.json, TODO.md with
   structured checkboxes, issue-tracker sync files), scratch/working
   directories with conventions. Record each path and whether any doc or
   harness config names it. Write the inventory to
   `resources/handoff-surface.md`.
2. **Harness alignment.** Does the plan location match what the repo's
   harness actually preserves or re-injects — the plan directory the
   harness names, session-start hooks that read state files, settings that
   load them? A beautiful plans/ directory the harness never touches
   survives only if the docs tell agents to read it; check which is true.
3. **Progress-log convention.** Is there a documented convention for
   recording progress as work proceeds (a progress/journal file, "append
   to the plan's log section", structured commit messages designated for
   this)? Documented where an agent will find it (AGENTS.md or equivalent)?
4. **Handoff mechanism.** A /handoff-style command or documented handoff
   procedure — written to be run while context is still healthy, capturing
   state, next steps, and open questions into a durable file. A convention
   that only says "summarize before you die" is too late by definition;
   check what the mechanism actually captures and where it puts it.
5. **Template vs results separation.** For any plan/spec templates found:
   are they clean, or has some run's actual results/findings been baked in
   (the studied failure)? Diff templates against instances where both
   exist; cite contaminated lines.
6. **The four channels, overall.** Rate each durable channel — git
   history, progress log, task-state file, agent config — as
   present-and-conventioned, ad-hoc, or absent, with paths. (For git
   history, just check whether docs direct agents to write resumable
   commit messages — deep history analysis belongs to git-history-hygiene;
   cross-reference its report if present.)

## Judging

- **L1** — nothing survives but the conversation: no plan files, no task
  state, no progress or handoff conventions anywhere.
- **L2** — ad-hoc traces: stray plan.md or TODO files with no naming
  convention, no documented location, results and templates mixed; a fresh
  agent would find fragments but couldn't trust or navigate them.
- **L3** — documented conventions an agent can discover: a named plans/
  task-state location referenced from the agent doc, a progress-log
  convention, templates separate from results — reliant on agents
  following the doc, but the doc is there and accurate.
- **L4** — harness-wired: session hooks or harness config actually
  re-inject or point to the state (session-start reads the active plan,
  templates enforced by command definitions, machine-readable task state
  consumed by tooling) — survival no longer depends on the agent
  remembering to look.
- **L5** — the loop maintains itself: retro/handoff steps that feed
  learned patterns back into AGENTS.md or the templates, stale-plan
  cleanup with a policy, evidence in history that handoffs actually
  carried work across sessions.

Judgment guidance:

- Weight wiring over prose: a session-start hook that cats the active plan
  outranks a well-written handoff chapter nobody's harness runs.
- Machine-readable task state earns more than free-prose plans only when
  something reads it; unconsumed JSON is just prose with braces.
- Repos whose work is genuinely small (single-session-sized changes) need
  proportionally little; note it in confidence rather than demanding
  ceremony.
- Cite paths for every claim: the plan directory, the doc line naming it,
  the hook that injects it, the contaminated template line.

## Fix marking

Mark as `**Fix:**`: adding a plans/task-state directory convention and
documenting it in the agent doc the repo already loads (location, naming,
lifecycle — distilled from how the repo already works, citing existing
plan-ish files); separating a contaminated template from its baked-in
results (results move to a dated instance file, template restored —
cite the contaminated lines); adding a handoff command definition in the
harness format the repo already uses (.claude/commands/ etc.), capturing
state/next-steps/questions into the documented location; wiring a
session-start hook to surface the active plan only where the repo already
uses hooks. Do NOT mark: introducing a task-management system or harness
the repo doesn't use, or inventing lifecycle policy (when plans are
archived/deleted) the team hasn't stated — propose those as opportunities.
