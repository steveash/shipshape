# Assessing concept and identifier clarity

## Why this matters

An agent reading a usage site infers meaning from the name and moves on — it
does not audit every identifier against its implementation. That trust is
what makes agents fast, and it is exactly what ambiguous or lying names
exploit: a `session` that means an HTTP session in one package and an agent
run in another, a `Config` that shadows the framework's `Config`, a
`validate()` that silently mutates its argument. Each such concept is a trap
armed for every future session. Clear, one-meaning-each vocabulary — ideally
written down in a glossary the code actually matches — is what makes usage
sites locally understandable.

## Evidence to gather (scan step)

1. **Build the concept inventory.** From the recon summary, entry docs, and
   the code itself (public APIs, core module names, recurring identifiers),
   list roughly `conceptCount` (~10-15) core domain concepts/identifiers —
   the words this repo's logic is built from. Prefer load-bearing terms
   (things passed between modules, persisted, or exposed) over incidental
   locals.
2. **Spot-check usage sites.** For each concept, sample `sitesPerConcept`
   (2-3) usage sites in different modules and judge, per site:
   - is the meaning clear locally, without opening the definition?
   - does this one term mean two different things anywhere (or do two terms
     name the same thing)?
   - does the name collide confusingly with library/framework vocabulary
     the repo uses (shadowed imports, same-name-different-meaning)?
   - are abbreviations decipherable from context or documented?
   - if a glossary/terminology section exists, does the code's usage match
     it?
3. **Record the concept table** in `resources/concept-table.md`: one row per
   concept with verdict (clear / ambiguous / colliding / undocumented
   abbreviation), the sampled sites as path:line citations, and a one-line
   note per problem site. This table is the evidence base for the verdict.
4. **Hunt name-contradicts-behavior identifiers** — the highest-severity
   finding class, because agents trust names. Look for verbs whose
   convention promises one thing while the body does another: a `validate`
   that mutates, a `get` that creates or writes, a `check` with side
   effects, an `is_`/`has_` returning non-boolean, a `copy` that aliases.
   Search by convention-carrying prefixes and read the bodies of a sample.
   Cite each with path:line and the specific contradiction.
5. **Look for guards.** A glossary linked from the agent doc, lint naming
   rules (naming-convention linters, banned-name lists), and review
   criteria that explicitly name vocabulary consistency are what make
   L4/L5 possible. Cite the config/criteria files.

## Judging

Because clarity itself is judgment, L4/L5 for this practice mean the
legibility property is GUARDED mechanically — lint rules, CI checks, or
reviewer criteria that name it — not merely that today's names are tidy.

- **L1** — no discernible vocabulary: core concepts unnameable from the
  code, pervasive one-letter/generic identifiers at module boundaries.
- **L2** — several load-bearing concepts are ambiguous, colliding, or
  contradicted by behavior; an agent cannot rely on names and must read
  definitions constantly.
- **L3** — concepts are mostly consistent — one meaning each, matching any
  glossary — and the gaps that exist are documented or peripheral. No
  name-contradicts-behavior findings on load-bearing identifiers.
- **L4** — vocabulary is guarded: a glossary exists AND is linked from the
  agent doc, review criteria name vocabulary/naming consistency, and/or
  lint naming rules enforce conventions mechanically.
- **L5** — vocabulary drift is actively caught: e.g. reviewer agents or
  scheduled audits check new identifiers against the glossary, with
  evidence the loop has fired (glossary updated alongside code, findings in
  history).

Judgment guidance: weight by load-bearingness — one ambiguous core concept
(`job` meaning both queue-entry and cron-config) outweighs five fuzzy local
names. Any confirmed name-contradicts-behavior finding on a load-bearing
identifier caps the level at L2 and must lead the Opportunities list. Every
claim cites path:line; "some names are unclear" without citations is not a
finding.

## Fix marking

Mark as `**Fix:**`: adding or extending a glossary/terminology section
distilled from observed usage (every entry cites the sites it was derived
from — document what the code does mean, never legislate what it should);
linking an existing glossary from the agent doc; documenting an ambiguous
abbreviation where usage makes the meaning provable. Mark a misleading-name
rename ONLY where the blast radius is small and mechanical: the symbol is
internal, tooling can rename it with all references updated, and the test
suite passes — otherwise the rename is report-only. Never mark fixes that
would change behavior to match a name.
