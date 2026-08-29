# Assessing codebase orientation

## Why this matters

An agent given a task in this repo must first answer "where does this change
belong?" — and it answers that from the repo's own text: entry docs, a layout
section, directory names, module docstrings and file headers. A repo whose
documented map matches its territory turns orientation into a two-minute
walk; a repo where the map is missing or lies forces grep archaeology on
every session, and misrouted changes (a fix landed in the wrong layer) are
the expensive downstream symptom. This assessor measures orientation the
only honest way: by actually attempting it, per scenario.

## Method — walk scenarios, not vibes

1. **Invent `scenarioCount` (3-5) realistic tasks for THIS repo**, drawn from
   its actual domain — read the entry docs and recon summary first so the
   scenarios are plausible tickets, not generic ones. Use the shapes:
   "add a new X" (a new command, endpoint, assessor, rule — whatever this
   repo grows by), "fix a bug in Y behavior" (a behavior the repo visibly
   has), and "where do errors from Z get handled / where is W configured".
2. **Walk each scenario as an arriving agent would**, in this strict order:
   documented entry points (README/AGENTS.md/CONTRIBUTING) → any
   architecture/layout section or doc they route to → directory names in the
   actual tree → module docstrings/file headers at the candidate location.
   Only when that trail dead-ends may you fall back to grep — and falling
   back is the finding, not a shortcut.
3. **Record every walk in `resources/orientation-scenarios.md`**: the
   scenario, the exact trail followed (doc path → section → directory →
   file), where the trail was fast, where it dead-ended or required
   grep-luck, and a minutes-equivalent friction estimate per scenario.
   This file is the report's evidence base; every Verdict claim should trace
   to a scenario in it.
4. **While walking, judge the structural signals** each scenario touches:
   - directory/module naming uses the domain's vocabulary (the words the
     docs and scenarios use), not generic buckets (`utils`, `misc`,
     `helpers2`) hiding load-bearing code;
   - the tree layout matches the documented architecture (a layout section
     that lists directories that don't exist, or omits ones that do, is a
     concrete citable finding);
   - tests are discoverable next to the code they test or via a documented
     mapping;
   - entry points (main modules, CLI roots, wiring) are obvious from names
     or docs;
   - generated/vendored dirs are distinguishable from source (naming,
     headers, docs) so an agent doesn't hand-edit build output.
5. **Look for guards.** Orientation is a judgment property, so L4/L5 hinge
   on whether anything mechanically protects it: a CI check that verifies
   the layout doc against the tree, lint rules requiring module docstrings/
   headers, reviewer-agent or review-checklist criteria that name placement
   ("does this land where the docs say it should?"). Cite the workflow/
   config/criteria file for any guard you credit.

## Judging

Because orientation itself is judgment, L4/L5 for this practice mean the
legibility property is GUARDED mechanically — checks and criteria that name
it — not merely that today's snapshot is tidy.

- **L1** — no orientation surface at all: no entry doc, no layout
  description, and scenarios fail even with grep in reasonable time.
- **L2** — orientation only via grep: docs don't answer "where would X go?",
  or the documented layout contradicts the tree; scenarios mostly dead-end.
- **L3** — docs + layout answer most scenarios: the documented map matches
  the tree, naming carries the domain vocabulary, and walked scenarios
  reach the right location with minor friction.
- **L4** — orientation is guarded: e.g. the layout section is CI-verified
  against the tree, module headers/docstrings are required by lint or
  written review criteria, generated dirs are mechanically marked.
- **L5** — orientation regressions are caught by process: review criteria
  (human checklist or reviewer agent) explicitly include placement checks
  like "does this land where the docs say it should", or a scheduled drift
  check keeps the map current — with evidence it actually runs.

Judgment guidance: score what the walks showed, not what the docs promise.
One fast scenario doesn't offset three dead ends; say which scenarios drove
the level. Cite paths for every claim — the doc that routed you, the
directory that misled you, the missing header.

## Fix marking

Mark as `**Fix:**`: adding or repairing a layout/orientation section in an
existing doc so it matches the real tree (distilled from the tree itself —
never invented architecture); adding module-purpose headers/docstrings at
the specific files where a walked scenario dead-ended, citing the scenario;
documenting generated-vs-source distinctions. For misleading directory-level
naming, fix ONLY via docs (a note in the layout section explaining what the
directory really holds) — renames are too invasive to stage without team
buy-in; put rename suggestions in the report as unstaged opportunities, not
`**Fix:**` markers.
