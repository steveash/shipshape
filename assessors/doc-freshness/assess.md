# Assessing doc freshness

## Why this matters

An agent treats committed docs as ground truth, so a stale claim is an
instruction to be wrong. Real cases from studied repos: a CLI module's
docstring said "scaffold stub — subcommands report not implemented" atop
1,854 lines of working dispatch; a skill doc told agents to skip an eval
gate that was in fact a fully working 542-line implementation. In both
cases the agent that trusts the doc disables or reimplements working
code. Freshness is not a vibe — every status claim, feature list, count,
and API surface in a doc is checkable against the code it describes, and
this assessor checks a sample, claim by claim.

## Evidence to gather (scan step)

Build a checked-claims inventory as you go: for each claim record the doc
path and line, the claim, the code you read to verify it, and the verdict
(true / stale / unverifiable). Write it to
`resources/claims-checked.md` — it is doctor mode's working memory. Cap
the total at `maxClaimsToCheck`, prioritizing load-bearing docs (agent
docs, READMEs, active specs, module docstrings on entry points).

1. **Hunt stale status claims.** Grep docs and docstrings for status
   language: "not yet implemented", "not implemented", "stub",
   "scaffold", "TODO: implement", "placeholder", "coming soon", milestone
   markers like "M1 scaffold". For each hit on code that plausibly
   shipped, READ the code the claim describes and verify: does the
   "stub" actually dispatch, compute, or pass tests? A stale
   "unimplemented" claim on working code is a top-severity finding.
2. **Diff specs against code, both directions.** Sample recent,
   load-bearing specs: pick concrete claimed features and confirm each
   exists in code; then sample obvious code capabilities (CLI
   subcommands, exported entry points) and confirm the governing spec or
   doc mentions them. Record spec'd-but-missing and
   coded-but-unspec'd items separately.
3. **Check version/count drift.** Find prose that states counts, ranges,
   or versions ("decisions D1-D20 resolved", "12 assessors", "requires
   Node 18") and verify each against the authoritative source (the table
   that actually runs to D33, the real directory count, the engines
   field). Off-by-many drift means the prose stopped being maintained.
4. **Check API-surface freshness.** If any doc enumerates importable
   symbols, commands, flags, or endpoints, verify a sample actually exist
   in code with matching names. Full accuracy is a citable strength (one
   studied repo had 33/33 documented exports correct — name that kind of
   result); missing or renamed symbols are findings.
5. **Check staleness metadata and mechanisms.** Do docs carry
   last_updated/last_checked/status fields, and is visibly stale content
   demoted (marked superseded, moved to archive) rather than left
   authoritative? Is there any mechanical freshness aid: generated doc
   sections, a docs-in-same-commit convention that CI or hooks check, a
   scheduled drift-detection job or agent?

## Judging

- **L1** — the docs materially misdescribe the code: multiple verified
  stale status claims on load-bearing paths, or docs so outdated an
  agent following them acts against the actual system. (Freshness of
  nothing: if the repo has essentially no docs to be stale, defer to the
  other docs assessors and score the little that exists.)
- **L2** — mostly plausible docs, but the sample surfaces real rot: some
  stale status claims, spec/code mismatches, or count/version drift, and
  nothing marks which docs are current — an agent cannot tell fresh from
  stale without doing this assessor's work itself.
- **L3** — the sampled claims check out: status language matches reality,
  spec'd features exist, counts and API surfaces are accurate (or the
  rare stale doc is explicitly demoted/superseded). Staleness metadata or
  a visible update habit lets an agent judge currency.
- **L4** — L3 plus mechanical currency: doc freshness is checked, not
  remembered — an enforced docs-in-same-commit convention, generated
  sections for drift-prone content (counts, API lists, layouts), or CI
  checks that fail on documented symbols/commands that no longer exist.
- **L5** — L4 plus a feedback loop: a scheduled drift-detection agent or
  job that compares docs to code on a cadence and proposes updates for
  human merge.

Judgment guidance:

- Verify before accusing: a claim is only "stale" once you have read the
  code it describes and can cite why. "Unverifiable" is a legitimate
  verdict — record it and weight confidence, don't guess.
- Weight enforcement over metadata volume: a repo with generated API docs
  and a same-commit convention outranks one with hand-maintained
  last_updated fields on every file.
- Cite doc path + line AND the code path + evidence for every finding
  ("docstring at src/cli.py:3 says 'not implemented'; dispatch table at
  src/cli.py:41-180 implements all six subcommands").
- Name verified strengths as precisely as findings — "all N sampled
  exports exist" is citable evidence of health.

## Fix marking

Mark as `**Fix:**` findings like: correct a specific stale claim you
verified against code (the fix commit must cite the code evidence from
`resources/claims-checked.md`); update drifted counts/ranges/versions to
match the authoritative source; add or correct status/last-updated
metadata on docs whose currency you established; demote a verified-stale
doc (mark superseded, link its successor). Each fix targets specific
verified claims. Do NOT mark: rewriting whole documents, fixing
unverified claims, or writing new descriptions of code behavior that no
existing doc attempts.
