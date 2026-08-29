# Assessing agent onboarding docs

## Why this matters

An agent landing in a repo builds its entire model from text. The onboarding
doc (AGENTS.md, CLAUDE.md, or an equivalent the repo's tooling loads) is the
highest-leverage file in the repo — and also the easiest to ruin. Evidence
from studied repos: developer-written files with a handful of surgical rules
improve agent success; auto-generated or restated-from-config files add cost
and reduce success. Every line is a tax on every future session.

## Evidence to gather (scan step)

1. **Inventory the surface.** Find every agent-instruction file: AGENTS.md,
   CLAUDE.md, CLAUDE.local.md, .cursorrules, .cursor/rules/, WARP.md,
   GEMINI.md, agents.toml, .claude/ contents, nested variants in
   subdirectories/packages. Record line counts. Check `.gitignore`: a
   gitignored CLAUDE.md next to a committed AGENTS.md is a deliberate
   portability choice, not a gap — never penalize it.
2. **Check every reference.** For each doc, extract referenced files, paths,
   commands, and links (up to `maxReferencesToCheck`, prioritizing
   load-bearing ones). Verify each file exists, each documented command
   matches real scripts/config (e.g. a documented `npm test` has a test
   script), each referenced tool is declared or available. Write results to
   `resources/reference-check.json` with per-reference status.
3. **Classify content.** For the main doc(s), classify each section:
   prohibition/boundary rules, surgical agent-specific rules, workflow
   commands, routing/links to deeper docs, stack description discoverable
   from config, architecture prose, restated linter/style rules,
   auto-generated boilerplate. Estimate the discoverable-vs-non-discoverable
   ratio (the "filter test": could the agent learn this by reading
   code/config/tool output?). Save to `resources/content-analysis.md`.
4. **Duplication and drift.** If multiple per-tool files exist, diff them:
   thin redirects (one canonical + `@AGENTS.md`-style pointers) are the good
   pattern; near-duplicates that have drifted are findings. For monorepos:
   does the root doc route to per-package docs where packages differ?

## Judging

- **L1** — no agent onboarding doc in any form (and no deliberate equivalent
  like a documented agents/ system a harness actually loads).
- **L2** — a doc exists but an agent can't rely on it: broken references,
  auto-generated boilerplate, mostly discoverable content, or drifted
  duplicates across tools.
- **L3** — a current, accurate, developer-written doc: references resolve,
  prohibitions and surgical rules are present and lead the file, routing to
  deeper docs instead of duplicating them, monorepo routing where needed.
- **L4** — L3 plus mechanical protection: reference/link checking in CI or
  hooks, delimited auto-managed regions for tool-injected content, or
  structural enforcement that keeps the doc honest (e.g. commands in the doc
  are the same scripts CI runs, verified).
- **L5** — L4 plus a feedback loop: scheduled doc-drift/staleness checking
  that proposes updates, or measured evidence the doc is maintained per
  change (doc updated in same commits as the behavior it describes).

Judgment guidance:

- Value density over length; do not penalize length alone. A 400-line doc of
  genuinely non-discoverable rules can be right; a 60-line restatement of
  package.json is not.
- A missing AGENTS.md with a rich, discoverable equivalent (e.g. an agents/
  directory that CI workflows actually load) can reach L3 — judge whether an
  arriving agent's tooling would actually find and load the guidance.
- Cite the specific broken references, duplicated rules, and discoverable
  lines you found. Every claim needs a path.

## Fix marking

Mark as `**Fix:**` findings like: repair/remove broken references; create a
minimal AGENTS.md distilled from existing docs (only when real source
material exists — never invent rules); convert duplicate per-tool files to
redirect pattern; move restated linter rules out of the doc; add routing to
key docs that exist but are unreferenced. Do NOT mark: writing substantial
new content that requires team knowledge shipshape doesn't have.
