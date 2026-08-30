# Assessing model and cost discipline

## Why this matters

A repo with agent workflows has taken on a new dependency class — models —
that costs money per invocation and deprecates on the provider's schedule,
not the team's (one provider deprecated a model seven weeks after adding
its successor). Undisciplined usage shows up as: one frontier model
hardcoded everywhere including triage steps a cheap model handles;
model IDs pinned in a dozen scripts with no update policy; agent loops
with no attempt cap that can retry until the budget dies. Disciplined
usage looks like a studied repo's routing table: a cheap model (haiku
tier) for pre-screening, a mid model (sonnet tier) for extraction and
review, a frontier model (opus tier) for synthesis — and NO LLM where a
Python script suffices. Deterministic-where-possible is the strongest
form of this practice and deserves strong credit.

## Method — audit the workflows

Scope note: this assessor applies to repos with agent workflows or an
in-repo harness (`appliesTo: has-agent-workflows`); the planner normally
skips it otherwise. If you are run against a repo with no agent workflows
anyway, report level 1 with confidence low, note that nothing was
assessable, include no `**Fix:**` markers, and stop.

1. **Inventory model usage sites.** Search workflows (.github/workflows),
   agent configs (.claude/, agent YAML/JSON), scripts, and harness code for
   model references: exact IDs (`claude-*`, `gpt-*`, `gemini-*`,
   provider-prefixed variants), aliases (`-latest`, tier names), env-var or
   config-file indirection, and router/tier tables. Record each site
   (path:line, ID-or-alias, what task it powers) in the report or a
   resource file if the inventory is large.
2. **Judge routing by task tier.** For each usage: is the task mechanical
   (triage, labeling, formatting, pre-screening), extraction/review-shaped,
   or synthesis-shaped — and does the model match (cheap/mid/frontier)?
   One-size-frontier-for-everything is a finding; a documented routing
   table the sites actually follow is a strength. Strongest credit:
   steps that use no LLM at all where a script suffices, and evidence of
   that choice being deliberate (a deterministic step replacing an
   obvious LLM temptation).
3. **Treat pinned IDs as versioned dependencies.** Hardcoded exact model
   IDs scattered across scripts/CI/configs deprecate with little warning.
   Prefer: aliases or routing indirection, or a single source of truth for
   IDs; pinning is acceptable only WITH an update policy (a documented
   owner/cadence, or automation that flags deprecations). Cite every
   hardcoded ID with path:line.
4. **Check loop guards.** Every agent loop/invocation should carry attempt
   limits, turn caps, timeouts, and/or budget ceilings (`max_turns`,
   `--max-turns`, step timeouts, spend limits, circuit breakers). An
   unbounded agent loop in CI is the highest-severity finding here. Record
   per workflow: which caps exist, cited.
5. **Cache discipline (only where a harness is built in-repo).** Static
   context placed first in prompts, no mid-session system-prompt edits
   that bust prefix caches, cache-control usage where the SDK supports it.
   Skip silently if the repo only consumes a hosted harness.
6. **Second-provider runnability (advanced signal).** Credit only if a
   second provider/model family is both configured AND exercised (a CI job
   or documented run actually using it) — configuration alone is shelf-ware.
7. **Cost claims in dollars.** Where the repo documents cost comparisons
   or budgets, they should compare dollars (or dollars-per-result), not
   raw token counts — tokens across tiers are not comparable.

## Judging

- **L1** — no agent workflows assessable (skipped-but-run case), or model
  usage exists with zero discernible discipline: unbounded loops, no
  routing thought at all.
- **L2** — agents run with default or one-size models, no attempt/turn/
  budget caps, hardcoded IDs with no policy.
- **L3** — routing is documented and mostly followed: a tier table or
  equivalent exists, usage sites match it, loops have at least ad-hoc
  caps, pinned IDs are few or centralized.
- **L4** — caps, aliases, and budgets are mechanically enforced in the
  workflows themselves: turn/attempt caps on every loop, IDs via alias or
  single source, budget ceilings configured — not dependent on authors
  remembering.
- **L5** — cost is measured per accepted result and routing is revisited
  on model upgrades, with evidence (cost dashboards/logs in repo,
  routing-table changes traceable to model releases).

Judgment guidance: weight by spend exposure — an unbounded loop in a
per-PR CI workflow outweighs a hardcoded ID in a rarely-run script. Credit
deterministic-where-possible strongly, even when the rest is rough. Every
claim cites path:line.

## Fix marking

Mark as `**Fix:**`: adding a turn cap/attempt limit/timeout to a specific
workflow agent invocation (cite the exact lines; use the invocation
mechanism's documented parameter); replacing a hardcoded model ID with an
alias where the platform documentably supports that alias (cite the line
and the alias source). Do NOT mark: choosing different models for the
team's tasks, restructuring workflows, adding cost measurement, or any
change to what the agents actually do — those are report-only.
