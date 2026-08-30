# 020 — The Assessor Contract

> Status: ACTIVE. Depends on [010-architecture.md](010-architecture.md).
> This is the most important contract in shipshape: assessors, reports, and
> doctor mode all hang off it.

## Assessor definition format

An assessor is a directory (shipped under `assessors/<id>/`, or anywhere a
profile points to):

```
<id>/
  assessor.yaml     # metadata + config schema (required)
  assess.md         # assessment instructions given to the agent (required)
  fix.md            # doctor-mode fix instructions (optional; absent = no fixes)
```

### `assessor.yaml`

```yaml
id: agents-md-quality            # kebab-case, globally unique in a profile
title: Agent onboarding docs (AGENTS.md)
category: docs                   # docs | process | enforcement | legibility | operations
summary: >
  One-paragraph statement of the best practice this assessor measures.
practice: >
  Longer statement of WHY this practice matters, citable in reports.
tiers: [scan, judge]             # model tiers this assessor's steps use
needsExecution: false            # true = agent may run Bash in the target
                                 # (e.g. build-test-locally); default false
appliesTo: always                # always | has-ci | has-agent-workflows | …
                                 # (advisory hint; the planner agent decides)
canReview: false                 # true = usable as an adversarial reviewer of
                                 # doctor-mode fixes for its category
reviewsCategories: []            # which fix categories it should review
defaultConfig: {}                # assessor-specific options (free-form map,
                                 # documented in assess.md); profiles override
```

`assess.md` and `fix.md` are prompt documents. They must be written to the
agent, contain the practice rationale, an **enumerable evidence rubric**
(never the bare word "good" — criteria are behavioral and checkable), and the
maturity-level definitions specialized to this practice. Shipshape wraps them
with the output contract, recon summary, conventions, and config values at
runtime — assessors do not restate those mechanics.

Two shipped assessors are the style exemplars: `agents-md-quality` (docs) and
`build-test-locally` (runtime execution).

## Maturity levels

Every assessor scores the practice on one shared 5-level scale, specialized
per practice in its rubric:

| Level | Name | Meaning |
| --- | --- | --- |
| L1 | Absent | The practice is not present in any form. |
| L2 | Ad-hoc | Traces exist (partial docs, inconsistent habits) but an agent cannot rely on them. |
| L3 | Documented | The practice is written down where agents will find it, and mostly accurate. |
| L4 | Enforced | The practice is mechanically enforced (hooks, CI, linters, permissions) — not dependent on anyone remembering. |
| L5 | Self-improving | Enforcement exists AND there is a feedback loop keeping it current (drift detection, scheduled audits, measured compliance). |

Scoring rules:

- Weight **enforcement placement over documentation volume**: a terse doc
  plus a blocking hook outranks a beautiful doc with no enforcement.
- Prefer static/runtime evidence over pure judgment where both exist; cite
  file paths and line references for every finding.
- Some practices cap out naturally (a legibility assessor may define L4/L5 in
  terms of lint/CI checks that guard legibility). The assessor's rubric says
  what each level means **for that practice**; the shared names above are the
  frame.
- `confidence` (high/medium/low) is reported separately from level — an
  assessor unsure of its evidence says so rather than hedging the level.

## The assessor report (`assessors/<id>/report.md`)

Frontmatter (YAML, validated by shipshape after the assessment task; a report
failing validation is bounced back to the agent once for repair):

```yaml
assessor: agents-md-quality
title: Agent onboarding docs (AGENTS.md)
category: docs
level: 3            # 1-5
confidence: high    # high | medium | low
summary: One-sentence verdict, readable in the overall report's table.
strengths: 2        # count of Doing well findings
opportunities: 3    # count of Opportunities findings
fixable: true       # whether this assessor proposes doctor-mode fixes
resources:
  - path: resources/link-check.json
    description: Every doc reference checked, with resolution status
```

Body sections, in order, all required (empty sections say "None."):

1. `## What this assessor looks for` — the practice + rubric summary, so the
   report stands alone.
2. `## Verdict` — the level, why, and the 2-3 pieces of load-bearing evidence.
3. `## Doing well` — concrete positives with file citations.
4. `## Opportunities` — numbered findings, most impactful first. Each has:
   what/where (paths), why it matters, and a **tactical suggestion**. Findings
   that doctor mode should implement are marked `**Fix:**` with a one-line fix
   description — doctor mode re-reads exactly these.
5. `## Resources` — the ancillary files this assessor wrote (mirrors
   frontmatter `resources`), with a line on when to consult each.

Ancillary resources go under `assessors/<id>/resources/` in any format; they
are the assessor's working memory for doctor mode (e.g. the full inventory a
summary was distilled from).

## Assessors as reviewers

An assessor with `canReview: true` can be asked, in doctor mode, to
adversarially review a fix branch produced under `reviewsCategories`. Review
verdicts use a small frontmatter contract (`verdict: approve | revise |
reject`, `blocking: [...]`, `advisory: [...]`) defined in
[060-doctor-mode.md](060-doctor-mode.md). Reviewers get the diff, the
originating findings, and the repo — **never the fixer agent's reasoning** —
and are prompted to verify claims rather than assume them.
