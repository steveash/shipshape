# Assessing commit and harness hooks

## Why this matters

A documented process that depends on someone remembering it degrades — for
agents, predictably: prose-rule compliance measures at ~70-80% and drops
after context compaction. Hooks make the process mechanical. The reliability
hierarchy to keep in mind while judging: settings-permissions and blocking
hooks enforce at ~100%; CI at 100% but post-hoc (the bad commit already
exists); advisory prose at ~70-80%. One measured harness pattern: compliance
with prose rules at ~60-80% jumped to 90%+ once the same rules became
blocking hooks. The two classic failure modes are the *uninstalled* hook (a
`.pre-commit-config.yaml` with no install step is decoration) and the
*subset* hook (a pre-commit that runs less than the real gate, so passing it
proves nothing).

## Evidence to gather (scan step)

1. **Inventory hook machinery.** Find every hook system present:
   `.pre-commit-config.yaml`, husky (`.husky/`, `prepare` script), lefthook
   (`lefthook.yml`), a committed `.githooks/` (or similar) directory with a
   `core.hooksPath` setup step, commit-msg validators (commitlint,
   conventional-commit checkers), pre-push hooks. Record each hook, the
   event it binds, and the exact commands it runs, in
   `resources/hook-inventory.md`.
2. **Check installation reality.** For each hook system: is installation
   documented in the setup docs (README/CONTRIBUTING/AGENTS.md — cite the
   line), or automated (husky `prepare`, a bootstrap/setup script that runs
   `pre-commit install` or sets `core.hooksPath`, a devcontainer/direnv step)?
   A config with neither is a finding: it enforces nothing for a fresh
   clone. Distinguish "documented install step" from "bootstrapped
   automatically" — they land at different levels.
3. **Compare hook content to the documented process.** Diff what the hooks
   run against the gate/commands the docs and CI prescribe (coordinate with
   the gate inventory if the recon summary has one). A pre-commit running
   only whitespace fixers while the documented gate is lint+typecheck+test
   is a subset hook — a finding. Note deliberate, reasonable scoping (e.g.
   slow tests moved to pre-push or CI) as acceptable when the split is
   itself documented.
4. **Harness-level hooks.** Where a Claude-style harness exists
   (`.claude/settings.json`, `.claude/hooks/`), inventory harness hooks:
   PreToolUse blockers for destructive or forbidden commands, Stop hooks
   scanning for TODO/FIXME stubs, PostToolUse formatters. Record whether
   each is blocking or advisory, and which documented rule it enforces.
   Absence of harness hooks is only a finding if a harness config exists at
   all — do not demand a harness.
5. **Look for evolution.** Hooks whose commit history or comments tie them
   to past incidents ("added after X broke prod"), or an audit cadence for
   the hook set, are L5 evidence.

## Judging

- **L1** — no hooks of any kind: no git-hook config, no harness hooks, no
  commit-msg validation.
- **L2** — hook configs exist but cannot be relied on: no install path
  (documented or automated), hooks that run a token subset of the documented
  process, or hooks visibly broken/stale.
- **L3** — hooks are documented and installable, and what they run covers
  the documented process (or a documented, deliberate split of it).
- **L4** — hooks are blocking and bootstrapped automatically: the install
  happens as a side effect of documented setup (husky prepare, setup script,
  committed hooksPath wiring), so a fresh clone that follows the docs is
  enforced without a separate remembering step. Harness hooks, where a
  harness exists, block rather than advise.
- **L5** — L4 plus the hook set evolves: hooks encoding past failure modes
  with traceable rationale, or an audit cadence (scheduled review, drift
  check between hook content and the gate) keeping the set current.

Judgment guidance:

- Enforcement placement over volume: one blocking pre-commit running the
  real gate outranks five advisory hooks.
- Installation is the crux — always answer "would a fresh clone following
  the docs end up enforced?" and cite the chain of files that makes it so.
- Do not penalize a repo for choosing CI-only enforcement *if* that choice
  is deliberate and the CI gate is complete; note it as a trade-off (post-hoc
  vs pre-commit) rather than an absence.

## Fix marking

Mark as `**Fix:**`: adding a pre-commit config that wires the repo's
EXISTING linters/gate script (cite each tool's existing config); adding the
hook-install step to the documented setup path or an existing bootstrap
script; adding a commit-msg or pre-push hook that enforces a rule the repo
already documents (cite the prose rule). Do NOT mark: hooks enforcing rules
the repo doesn't document anywhere, new lint tooling, or restructuring the
gate itself (that belongs to quality-gate-parity).
