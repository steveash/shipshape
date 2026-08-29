# AGENTS.md — working in shipshape

Shipshape is a TypeScript CLI that assesses repositories against agentic
engineering best practices and stages fixes. You are expected to follow the
practices this tool preaches — it is run against itself.

## The quality gate — run this before you finish

```
./scripts/gate.sh
```

Single source of truth: dev mode auto-fixes formatting/lint, CI runs the same
script with `--check`. If it passes locally, CI passes. Never commit without
a green gate. Never weaken a check to get green.

## Hard rules

- NEVER edit files under `dist/` (generated) or `node_modules/`.
- NEVER add TypeScript to `assessors/` or `profiles/` — they are data-only
  (prompts + yaml). Engine behavior belongs in `src/`.
- Layering is lint-enforced: `cli → pipeline → core`; `core` imports neither.
  Do not add `eslint-disable` for the boundary rules; change the design
  instead.
- Assessor output/report formats are a contract
  ([docs/specs/020-assessor-contract.md](docs/specs/020-assessor-contract.md)).
  Changing a contract means updating the spec, the zod schema in
  `src/core/reportio.ts` or `src/core/config.ts`, and the tests, in the same
  change.
- Real agent runs cost money. Tests must never call the Claude Agent SDK;
  everything deterministic is unit-tested, agent behavior is validated via
  the manual smoke flow in
  [docs/dev-process.md](docs/dev-process.md).

## Orientation

- Specs (ordered, start at 000): [docs/specs/000-overview.md](docs/specs/000-overview.md)
- Architecture and layout: [ARCHITECTURE.md](ARCHITECTURE.md)
- Local dev + review process: [docs/dev-process.md](docs/dev-process.md)
- Reviewer agents for pre-PR review: [.claude/agents/](.claude/agents/)

## Surgical rules (mistakes agents actually make here)

- `zod` here is v4: `z.record(keySchema, valueSchema)` needs both args;
  `error.issues` not `error.errors`.
- ESM with `NodeNext`: relative imports need explicit `.js` extensions.
- The vitest reporter is `dot` on purpose (context economy); use
  `npx vitest run --reporter=verbose <file>` only when debugging a failure.
- Shipped assessor/profile data is validated by
  `tests/data-validation.test.ts`; adding an assessor means it must load
  cleanly there (and every fixable category needs a reviewer).
