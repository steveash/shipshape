# Assessing CI agent safety

## Why this matters

An agent workflow in CI is an internet-facing program that accepts natural
language from strangers and holds a repository token. The failure modes are
concrete and mostly mechanical to prevent: a comment body interpolated
straight into a prompt is prompt injection by design; an unscoped write
token turns injection into damage; an uncapped retry loop in a real harness
wasted ~250K API calls/day before `MAX_CONSECUTIVE_FAILURES=3` was added;
a studied repo's `cancel-in-progress: true` silently killed 53 of 54 review
runs before the setting was flipped with a documented rationale. None of
these are fixed by better prompts — they are workflow settings, and this
assessor checks the settings.

## Scope check first

Identify the agent surfaces: workflows invoking agent actions
(anthropics/claude-code-action and similar, OpenAI/Copilot agent steps,
custom scripts calling LLM APIs), scheduled agent jobs, bot-triggered
automation, and harness configs those workflows load. If the repo has NO
agent workflows, the planner normally skips this assessor; if you run
anyway, score the absence honestly: report level 1 with a clear note that
nothing is assessable, confidence low, and zero opportunities marked
`**Fix:**` — readiness cannot be judged from absence, and L1 must not read
as "unsafe", only "nothing present to assess".

## Evidence to gather (judge step)

Inventory every agent workflow in `resources/workflow-inventory.md`, then
check each against this list, citing workflow file and line for every
finding:

1. **Prompt injection surface.** Grep workflows for raw event-payload
   interpolation into prompt/args contexts: `${{ github.event.comment.body }}`,
   `.issue.body`, `.issue.title`, `.pull_request.body`, review bodies,
   commit messages — anywhere these land inside a `prompt:`, `override_prompt`,
   `args`, or an inline `run:` that builds an agent instruction. Safe
   patterns: routing through `env:` indirection (the value enters as an
   environment variable the shell/action reads, never spliced into the
   instruction text) or explicit sanitization. Raw interpolation is the
   headline finding.
2. **Token scope discipline.** Check `permissions:` blocks per workflow/job
   (least privilege, write only where the job writes), whether read and
   write tokens are split by direction, and whether any job assumes
   cross-repo access on the default GITHUB_TOKEN — which is repo-scoped and
   fails silently empty on cross-repo reads, a documented footgun that
   produces wrong agent behavior rather than an error. PATs/app tokens in
   secrets: note their apparent scope from usage.
3. **Attempt caps and circuit breakers.** Every agent invocation should
   carry a turn cap (`max-turns` or equivalent) and every job a
   `timeout-minutes`; loops that retry or self-trigger need a
   consecutive-failure breaker — count consecutive, not total, failures
   (total-count breakers trip on healthy busy systems and miss death
   spirals with occasional successes). Absence of caps on an agent loop is
   a high-severity finding.
4. **Concurrency with rationale.** `concurrency:` groups present where
   events can pile up; `cancel-in-progress` chosen deliberately — for agent
   review runs, cancellation can kill nearly every run (53/54 in the
   studied repo). Either setting is defensible; what earns credit is a
   comment/doc stating why.
5. **Budget ceilings.** Spend limits, per-run token/cost caps, or scheduled
   spend monitoring where the platform offers them; a cost-relevant cap
   encoded anywhere (env var, action input, org policy referenced in docs).
6. **Rollout discipline for blocking gates.** An agent check that can block
   merges: was it rolled out shadow-first (non-blocking, observed, then
   promoted — visible in history or documented)? A blocking agent gate with
   no shadow phase is a finding.
7. **Model IDs as versioned dependencies.** Hardcoded pinned model IDs in
   workflows go stale and eventually retire; prefer aliases or a single
   routing point. Note pinned IDs and whether any single place owns the
   choice.
8. **Sandbox/resource limits** where agents execute untrusted or generated
   code: containerized/sandboxed execution, network egress policy, runner
   isolation for fork PRs (`pull_request_target` with checkout of the fork
   head + agent execution is a critical pattern to flag).

## Judging

- **L1** — agent automation exists with none of the protections above
  (or: no agent workflows at all — report L1 with the nothing-assessable
  note, confidence low, no Fix-marked findings).
- **L2** — some protections present but critical gaps remain: raw payload
  interpolation, unscoped write tokens, or uncapped loops in any workflow.
- **L3** — workflows are safe by review: no injection paths, sane scopes,
  caps present — but safety rests on the current authors' habits rather
  than mechanical guarantees.
- **L4** — safety is mechanical and uniform: pinned actions (SHA-pinned),
  least-privilege `permissions:` everywhere, caps and timeouts on every
  agent job, concurrency and budget settings deliberate, env-indirection
  the established pattern.
- **L5** — measured and rehearsed: injection-attempt tests or red-team
  fixtures in CI, budget/failure alarms wired to a channel, shadow-first
  rollout documented as the standing procedure, model/action versions
  reviewed on a cadence.

Judgment guidance:

- Severity ordering: injection into a write-capable workflow > unscoped
  tokens > missing caps > missing rationale. Lead the report with the worst.
- Judge the workflows the repo has, not the ones it could have: a repo with
  one small, well-capped scheduled agent job can be L4.
- Every finding cites the workflow path and line of the risky expression or
  the missing setting's location.

## Fix marking

Mark as `**Fix:**`: adding `max-turns`/`timeout-minutes` to specific agent
jobs (cite the workflow lines); converting a raw `${{ github.event.* }}`
interpolation to env indirection (cite the exact expression and its line);
tightening a `permissions:` block to what the job's steps actually use
(enumerate the uses in the finding); adding a `concurrency:` group with a
rationale comment where runs demonstrably pile up. Do NOT mark: inventing
budget infrastructure the platform doesn't offer, changing which model a
workflow uses, promoting/demoting a gate between shadow and blocking, or
any fix in a repo with no agent workflows.
