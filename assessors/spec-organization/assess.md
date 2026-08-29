# Assessing spec and decision-log organization

## Why this matters

Repos that work well with agents accumulate specs, plans, and decision
logs quickly — and an agent's discovery is top-down: it starts at
README/AGENTS.md and follows links. A doc no entry point reaches does not
exist for that agent; in a repo we studied, 787 lines of subsystem
documentation were unreachable from any top-level doc and thus invisible.
Ordering is the second half: with numbering, an index, and
draft/active/superseded markers, an agent knows what is current; without
them it reads superseded plans as gospel. And because context compaction
destroys the dialogue where decisions were argued out, rationale survives
only if it lands in a committed file in the same change as the decision —
decision logs with stable citable IDs (D1..D33 tables referenced from
code) are the strongest form of this.

## Evidence to gather (scan step)

1. **Inventory spec-like docs.** Find every spec, plan, design note,
   decision log, milestone doc, RFC, and ADR: docs/, specs/, plans/,
   docs/specs/, docs/adr/, .claude/plans/, notes/, top-level *.md beyond
   README-family. Record path, apparent type, status if stated, and
   last-commit date in `resources/spec-inventory.md`.
2. **Build the reachability graph.** Crawl links starting from the entry
   points (README, AGENTS.md/CLAUDE.md, any docs index) and mark every
   inventoried doc reachable or orphaned. Write the graph and the orphan
   list to `resources/reachability.md`. Orphans are findings, sized by how
   load-bearing the content is.
3. **Check ordering signals.** Is there an index (docs/README, a numbered
   000-/010- prefix scheme, a table of specs)? Do docs carry status
   markers (draft/active/superseded/done — frontmatter, a Status line, or
   a tracked table)? Can an agent tell, without reading each file, which
   of two overlapping specs wins? Record what the scheme is and where it
   breaks down.
4. **Check decision logs and citation.** If a decision log exists, do
   entries have stable IDs? Spot-check up to
   `maxDecisionCitationsToCheck` IDs: are any cited from code comments,
   docstrings, or other docs? Citation from code is a strength worth
   naming. Also check whether recent decisions carry rationale written at
   decision time (the log entry explains why, in the same commit as the
   change it governs) versus bare outcomes.
5. **Check plan hygiene.** Are plan files kept where the harness
   preserves them (e.g. a committed plans/ dir rather than ephemeral
   scratch)? Are plan TEMPLATES clean, or polluted with one run's results
   (a template containing a specific past run's output means every future
   run inherits noise)? Have milestone/decision overview docs kept
   absorbing new subsystems, or did they freeze while the repo grew (new
   packages absent from the doc that claims to enumerate the work)?
6. **Check for mechanical protection.** Is the index generated, or is
   reachability/link integrity checked in CI or hooks? Any scheduled
   staleness or orphan detection?

## Judging

- **L1** — no committed specs, plans, or decision logs in any form.
- **L2** — spec-like docs exist but are a pile: no index or numbering, no
  status markers, orphans unreachable from any entry point, decision
  rationale missing or trapped in PR/chat history, plan templates
  polluted with run results.
- **L3** — the corpus is ordered and reachable: an index or numbering
  scheme agents can follow, status markers distinguishing current from
  superseded, decision logs with stable IDs, rationale recorded in-file
  at decision time, no load-bearing orphans.
- **L4** — L3 plus mechanical enforcement: the index is generated or
  link/reachability integrity is checked in CI or hooks, so an orphaned
  or unindexed doc fails a gate instead of waiting to be noticed.
- **L5** — L4 plus a feedback loop: scheduled staleness/orphan detection
  (an agent or job that sweeps the corpus on a cadence and proposes
  reindexing, status updates, or archival).

Judgment guidance:

- Weight ordering and enforcement over volume: ten specs with an index,
  statuses, and a CI link check outrank fifty beautifully written specs
  in an unordered heap.
- Respect the repo's own scheme — numbering, frontmatter, a STATUS table,
  and directory convention are all valid ordering signals; judge whether
  the scheme answers "what is current and where do I look", not whether
  it matches a favorite format.
- Cite paths for every claim: the exact orphaned docs (with line counts),
  the specific pair of overlapping specs with no status tiebreak, the
  decision IDs you found cited from code.

## Fix marking

Mark as `**Fix:**` findings like: create a spec index enumerating the
docs that exist (titles and one-line scopes drawn from the docs
themselves); add status frontmatter or a Status line to existing docs
where the status is evidenced (a plan whose work is visibly merged can be
marked done; ambiguous cases get `status: unknown`, not a guess); link
orphaned docs from the entry point that should own them; clean one run's
results out of a plan template (preserving the results in a dated
run-log file). Do NOT mark: writing rationale for past decisions nobody
recorded, renumbering an existing scheme, or archival calls that need
team judgment about what is truly dead.
