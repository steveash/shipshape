# Assessing quality gate parity: local == CI

## Why this matters

An agent's feedback loop is the local gate; the team's backstop is CI. When
they are two hand-maintained command lists, they drift, and drift shows up as
red CI on work that "passed locally" — the most expensive kind of failure for
an agent, because the error arrives minutes later and out of context. In a
studied repo the historical #1 cause of red CI was exactly this: agents ran
lint+test but not `format --check`, because the doc and the workflow listed
different steps. The cure is structural, not editorial: one shared gate
artifact (e.g. `scripts/gate.sh`) that dev mode runs with auto-fixes
(`format --fix`) and CI runs with `--check`, invoked identically from the
agent doc and the workflow. If it passes locally, CI passes — by
construction, not by discipline.

## Evidence to gather (scan step)

1. **Find the gate(s).** Inventory every place a check-set is defined: gate
   scripts (`scripts/gate.sh`, `check.sh`, `verify.*`), Makefile/justfile
   targets, package.json scripts, tox/nox/hatch envs, composite lint
   runners (pre-commit run --all-files as gate), and the commands agent
   docs/CONTRIBUTING/README prescribe. Record each with its path and the
   exact commands it expands to, in `resources/gate-inventory.md`.
2. **Diff docs vs CI.** Extract the exact command set the docs tell a
   developer/agent to run, and the exact command set CI workflows run (up to
   `maxWorkflowsToAnalyze` workflow files; cite file and job/step names).
   Produce a three-column comparison in `resources/parity-diff.md`:
   docs-only commands, CI-only commands, shared. Every asymmetry is a
   finding with both paths cited. Note whether shared commands are shared by
   *reference* (both invoke the same script/target) or merely by
   *coincidence* (same text in two files — that is latent drift, not
   parity).
3. **Check the four command classes.** For each language in the repo:
   lint, format, typecheck (where the language has one — skip for e.g. Go's
   built-in vet counts as lint+typecheck; use judgment and say so), test.
   Record which classes exist as runnable commands, which are documented,
   and which CI runs. A missing class (commonly: format-check absent from CI
   while a formatter config exists) is a finding.
4. **Check the auto-fix asymmetry.** Does the dev-facing entry point
   auto-fix what is fixable (formatters, import order, lint --fix) while the
   CI-facing mode verifies (`--check`/`--diff`)? A dev gate that only checks
   makes agents hand-fix formatter output; a CI gate that auto-fixes hides
   drift. Cite the flags actually used.
5. **Inventory code surfaces vs CI jobs.** List languages/packages/apps in
   the repo (workspace members, sub-app directories, `package.json`s,
   `pyproject.toml`s) and map each to the CI job that lints/tests it. A
   studied repo had 5.3k lines of TypeScript with test suites CI never
   invoked — a whole sub-app orphaned from the gate. Any surface with tests
   or lint config that no CI job touches is a high-impact finding. Save the
   map to `resources/coverage-map.md`.
6. **Look for self-guarding.** Gate steps that encode past incidents
   (import-smoke checks, clean-checkout smoke jobs, a check that the gate
   script itself is what CI invokes) are L5 evidence — cite them.

## Judging

- **L1** — no quality gate: no lint/format/typecheck/test commands exist in
  any documented or CI-run form.
- **L2** — tools exist, but the gate cannot be trusted: docs and CI
  prescribe different command sets, one or more of the four classes is
  missing from docs or CI, or code surfaces are orphaned from CI entirely.
- **L3** — all applicable command classes exist, are documented, and CI runs
  a parallel set covering all code surfaces — but docs and CI maintain the
  list separately (parity by coincidence, drift possible).
- **L4** — parity by construction: a single shared artifact (gate script,
  make target, package script) that docs prescribe and CI invokes, with the
  dev-auto-fix / CI-check asymmetry, covering every code surface.
- **L5** — L4 plus the gate guards itself: steps encoding past incidents
  (e.g. an import-smoke check born from an outage), a clean-checkout smoke
  job in CI, or drift detection that fails when docs and CI diverge.

Judgment guidance:

- Weight coverage gaps heavily: an elegant shared gate that skips a sub-app
  is worse than a duplicated list that covers everything. Say which surfaces
  are unguarded, with line counts if cheap to get.
- "Typecheck where applicable" is a judgment call — record it explicitly per
  language rather than silently excusing.
- Parity claims need both citations: the doc line prescribing the command
  and the workflow line running it.

## Fix marking

Mark as `**Fix:**`: extracting a shared gate script from the steps CI
*already runs* and pointing docs and CI at it (consolidation only — no new
policy, no new checks); wiring an orphaned package's existing test/lint
commands into CI; adding a missing `--check` mode to CI for a formatter the
repo already configures; reconciling a docs-vs-CI command mismatch toward
whichever side the repo's evidence says is canonical. Do NOT mark: inventing
new lint/typecheck tooling the repo hasn't adopted, or adding gate steps no
existing config supports.
