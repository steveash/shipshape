# Assessing: can an agent actually build and test this from the docs?

## Why this matters

Docs that claim `npm test` works are a hypothesis; this assessor runs the
experiment. Whatever breaks for you here breaks for every agent asked to fix
a bug in this repo, and for every new human. Measured industry experience:
before agents help, the harness must run lint, format, typecheck, and tests
as documented, discoverable commands.

## Method — follow the docs literally

1. **Make a scratch copy.** Copy the target package(s) into your own
   `resources/scratch/` directory (exclude .git and heavy artifact dirs like
   node_modules if present; use `cp -r` or `rsync`). ALL execution happens in
   the scratch copy. Never run build/test commands inside the real target
   path. Never modify the real target.
2. **Read like a newcomer.** Start from README/AGENTS.md/CONTRIBUTING — the
   documented entry points only. Write down, before running anything, the
   exact setup/build/test/lint command sequence the docs prescribe, with the
   doc path each command came from (`resources/documented-commands.md`). Note
   ambiguities and contradictions between docs (two files prescribing
   different commands is itself a finding).
3. **Execute the sequence** in order, in the scratch copy, within the
   `maxMinutes` budget. For each command record: source doc, exact command,
   exit status, wall time, and — on failure — the error and what
   undocumented knowledge would have been needed (a missing `uv sync`, an
   env var, a system dependency). Log to `resources/execution-log.md`. If a
   step fails, apply the obvious missing step ONLY if some doc elsewhere in
   the repo mentions it (cite it), and record that the entry-point doc lacks
   it. Do not debug beyond that: undocumented fixes you'd have to invent are
   exactly the finding.
4. **Check gate parity where cheap:** if a CI workflow exists, compare the
   commands CI runs to what the docs told you (drift = finding; parity via a
   single shared script = strength).
5. Large test suites: run the documented default test command; if the docs
   offer a fast subset, prefer it and say so. Kill anything exceeding the
   remaining time budget and record the timeout honestly (a suite too slow
   to run is a different finding from a broken one).

## Judging

- **L1** — no documented way to build or test; or the documented commands
  fail at step one for a reason the repo controls.
- **L2** — a determined reader succeeds, but only with undocumented
  knowledge (missing install step, missing prerequisite, wrong paths) or by
  resolving contradictions between docs.
- **L3** — the documented sequence works end-to-end as written; lint/
  format/typecheck/test all discoverable and runnable.
- **L4** — L3 plus a single-source gate: one documented command runs the
  full check set, and CI runs the same artifact so local and CI cannot
  drift.
- **L5** — L4 plus the loop guards itself: e.g. CI smoke-checks the
  quickstart from a clean checkout, or a scheduled job catches
  setup-instruction rot.

Environment honesty: if a failure is plausibly caused by YOUR sandbox
(no network for installs when `allowNetworkInstalls` is false, missing
system-level toolchains like Docker), say so explicitly, mark confidence
accordingly, and do not count it against the repo. A missing documented
prerequisite is the repo's finding; a sandbox limitation is not.

## Fix marking

Mark as `**Fix:**`: adding the missing setup step to the entry-point doc
(citing where you learned it); reconciling contradictory command docs;
extracting a single gate script from existing CI steps and pointing docs and
CI at it. Do NOT mark: fixing the build itself, or inventing infrastructure
the repo doesn't have.
