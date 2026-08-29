# Assessing doc-drift machinery

## Why this matters

The `doc-freshness` assessor measures how much drift exists today; this one
measures the **machinery** that keeps that number down tomorrow. Without a
scheduled process whose explicit job is comparing specs to code, freshness
is a snapshot that decays. The sound shape: automation runs on a cadence,
finds drift, and proposes updates as ordinary PRs a human merges — never
auto-commits, because the inputs steering the loop (diffs, docs, model
output) are untrusted, and the PR is the governance mechanism. And the
machinery itself can rot silently: in a studied system, a memory store went
stale for roughly seven weeks while its update workflow kept finishing
"successfully" — only an independent reconciliation against ground truth
exposed it. Mature setups therefore watch the watcher.

## Evidence to gather

1. **Hunt for the machinery.** Scheduled workflows (`schedule:`/cron
   triggers in .github/workflows/, other CI schedulers) that touch docs or
   specs; doc-check scripts in scripts/ or tools/; staleness dashboards or
   generated reports; `last_checked`/`last_verified` metadata in doc
   frontmatter, with or without a demotion policy (what happens when a doc
   exceeds its check interval); agent definitions or commands whose stated
   job is drift detection; documented manual cadences ("audit specs
   monthly") in process docs. Record path and role of each in
   `resources/drift-machinery.md`.
2. **Classify what each piece does.** Detection only, detection + proposal,
   or (a red flag) detection + auto-commit? For proposal mechanisms: do
   changes land as PRs for human merge, or push to the default branch? Cite
   the workflow lines that show which.
3. **Cadence and trigger.** Is the machinery scheduled, or only
   run-when-someone-remembers? A script with no scheduler and no documented
   cadence is a tool, not a process.
4. **Health of the machinery itself.** Is there anything that would notice
   the automation silently failing — an independent reconciliation, a
   metric on proposals-per-period, alerting on empty runs, staleness
   metadata that would visibly expire? A workflow that has been green
   forever while proposing nothing may be dead; check its recent outputs
   if visible in the repo (generated reports, dated artifacts).
5. **Cross-reference doc-freshness.** If the doc-freshness assessor ran,
   read its report: high measured drift alongside claimed machinery means
   the machinery is not working — evidence for L-level and for the health
   finding above. Low drift with no machinery may just mean a young repo.

## Judging

- **L1** — nothing: no script, no schedule, no checklist item, no
  staleness metadata.
- **L2** — a manual checklist item ("update the docs") or an ad-hoc script
  with no cadence and no documentation an agent would find.
- **L3** — a documented process or tool someone runs: a drift-check
  script or command with a documented cadence, or maintained
  `last_checked` metadata with a stated policy — reliant on humans
  remembering, but discoverable and real.
- **L4** — scheduled automation that proposes updates with human merge:
  cron-triggered workflow producing PRs (or issues with concrete diffs),
  never auto-committing to the default branch.
- **L5** — L4 plus the machinery's own health is monitored: independent
  ground-truth reconciliation, tracked proposal/merge metrics, or alerts
  when the loop stops producing signal — something that catches the
  seven-weeks-green-but-stale failure.

Judgment guidance:

- Auto-committing machinery is not a higher level with a caveat — it is a
  governance failure. Score the detection as the level it earns and raise
  the auto-commit as a leading opportunity.
- Weight working-and-scheduled over sophisticated-but-manual: a dumb cron
  job that opens "these docs mention files that no longer exist" PRs
  outranks a clever script nothing runs.
- A young or tiny repo may reasonably lack this; say so in confidence and
  summary rather than inflating the level.
- Cite paths for every claim: the workflow file and trigger lines, the
  script, the metadata fields.

## Fix marking

Mark as `**Fix:**`: adding a scheduled drift-check workflow SKELETON only
if the repo already runs agent workflows in CI — match those workflows'
conventions (runner, auth pattern, model invocation) and cite the workflow
you modeled it on; documenting an existing-but-undocumented drift script
(cadence, invocation, where output goes) in the process docs; converting an
auto-committing doc workflow to open PRs instead. If the repo has no agent
workflows, mark only: documenting a manual drift-check process (what to
compare, how often) in an existing process doc. Do NOT mark: introducing
agent-in-CI infrastructure from scratch, or inventing staleness policies
the team hasn't chosen.
