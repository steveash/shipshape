# 030 — Profiles and Steering

> Status: ACTIVE. Depends on [020-assessor-contract.md](020-assessor-contract.md).

## What a profile is

A profile is a YAML file that turns the assessor library into a runnable
configuration: which assessors, with what config, on which models, steered by
which conventions. Shipshape ships three (`profiles/cheap.yaml`,
`profiles/balanced.yaml`, `profiles/thorough.yaml`); teams write their own,
typically starting with `extends`.

## Schema

```yaml
name: acme-backend
extends: balanced            # optional: a shipped profile name or a path;
                             # single inheritance, child keys win, assessor
                             # entries merge by id (config maps deep-merge)

provider:                    # optional; default {type: anthropic}
  type: bedrock              # anthropic | bedrock
  region: us-east-1          # -> AWS_REGION (omit to use ambient AWS config)
  baseUrl: https://…         # -> ANTHROPIC_BEDROCK_BASE_URL (gateway/VPC endpoint)
  regionPrefix: global       # -> ANTHROPIC_BEDROCK_REGION_PREFIX
  serviceTier: priority      # -> ANTHROPIC_BEDROCK_SERVICE_TIER
  env:                       # extra runtime env; keys restricted to the
    AWS_PROFILE: team        # AWS_/ANTHROPIC_/CLAUDE_CODE_ namespaces so a
                             # shared profile cannot inject arbitrary env
                             # (PATH, NODE_OPTIONS, …). Model pins
                             # (ANTHROPIC_DEFAULT_*_MODEL) go here.

models:                      # tier -> model id (or alias). Missing tiers
  scan: claude-haiku-4-5     # inherit from the extended profile.
  judge: claude-sonnet-4-5
  synthesize: claude-opus-4-5
  fix: claude-sonnet-4-5
  review: claude-opus-4-5

concurrency: 4               # max parallel agent tasks
budgets:
  maxTurnsPerTask: 50        # hard cap passed to every agent
  maxUsd: null               # optional run-level soft ceiling: when the cost
                             # ledger crosses it, no NEW tasks start

assessorDirs:                # extra places to find assessor definitions
  - ./team-assessors         # (relative to the profile file)

conventions:                 # md files injected into every agent's context
  - ./team-conventions.md

assessors:                   # the run set. With `extends`, entries here
  - id: agents-md-quality    #   override/add to the parent's list.
    config:                  # deep-merged over assessor defaultConfig
      maxAgentDocLines: 400
  - id: build-test-locally
    enabled: true            # set false to drop an inherited assessor
  - id: acme-service-tiers   # a team assessor from assessorDirs
```

Validation (`shipshape validate <profile>`) checks: every id resolves, every
referenced file exists, tier names are known, config keys are declared by the
assessor's `defaultConfig` (unknown keys warn), and it prints which assessors
request execution (`needsExecution`) or can write in doctor mode — the
review-before-trust surface for third-party assessors.

## The three shipped profiles

All three run the full default assessor library (completeness of the report is
the product; cost posture is expressed through models and depth):

| | cheap | balanced | thorough |
| --- | --- | --- | --- |
| scan | haiku | haiku | sonnet |
| judge | sonnet | sonnet | opus |
| synthesize | sonnet | opus | opus |
| fix | sonnet | sonnet | opus |
| review | sonnet | opus | opus |
| depth config | spot-check samples small | default | larger samples, extra verification passes |

Model ids in shipped profiles use Claude aliases (e.g. `haiku`, `sonnet`,
`opus`) rather than pinned versions, per the "model identifiers are versioned
dependencies" practice; teams may pin in their own profiles.

## Providers (Anthropic API vs Amazon Bedrock)

Agents run through the Claude Code runtime, which supports multiple
endpoints; shipshape selects one per profile via the `provider` block (or the
`--bedrock` CLI shortcut, which flips `provider.type` on any profile) and
configures it purely through the runtime's documented environment surface —
`CLAUDE_CODE_USE_BEDROCK`, `AWS_REGION`, `ANTHROPIC_BEDROCK_BASE_URL`, etc.
Shipshape never handles AWS credentials: they come from the invoking
environment (AWS profile/SSO, access keys, or `AWS_BEARER_TOKEN_BEDROCK`),
exactly as for any AWS tool.

Because model aliases resolve per provider (on Bedrock they map to the
runtime's built-in inference-profile defaults, overridable with
`ANTHROPIC_DEFAULT_*_MODEL` pins in `provider.env`), the shipped profiles work
unchanged on Bedrock; `examples/bedrock-profile.example.yaml` shows the
recommended team setup with pinning. Since costs on Bedrock are billed by AWS
at partner rates, treat the cost ledger's USD figures as estimates priced at
Anthropic list rates.

`provider.env` is part of the trust surface: `shipshape validate` prints the
keys a profile sets, and keys are restricted to the AWS_/ANTHROPIC_/
CLAUDE_CODE_ namespaces so a shared profile cannot inject arbitrary
environment into the agent runtime.

## Team conventions steering

Conventions files are markdown, injected verbatim into every agent (planner,
assessors, synthesizer, fixers, reviewers) under a "Team conventions" heading,
after the assessor's own instructions. Structure:

- Top-level prose applies to all agents.
- A `## assessor:<id>` section applies only to that assessor (others never see
  it) — e.g. `## assessor:architecture-linters` might name the team's blessed
  dependency-rule tool.
- Conventions may recalibrate judgment ("we deliberately keep specs in
  Notion; do not penalize missing in-repo specs — instead check the export
  under docs/notion/") but cannot change output contracts, disable
  validation, or grant tools; shipshape's wrapper prompt states this
  precedence explicitly, and conventions are labeled as steering, not as
  instructions that override the assessor contract.

## Model tiers in assessors

Assessor steps name tiers, never models. Guidance for authors:

- `scan` — inventory, extraction, link checking, sampling; cheap and wide.
- `judge` — the maturity verdict and findings; the assessor's core reasoning.
- `synthesize` — cross-assessor work (overall report); planner also runs here.
- `fix` — doctor-mode implementation work.
- `review` — adversarial review of fixes.

An assessor that wants a cheap wide pass plus an expensive narrow pass runs
two steps (`scan` then `judge`) with the scan writing intermediate results to
its resources directory for the judge step to read.
