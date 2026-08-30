# Local development and review process

This is the documented workflow for humans and agents working on shipshape.
It exists so an autonomous agent can pick up a feature or bugfix without
asking anyone how the repo works.

## Setup

```
npm install          # Node >= 20
```

## The loop

1. **Orient**: read [AGENTS.md](../AGENTS.md), then the spec that owns your
   area ([docs/specs/000-overview.md](specs/000-overview.md) is the index).
2. **Spec first for contract changes**: anything touching the assessor
   report format, profile schema, task-graph semantics, or CLI surface gets
   its spec updated in the same change (specs are the source of truth; code
   follows).
3. **Implement** with tests. Deterministic logic (loaders, graph, parsing,
   validation) is unit-tested in `tests/`. Never write a test that calls the
   Claude Agent SDK.
4. **Gate**: `./scripts/gate.sh` — auto-fixes format/lint, then typechecks
   and tests. The pre-commit hook runs the check variant; CI runs the same
   script with `--check`.
5. **Local review before any PR**: run the reviewer agents in
   [.claude/agents/](../.claude/agents/) against your diff:
   - fast pass: `arch-reviewer` (layering, contract drift, spec parity)
   - thorough pass: add `prompt-reviewer` when you touched anything under
     `assessors/`, `profiles/`, or `src/pipeline/prompts.ts`
   Address blocking feedback before pushing; reviewers verify claims, they
   do not rubber-stamp.

## Agent-run smoke test (costs money — deliberate, not CI)

Unit tests cannot exercise real agent behavior. After engine or assessor
changes, run the cheap smoke:

```
npm run build
node dist/cli.js report <some-small-repo> --profile cheap \
  --assessor agents-md-quality -o /tmp/shipshape-smoke
```

Verify: run completes, `assessors/agents-md-quality/report.md` passes
validation (the run fails loudly if not), findings cite real paths. For
doctor-mode changes, follow with `node dist/cli.js doctor <run-dir>` against
a scratch clone and confirm branches + review-plan.md appear and the target's
working tree is untouched.

## Conventions

- Conventional-ish commits: `feat(core): …`, `fix(doctor): …`, explaining
  *why* in the body when it isn't obvious.
- Keep diffs scoped; assessor prompt edits and engine edits travel in
  separate commits.
- Update docs in the same commit as the behavior they describe.

## Task handoff

This is a starting point, not settled team policy — extend it as real
multi-session work exposes gaps.

If a change is going to span more than one session, write a plan file at
`docs/plans/<slug>.md` describing the goal and remaining steps, and
reference it by name in the commit/PR (same convention as above:
docs/dev-process.md:52-55). Before ending a session with unfinished work,
append a dated note to the plan file's log section (or the commit body, per
the same convention) saying what was done and what's left — so the next
session, whoever runs it, doesn't have to re-derive it from the diff alone.
