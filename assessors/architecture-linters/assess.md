# Assessing architecture lint enforcement

## Why this matters

Architecture erodes one convenient import at a time, and agents add
convenient imports at machine speed. A layering rule stated in prose holds
at ~70-80% per session and decays after context compaction; the same rule as
an import-linter contract, a dependency-cruiser rule, an ArchUnit test, an
eslint-boundaries/no-restricted-imports config, a tsconfig path restriction,
or a cargo workspace dependency constraint holds at 100% in CI. But there is
a documented failure mode specific to this practice: **agents game
architecture-conformance tools to get green** — adding a suppression, an
allowlist entry, or an interface shim that satisfies the letter of the rule
while violating its intent. So the tool is necessary but not sufficient:
this assessor also checks suppression drift around the arch rules
themselves.

## Evidence to gather (scan step)

1. **Extract the prose rules.** Read agent docs, ARCHITECTURE.md, ADRs,
   CONTRIBUTING for architectural constraints: "core must not import X",
   "never edit core/**", "plugins depend on the API package only", layer
   diagrams with direction arrows. List every such rule with its source path
   and line in `resources/prose-rules.md`.
2. **Find the tooling.** Inventory arch-lint configs: `.importlinter`,
   `dependency-cruiser` configs, ArchUnit test classes, eslint
   `boundaries`/`no-restricted-imports`/`import/no-restricted-paths` rules,
   tsconfig `paths`/project-references used restrictively, cargo workspace
   dependency graphs, Bazel visibility, nx module boundaries. Record each
   with its config path.
3. **Reconcile both directions.** For each prose rule: is there a matching
   mechanical rule? For each mechanical rule: is its intent documented
   anywhere? Prose-only rules are the primary findings (each with the
   recommended tool for that ecosystem); tool-only rules are minor findings
   (undocumented intent). Save the reconciliation table to
   `resources/reconciliation.md`.
4. **Verify CI wiring.** For each arch-lint config, cite the CI workflow
   step (or hook) that runs it. A config no automation runs enforces
   nothing.
5. **Sample for real coverage.** Pick up to `maxRulesToSample` enforced
   rules and check they actually bind the paths the prose names: do the
   glob/module patterns match the current tree layout (a rule written for
   `src/core` when the code moved to `packages/core` binds nothing)? Does
   the contract cover all entry points or only one? Cite what you checked.
6. **Audit suppression drift around arch rules.** Search for suppressions of
   exactly these rules: `# noqa` on restricted imports, eslint-disable of
   boundary rules, import-linter `ignore_imports` entries,
   dependency-cruiser exception lists, ArchUnit `freeze`/ignore files.
   Count them, note whether each carries rationale, and whether the
   exception lists grow without review (blame a few entries if cheap). A
   growing unexplained exception list is the gamed-rule signature.

## Judging

- **L1** — no architecture rules anywhere: no prose constraints, no
  arch-lint tooling. (If the repo is genuinely too small to have layers,
  say so and mark confidence accordingly.)
- **L2** — prose-only rules: architectural constraints exist in docs but no
  tool binds any of them.
- **L3** — partial tooling: some rules mechanically enforced, or tooling
  exists but is not run by CI, or enforced rules no longer bind the paths
  the prose names.
- **L4** — the prose rules are reconciled to CI-enforced lint: every
  reconcilable prose rule has a matching mechanical rule that verifiably
  binds the right paths, and suppressions of arch rules are few and
  explained.
- **L5** — L4 plus conformance evolves: rules added from incidents with
  traceable rationale, suppression/exception-list audits on a cadence, and
  review practices that watch for gamed-rule patterns (e.g. exception-list
  growth flagged in review).

Judgment guidance:

- A green arch-lint run over a bloated exception list is not L4 — the
  exception list is where the architecture actually lives; judge it.
- Do not demand tooling for rules that are not mechanically expressible
  ("keep the domain layer pure of business-policy leaks" may be judgment);
  classify such rules honestly as non-reconcilable rather than findings.
- Every claim cites paths: the prose rule's location, the config rule that
  matches (or doesn't), the CI line that runs it.

## Fix marking

Mark as `**Fix:**`: adding a lint rule that mirrors an EXISTING documented
prose rule, citing the prose source per rule (use the ecosystem's idiomatic
tool, configured minimally to express exactly that rule); wiring an existing
arch-lint config into CI; updating a rule's paths to re-bind after a tree
move (cite the prose rule proving intent). Do NOT mark: inventing
architectural policy the repo never wrote down, restructuring code to
satisfy rules, or pruning exception lists (each entry needs team judgment —
report them instead).
