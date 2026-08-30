# Assessing development environment docs

## Why this matters

An autonomous agent cannot ask a teammate what the docs forgot. It reads
setup/build/test/run/debug instructions and executes them literally, so
gaps that a human papers over become hard failures: a repo we studied had
a README that invoked its console script with no install step documented
anywhere — every agent following it verbatim got command-not-found on
line one. Monorepos add a second failure mode (a blanket "run npm test"
when packages need different commands) and doc sprawl adds a third (the
same operation documented three ways with different paths, so the agent
must guess which is current).

Scope note: this assessor READS AND CROSS-CHECKS the docs against the
repo's scripts and config; it never executes them. Runtime verification —
actually running the documented sequence in a scratch copy — belongs to
the `build-test-locally` assessor. Say this explicitly in your report and
cross-reference that assessor, so overlapping findings are attributed
correctly.

## Evidence to gather (scan step)

1. **Map the documented dev loop.** From README, CONTRIBUTING,
   AGENTS.md/CLAUDE.md, docs/development*, and any doc they route to,
   extract every setup, build, test, run, and debug instruction, with the
   doc path and line for each. Record the consolidated matrix in
   `resources/documented-commands.md`, and note which of the five
   operations (setup/build/test/run/debug) have no documentation at all.
2. **Check install-before-use ordering.** For each quickstart or command
   sequence: does an install/setup step appear before the first command
   that requires it? A doc invoking a project-provided binary, console
   script, or task runner with no install step documented anywhere in the
   repo is a finding — cite the doc line and, if the knowledge exists
   elsewhere in-repo (a CI workflow that installs, a Dockerfile, another
   doc), cite that too as the fix source.
3. **Cross-check commands against reality (statically).** For up to
   `maxCommandsToCheck` documented commands, verify each against the
   repo's config: does the script exist in package.json / Makefile /
   pyproject / justfile? Do referenced paths, env files, and config files
   exist? Do documented flags match what the tool's config declares?
   Record per-command status in `resources/command-check.json`.
4. **Check cross-doc consistency.** Where the same operation is
   documented in more than one place, diff the commands. Same operation,
   different commands or paths, no statement of which is canonical — that
   is a finding with all locations cited.
5. **Check monorepo coverage.** If a workspace exists (read the workspace
   config for the real package list), do the docs provide a per-package
   command matrix where commands differ, or route to per-package docs
   that do? A blanket command that is wrong for some packages is a
   finding naming those packages.
6. **Check gate consolidation and protection.** Is there one documented
   gate command (script/make target) that runs the full local check set,
   and does CI invoke the same artifact? Is the quickstart smoke-tested
   from a clean checkout anywhere (CI job, scheduled workflow)?

## Judging

- **L1** — no development documentation: an agent finds no committed
  instructions for setup, build, or test.
- **L2** — docs exist but an autonomous agent following them verbatim
  gets stuck: missing install step before quickstart commands,
  contradictory commands across docs with no canonical source, blanket
  monorepo commands wrong for some packages, or documented commands that
  do not match the repo's actual scripts.
- **L3** — the dev loop is documented completely and consistently:
  setup→build→test→run all present in order, commands match the repo's
  scripts/config, cross-doc statements agree (or one is marked
  canonical), and per-package differences are documented where they
  exist. Debug guidance present where the repo plausibly needs it.
- **L4** — L3 plus a single documented gate command shared with CI: docs
  and CI invoke the same script/target, so the documented loop and the
  enforced loop cannot drift.
- **L5** — L4 plus a feedback loop: the quickstart is smoke-tested from a
  clean checkout on a cadence (scheduled CI or an agent job), so
  setup-instruction rot is caught mechanically rather than by the next
  stuck newcomer.

Judgment guidance:

- Weight consistency and the shared gate over prose volume: a 30-line
  README whose four commands all match package.json and CI outranks a
  wiki-sized guide with three contradictory test invocations.
- This assessor cannot claim a command "works" — only that it is
  documented, ordered, consistent, and matches config. Phrase findings
  accordingly and defer runtime claims to `build-test-locally`.
- Cite paths and lines for everything: the quickstart line missing its
  install step, each location of a contradictory command, the packages a
  blanket command fails to cover.

## Fix marking

Mark as `**Fix:**` findings like: add the missing install/setup step to
the entry-point doc, citing where in the repo the knowledge already
exists (CI workflow, Dockerfile, another doc) — never invent an install
procedure the repo doesn't evidence; reconcile contradictory command
docs onto the one that matches the repo's config, marking it canonical
and pointing the others at it; add a per-package command matrix built
from the packages' own manifests; fix documented commands that don't
match the actual script names. Do NOT mark: creating gate scripts or CI
jobs (that is enforcement-category work), or documenting debug workflows
that require team knowledge the repo doesn't contain.
