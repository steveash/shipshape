# Assessing abstraction consistency and duplication

## Why this matters

Agents generalize aggressively from local examples: the first error-handling
pattern an agent reads becomes "how this repo handles errors." When the repo
solves the same problem three different ways, every agent session picks one
at random — or invents a fourth — and consistency decays further. Duplicated
code is the sharpest form of this: near-identical blocks in two places mean
a bug fixed in one and left alive in the other, and copies that have already
diverged are silent behavior differences nobody chose. A repo with one
blessed pattern per concern and bounded, deliberate duplication lets local
reading generalize safely.

## Evidence to gather (scan step)

1. **Pick `concernCount` (3-5) cross-cutting concerns the repo actually
   has**, from the recon summary and entry points — candidates: error
   handling, config loading, IO/persistence access, input validation,
   logging, external-API-call patterns, CLI argument handling. Skip
   concerns the repo genuinely doesn't have; note why.
2. **Sample each concern across modules/packages** — at least 3-4
   implementation sites in different parts of the tree — and classify the
   concern as one of:
   - **one blessed pattern followed** (same helper/idiom everywhere, cite
     the helper and representative call sites);
   - **one pattern with documented exceptions** (deviations exist but are
     explained in docs/comments — cite the explanation);
   - **several competing patterns** (cite at least two sites per pattern so
     the competition is provable).
3. **Hunt real duplication.**
   - Near-identical functions/blocks in multiple places: cite each pair
     with both paths and line ranges.
   - **Copy-paste drift** — duplicates that have diverged (same origin,
     different behavior now) — the worst kind: cite the pair AND the
     specific diverged lines, since neither copy is authoritative anymore.
   - Use structural search (repeated distinctive lines, same function names
     in multiple files, similar-length twins) and, if a duplication tool is
     already configured in the repo, its output.
4. **Distinguish deliberate duplication from neglect.** Test fixtures,
   generated code, vendored dependencies, and documented
   fork-on-purpose copies are not findings — but only when they are
   identifiable as deliberate (location, headers, docs). Say which bucket
   each duplication falls into.
5. **Record everything in `resources/patterns.md`**: per concern, the
   classification with citations; then the duplication inventory (pairs,
   drift status, deliberate-vs-neglect verdict).
6. **Look for guards**: shared helpers that exist AND are pointed to by
   lint rules or review criteria ("use `internal/errors`, don't hand-roll"),
   duplication detection (jscpd, pylint duplicate-code, PMD CPD) wired into
   CI. Cite configs/workflows.

## Judging

Because consistency itself is judgment, L4/L5 for this practice mean the
legibility property is GUARDED mechanically — lint/CI/review criteria that
name it — not merely that today's code happens to be uniform.

- **L1** — no discernible patterns: every site hand-rolls every concern;
  duplication pervasive and diverged.
- **L2** — competing patterns for core concerns (agents cannot tell which
  to follow), and/or unexplained duplication including diverged copies.
- **L3** — consistent patterns for the sampled concerns; duplication
  bounded and explicable (deliberate categories identifiable); deviations
  rare or documented.
- **L4** — consistency is guarded: shared helpers exist AND something
  mechanical points agents at them (lint rules banning the hand-rolled
  form, review criteria naming the blessed pattern), and/or duplication
  detection runs in CI.
- **L5** — consolidation is continuous: duplication metrics tracked over
  time, refactors traceable to incidents or audits, pattern docs updated
  as patterns evolve — with evidence the loop has fired.

Judgment guidance: weight core concerns over peripheral ones — two error-
handling patterns in the request path outweigh three logging styles in
scripts. A diverged-copy finding on load-bearing code should lead the
Opportunities list. Every "competing pattern" claim needs at least two
citations per pattern; every duplication claim needs both paths with line
ranges.

## Fix marking

Mark as `**Fix:**`: consolidating a small, provably-identical duplication
(near-verbatim, no divergence, both copies covered or coverable by existing
tests) into an EXISTING shared location — never a new abstraction — with
tests passing; documenting the blessed pattern for a concern where one
pattern clearly dominates, citing the majority usage sites it is distilled
from. Diverged copies are report-only (resolving divergence means choosing
a behavior — the team's call). Never mark sweeping refactors, new shared
modules, or consolidations whose call sites aren't all provably identical.
