# Assessing test trustworthiness: can the safety net actually fail?

## Why this matters

Every other enforcement practice leans on the tests: hooks run them, CI
gates on them, agents treat green as done. Agents optimize for green, and a
suite that cannot go red will happily provide it. The named failure modes,
all observed in studied repos: **lying tests** — suites exercising a mock
reimplementation instead of the real path, so the real code can rot while
the suite stays green; harnesses wrapping test bodies in
try/except-continue; `|| true` (or `; exit 0`, `continue-on-error`) in test
scripts; always-green suites nobody has ever watched fail. And
**suppression drift** — noqa/eslint-disable/@ts-ignore/#[allow]/skip/xfail
markers accumulating exactly where the risky code is. Watching a test go
red is only proof if someone checks why — so this assessor, where cheap,
breaks something on purpose and reports honestly what happened.

## Evidence to gather

**Execution safety: all execution happens in a scratch copy.** Copy the
target package(s) into your own `resources/scratch/` directory (exclude
.git and heavy artifact dirs like node_modules; `cp -r` or `rsync`). Never
run commands inside the real target path; never modify the real target.
Same rules as build-test-locally.

1. **Hunt lying-test patterns (static).** Grep test scripts, CI workflows,
   Makefiles, and test harness code for: `|| true`, `; exit 0`,
   `continue-on-error: true` on test steps, broad try/except-continue or
   catch-and-log around test invocation or inside shared test helpers,
   assertion-free tests, and suites whose "system under test" is a local
   mock reimplementation of the real module (look for test-side classes
   duplicating production logic rather than importing it). Cite every hit
   with path and line in `resources/lying-tests.md`; for mock
   reimplementations, name the production path the test should import but
   doesn't.
2. **Count suppression drift.** Count `noqa`, `eslint-disable*`,
   `@ts-ignore`/`@ts-expect-error`, `#[allow(...)]`, `# type: ignore`,
   `skip`/`xfail`/`todo`/`.only` markers across the codebase. Report totals,
   per-directory clustering (drift concentrated in the risky module is
   worse than scattered), and how many carry reasons (`skip(reason=...)`
   vs bare). Save the tally to `resources/suppression-census.md`.
3. **Reconcile tests vs CI.** Map test directories/suites to the CI jobs
   that run them. Tests CI never invokes are findings (coordinate with the
   recon summary / quality-gate-parity coverage map if present, but verify
   the test-specific claim yourself).
4. **Mutation spot-check (execution, if cheap and time permits).** If
   `attemptMutationCheck` is true and the suite is runnable within the
   `maxMinutes` budget: in the SCRATCH COPY, first run the relevant test
   subset to confirm it is green as-is; then make ONE deliberate small
   breaking change (e.g. invert a condition in a core function the tests
   plausibly cover), rerun the same subset, and confirm it goes red; then
   discard the scratch. Record the experiment honestly either way in
   `resources/mutation-check.md`: the exact mutation (file, line, before/
   after), the command run, and the outcome. A suite that stays green under
   a real bug is a headline finding; a suite that went red is real evidence
   of trustworthiness — and "could not run within budget" is an honest
   third outcome, not a failure to hide.
5. **Credit trust-building patterns.** Golden/snapshot suites with review
   discipline; deterministic test design — fake clocks, seeded RNG (a
   studied repo lint-bans wall-clock and unseeded random in plugin code —
   that is L4 evidence); keyless-by-default suites with cleanly-gated keyed/
   integration tests; mutation-testing tools configured (mutmut, Stryker,
   PIT, cosmic-ray) and run on any cadence — that is the L5 signal.

## Judging

- **L1** — no tests.
- **L2** — tests exist but cannot be trusted: red or flaky as-is, not run
  in CI, or visibly lying (swallow-all harness, `|| true`, mock
  reimplementations at the core).
- **L3** — a green, real-path suite that CI actually runs, with no
  disqualifying lying patterns found.
- **L4** — L3 plus engineered trustworthiness: deterministic design
  (fake clocks/seeded RNG, ideally lint-enforced), suppression drift
  bounded and reasoned, and coverage of the risky paths verified (by the
  mutation spot-check going red, or equivalent evidence like reviewed
  coverage data on the core module).
- **L5** — L4 plus mechanical self-verification: mutation testing
  (mutmut/Stryker/PIT/cosmic-ray) or an equivalent loop (fault-injection CI
  job, flake quarantine with tracked burn-down) wired and running.

Judgment guidance:

- One swallow-all pattern in the shared harness taints the whole suite;
  one `xfail(reason=...)` on a tracked issue taints nothing. Judge intent
  and blast radius, not raw counts.
- Environment honesty: if the suite could not run for reasons your sandbox
  controls (network installs, missing system deps), say so, lower
  confidence, and do not count it against the repo.
- Skipping the mutation check is fine and must be stated: report why
  (budget, suite too slow, couldn't get green baseline) rather than
  silently omitting it.

## Fix marking

Mark as `**Fix:**`: removing `|| true`/`continue-on-error`/swallow-all
patterns from test scripts and harnesses (cite each occurrence — expect
this may surface real red tests, which the branch reports rather than
fixes); registering bare skips with reasons where the reason is traceable
(linked issue, blame); wiring unrun test directories into CI using the
repo's existing test commands. Do NOT mark: rewriting lying tests to test
the real path (needs domain knowledge — report it), deleting tests, adding
mutation-testing infrastructure, or touching the suite's assertions.
