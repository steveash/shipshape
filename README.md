# shipshape

Shipshape scans code repositories and assesses how well they follow **agentic
engineering best practices** — the practices that make a codebase easy and
safe for AI agents (and the humans steering them) to work in. It produces a
maturity report with concrete, cited findings, and can then stage
adversarially-reviewed fix branches for humans to merge.

The unit of opinion is the **assessor**: one best practice, with its own
evidence-gathering instructions, an L1–L5 maturity rubric, and optional fix
instructions. A **profile** configures a set of assessors, maps model tiers
to concrete models (cost posture), and injects team conventions. Everything
judgment-shaped runs as a Claude Agent SDK agent; the CLI provides
orchestration, validation, and guardrails.

## Quickstart

```bash
npm install
npm run build

# Assess a repo (read-only) with the balanced profile:
node dist/cli.js report /path/to/repo -o ./shipshape-out

# Read the overall report:
#   ./shipshape-out/<run-id>/report.md          (start here)
#   ./shipshape-out/<run-id>/assessors/<id>/    (per-assessor deep dives)

# Stage reviewed fix branches from that run (local branches only, never pushed):
node dist/cli.js doctor ./shipshape-out/<run-id>
#   ./shipshape-out/<run-id>/doctor/review-plan.md tells you what to review first
```

Requires Node >= 20 and a working Claude Code / `ANTHROPIC_API_KEY`
environment (agents run through the Claude Agent SDK). Runs cost real money:
observed on a mid-size repo, a full 25-assessor `cheap` run ≈ $50 and ~100
minutes (≈ $0.50-2 per assessor), a bounded doctor run (2 assessors, 4
branches with adversarial review) ≈ $13. Start with `--dry-run`, a single
`--assessor`, or a `budgets.maxUsd` ceiling in your profile.

Useful variants:

```bash
node dist/cli.js report a/ b/ c/ --meta a/          # multi-package + meta-repo
node dist/cli.js report repo/ -c team-conventions.md # steer all assessors
node dist/cli.js report repo/ -a agents-md-quality   # single assessor
node dist/cli.js report repo/ --resume <run-dir>     # resume an interrupted run
node dist/cli.js list-assessors
node dist/cli.js validate my-profile.yaml            # + prints trust surface
```

## Documentation

- [docs/specs/000-overview.md](docs/specs/000-overview.md) — the ordered
  design specs (concepts, contracts, both pipelines, the assessor catalog).
- [ARCHITECTURE.md](ARCHITECTURE.md) — code layout and key decisions.
- [AGENTS.md](AGENTS.md) — how agents (and humans) work in this repo.
- [docs/dev-process.md](docs/dev-process.md) — local dev + review process.

## Developing

```bash
npm install
./scripts/install-hooks.sh   # pre-commit runs the gate
./scripts/gate.sh            # format+lint (auto-fix), typecheck, tests
```

CI runs `./scripts/gate.sh --check` — the same script, so local green means
CI green. Before a PR, run the local reviewer agents (see
[docs/dev-process.md](docs/dev-process.md)).

## Trust model

Assessor definitions and conventions files are prompts with repo access:
review third-party ones like you review CI config. `shipshape validate`
prints which assessors request command execution or can stage fixes. Report
mode is read-only on targets and verifies that with git; doctor mode writes
only `shipshape/*` branches via dedicated worktrees and never pushes.
