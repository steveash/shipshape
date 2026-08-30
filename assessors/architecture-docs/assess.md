# Assessing architecture and layout docs

## Why this matters

An agent deciding where a change belongs consults two things: the tree
itself and whatever the repo says about the tree. Architecture docs that
live OUTSIDE the agent onboarding doc (ARCHITECTURE.md, docs/design/, ADRs)
and are routed to FROM it give agents depth on demand without taxing every
session's context. But a layout section that lies is worse than none: in a
repo we studied, the documented "repository layout" omitted two of the
three largest subsystems, so agents placed new code by guesswork while
believing they had a map. The failure modes are specific: unreachable
architecture docs, layout sections that drifted from the tree, and
architecture prose crammed into the agent doc where it bloats every
session.

## Evidence to gather (scan step)

1. **Find the architecture docs.** Search for ARCHITECTURE.md, DESIGN.md,
   docs/architecture*, docs/design*, docs/adr*/, docs/decisions*/,
   docs/specs*/, RFC directories, and any file whose title or headings
   describe system structure, module boundaries, or design decisions.
   Record path, apparent scope, and last-commit date for each in
   `resources/architecture-doc-inventory.md`.
2. **Check routing from the agent doc.** From AGENTS.md/CLAUDE.md (or the
   repo's equivalent) and README, follow links: is each architecture doc
   reachable within one or two hops? An architecture doc unreachable from
   the onboarding surface is a finding — agents will not read what nothing
   points to. Conversely, substantial architecture PROSE living inside the
   agent doc (component descriptions, design rationale, layered diagrams in
   text) instead of being routed to is the anti-pattern in the other
   direction; flag it with line ranges.
3. **Diff the layout section against the filesystem.** If any doc has a
   "repository layout" / "project structure" / "directory guide" section,
   list its claimed entries and compare against the real top level (and
   real packages/apps in a monorepo — read the workspace config). Record
   every documented-but-absent entry and every real top-level
   package/app/subsystem the section omits in
   `resources/layout-diff.md`. Missing major subsystems are findings, not
   nitpicks. If no layout section exists anywhere, record that.
4. **Check code→doc traceability.** Sample up to `maxTraceabilitySamples`
   module entry points (package roots, main modules, files with header
   docstrings). Do any cite an architecture section, ADR number, or
   decision ID ("see ARCHITECTURE.md §services", "per ADR-0007")? Citations
   from code back into the architecture docs are a strength worth naming —
   they keep the docs load-bearing. Record what you sampled and what you
   found.
5. **Check for mechanical protection.** Is the layout section generated
   (a script or CI step that emits it), or verified (a link/structure check
   in CI or hooks)? Is there any scheduled drift check touching
   architecture docs?

## Judging

- **L1** — no architecture or layout documentation in any form: no
  ARCHITECTURE.md, no design docs, no ADRs, no layout section anywhere.
- **L2** — architecture material exists but an agent cannot rely on it:
  unreachable from the onboarding surface, a layout section contradicting
  the real tree (missing or phantom subsystems), stale design docs
  describing a structure that no longer exists, or all architecture prose
  living inside the agent doc.
- **L3** — architecture and layout docs exist outside the agent doc, are
  routed to from it, and match the actual tree at the level they claim to
  describe (every real top-level package/app appears; no documented paths
  that don't exist). The agent doc routes rather than duplicates.
- **L4** — L3 plus mechanical enforcement: the layout section is generated
  from the tree, or CI/hooks verify the documented structure and links
  (e.g. a check that fails when a top-level package is added without a
  layout entry, or a link checker covering the architecture docs).
- **L5** — L4 plus a feedback loop: drift detection on a cadence (a
  scheduled job or agent that compares architecture docs to the code and
  proposes updates), or measured evidence architecture docs are updated in
  the same changes that alter the structure they describe.

Judgment guidance:

- Weight accuracy and enforcement over volume: a 40-line ARCHITECTURE.md
  that matches the tree and is verified in CI outranks a 600-line design
  treatise that omits a subsystem.
- ADRs/design docs count toward the practice even without an
  ARCHITECTURE.md, if they are reachable and current. Judge what an
  arriving agent would actually find and whether it would mislead them.
- Cite paths and line references for every claim: the exact layout entries
  that are wrong, the exact docs that are orphaned, the exact docstrings
  that cite decisions.

## Fix marking

Mark as `**Fix:**` findings like: create or update the repository-layout
section from the real tree (the filesystem is the source — enumerate what
exists, with one-line descriptions drawn from each package's own
README/manifest); add routing links from the agent doc/README to existing
architecture docs; move architecture prose out of the agent doc into an
architecture doc and leave a link. Do NOT mark: writing architectural
rationale, design decisions, or ADRs that are not evidenced anywhere in
the repo — inventing the "why" is the team's job, not shipshape's.
