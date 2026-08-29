# Assessing code-quality linters and doc restatement

## Why this matters

Style is deterministic work, and deterministic work belongs to deterministic
tools. A linter rule enforces at ~100% and costs zero context; the same rule
as prose enforces at ~70-80% and taxes every session that loads the doc.
Measured in studied repos: LLM-written agent docs restating lintable rules
cost >20% more inference and reduced task success. So this assessor checks
two things that must both hold: the tools exist with *real* strictness and
are *enforced* (installed-but-optional is decoration), and the prose has
been *relieved of duty* — the agent doc carries only judgment calls a linter
cannot make.

## Evidence to gather (scan step)

1. **Per-language tool inventory.** For each language in the repo, find the
   linter, formatter, and type-checker configs (ruff/flake8 + black/ruff
   format + mypy/pyright; eslint + prettier/biome + tsc; clippy + rustfmt;
   golangci-lint + gofmt; etc.). Record tool, config path, and version
   pinning in `resources/linter-inventory.md`.
2. **Assess strictness, not presence.** Read each config: is mypy in strict
   mode or default-permissive? Does eslint enable type-aware rules or just
   recommended? Is `noImplicitAny`/`strict` on in tsconfig? Are large rule
   families disabled wholesale? Record the strictness posture per tool with
   the specific settings cited — "eslint exists" and "eslint with
   strict-type-checked" are different findings. Note whether typecheck
   coverage includes tests (excluded test dirs in mypy/tsconfig are a
   common gap — cite the exclude lines).
3. **Check enforcement.** For each tool: is it run by CI (cite the workflow
   step), by a hook (cite the hook config), both, or neither? A configured
   tool no automation runs is "installed, unenforced".
4. **Hunt doc restatement.** Read the agent docs and CONTRIBUTING; classify
   each style/quality rule (up to `maxDocRulesToClassify`) as either
   (a) enforced by a configured linter rule — a restatement finding, cite
   both the doc line and the linter rule; (b) lintable but not currently
   enforced — candidate for tool config, not prose; or (c) a genuine
   judgment call no tool can decide (naming intent, when to abstract) —
   correctly prose. Save the table to `resources/doc-restatement.md`.
5. **Check override hygiene.** Sample the suppressions and config overrides
   (per-file ignores, mypy overrides sections, eslint rule-offs): do they
   carry rationale comments? A studied repo justified every mypy override
   inline — that is a strength worth citing. Unexplained blanket overrides
   are findings. (Suppression *counting across the codebase* belongs to
   test-trustworthiness; here you judge the configs.)
6. **Look for evolution.** Evidence the lint set is maintained: suppression
   audits, rules added with incident rationale in history, scheduled
   config-review notes.

## Judging

- **L1** — no linters, formatters, or type-checkers configured for the
  repo's languages.
- **L2** — tools installed but not relied on: unenforced (no CI/hook runs
  them), or configured so permissively they decide nothing, for one or more
  primary languages.
- **L3** — tools configured with meaningful strictness and enforced in CI
  for every primary language.
- **L4** — enforced both pre-commit AND in CI, and the prose has been
  relieved: agent docs do not restate rules the linters enforce (findings in
  category (a) above are zero or trivial), and overrides carry rationale.
- **L5** — L4 plus the lint set evolves: periodic suppression audits, new
  rules added from incidents with traceable rationale, strictness ratcheted
  over time (visible in history or documented cadence).

Judgment guidance:

- Judge per primary language and report the weakest: a strict Python setup
  does not excuse an unlinted TypeScript sub-app.
- Respect deliberate laxity that is *documented with rationale* (e.g. a
  config comment explaining why a rule family is off) — cite it as a
  strength of hygiene even while noting the posture.
- Every restatement finding needs both citations: the doc line and the
  linter rule that makes it redundant.

## Fix marking

Mark as `**Fix:**`: wiring an already-configured tool into CI or hooks where
repo intent is clear (formatter configured but never checked); removing
doc lines that restate rules a configured linter enforces (cite the rule per
removed line); adding rationale comments to unexplained suppressions ONLY
where the rationale is discoverable from history or context — otherwise flag
for the team. Do NOT mark: imposing new style policy, adding tools the repo
hasn't adopted, raising strictness levels (strictness is the team's call —
report it, don't change it).
