# Assessing the enforcement hierarchy: prose prohibitions vs mechanical controls

## Why this matters

This is the highest-value mechanical check in the library. Rules meant to be
absolute ("never force-push main", "always run the gate before committing",
"never edit generated/**") have measurably different reliability depending
on where they live:

1. settings.json permission deny rules — ~100%
2. blocking PreToolUse hooks — ~100%
3. CI gates — 100%, but post-hoc (the violation already happened locally)
4. advisory hooks — ~85-90%
5. agent-doc prose — ~70-80%, degrading after context compaction
6. chat corrections — ~50%

A never-class rule living only at tier 5 fails roughly one session in four.
The companion principle is least-agency: prefer *removing* a capability over
prompting against it — if a deleted prod DB keeps you up at night, remove
the delete verb from the tool list, don't prompt please-don't. A studied
guide marks the combination "≥1 never-class rule, zero settings/hooks/CI"
as CRITICAL; treat it the same way here.

## Evidence to gather (scan step)

1. **Extract every hard rule.** Read the agent docs (AGENTS.md, CLAUDE.md
   and variants, .claude/ contents), CONTRIBUTING, and any referenced
   process docs. Extract every MUST/NEVER/ALWAYS-class rule (imperative
   prohibitions and obligations — up to `maxProhibitionsToMap`,
   prioritizing destructive-action and boundary rules). This is the raw
   material for everything else.
2. **Build the reconciliation map.** Write `resources/prohibitions.json`:
   one entry per rule with — the rule text, its prose location (path +
   line), the matching mechanical control if any (deny rule / blocking hook
   / advisory hook / CI check / capability removal, with the control's
   path), and, for unbacked rules, the recommended control tier and a
   one-line sketch of what it would look like. Classify honestly: some
   rules are judgment calls no control can express ("prefer small PRs") —
   mark them non-reconcilable rather than unbacked.
3. **Audit permission configs.** Read `.claude/settings.json` (and
   local/managed variants), permission allow/deny/ask lists, and any other
   harness permission surface. Judge granularity: `Bash(git diff:*)` beats
   `Bash(*)` — a studied repo declared 60+ specific command prefixes;
   another used `Bash(*)` while its own guide preached granularity (a
   finding of exactly the say-do gap this assessor hunts). Record posture
   in `resources/permissions-audit.md`: blanket grants, deny rules present,
   ask-tier usage, whether denies cover the never-class rules from step 2.
4. **Check for capability-removal wins.** Look for places the repo chose
   least-agency: tools not granted rather than warned about, read-only
   tokens, scoped MCP configs. Credit them explicitly — absence of a
   warning because the capability is absent is the best state.
5. **Check maintenance.** Is the reconciliation kept current — do new
   prohibitions land with their control in the same commit (sample recent
   history for doc-rule additions), is there an audit cadence?

## Judging

- **L1** — no hard rules and no controls: the repo has neither written
  boundaries nor mechanical ones. (Distinguish from a benign repo with
  genuinely nothing to prohibit — say so, confidence low.)
- **L2** — prose-only prohibitions: never-class rules exist and none has a
  mechanical control. This is the CRITICAL configuration when destructive
  actions are among them — say so in the summary.
- **L3** — the important prohibitions (destructive actions, boundary
  violations) have SOME mechanical backing (CI gate, hook, or deny rule),
  even if the long tail is prose-only.
- **L4** — every reconcilable prohibition maps to a control at an
  appropriate tier, and permission configs are granular
  (specific allow prefixes, deny rules for the never-class, no blanket
  `Bash(*)`-style grants contradicting documented rules).
- **L5** — L4 plus the reconciliation is maintained: new prohibitions land
  with their control in the same change (visible in history), and/or a
  scheduled audit keeps prohibitions.json-style drift from accumulating.

Judgment guidance:

- Weight by blast radius: one unbacked "never drop the prod schema"
  outweighs ten unbacked style musts.
- Post-hoc is real but lesser: CI backing counts as mechanical, but for
  destructive local actions (rm, force-push, secret exfiltration) only
  tiers 1-2 or capability removal actually prevent — recommend accordingly.
- The say-do gap is a first-class finding: a repo whose docs preach
  granular permissions while its settings grant broadly is scored on what
  the settings do.
- Cite paths for every mapping — the prose line and the control file.

## Fix marking

Mark as `**Fix:**`: adding a settings deny rule for a specific prose
prohibition (cite the rule); adding a blocking hook that enforces a specific
prose prohibition (cite it); adding a CI check for a prohibition CI can see;
narrowing a blanket permission grant to the granular prefixes the repo's
own usage/docs support. One control class per branch, each control citing
the prose rule it enforces. Do NOT mark: inventing prohibitions, adding
controls for rules the repo never wrote, or removing capabilities without a
documented rule demanding it.
