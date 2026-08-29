# 040 — Task Graph

> Status: ACTIVE. Depends on [010-architecture.md](010-architecture.md).

## Why this shape

Shipshape needs long-running, decomposable, resumable orchestration without a
workflow engine's setup cost. The answer is deliberately small: a JSON DAG in
the run directory, an in-process runner with a concurrency limit, and task
handlers registered by type. Agentic flexibility lives inside tasks (every
handler prompts an agent) and in the **plan step**, which emits graph nodes
within schema-validated bounds — the graph machinery itself stays dumb.

## Model

`graph/graph.json`:

```jsonc
{
  "version": 1,
  "tasks": [
    {
      "id": "assess:agents-md-quality",   // unique, stable across resume
      "type": "assess",                    // handler key
      "deps": ["recon"],                  // ids that must complete first
      "params": { "assessorId": "agents-md-quality" },
      "status": "pending",                // pending|running|done|failed|skipped
      "attempts": 0,
      "error": null,                       // last failure message
      "startedAt": null, "endedAt": null
    }
  ]
}
```

Task types (handlers live in `pipeline/`):

| type | mode | what it does |
| --- | --- | --- |
| `recon` | report | agent maps the target set → `recon/repo-map.md` + `packages.json` |
| `plan` | report | agent selects applicable assessors / shards work → emits `assess` tasks |
| `assess` | report | one assessor's steps (scan → judge) → `assessors/<id>/report.md` |
| `synthesize` | report | agent reads all assessor reports → `report.md` |
| `fix-plan` | doctor | agent reads one assessor's report+resources → emits `fix` tasks (one per branch) |
| `fix` | doctor | agent implements one branch in the target repo |
| `review` | doctor | reviewer assessor(s) adversarially review one branch |
| `revise` | doctor | fixer addresses blocking review feedback (bounded rounds) |
| `doctor-report` | doctor | agent orders branches → `doctor/review-plan.md` |

## Runner semantics

- Scheduler loop: claim any `pending` task whose deps are all `done`, up to
  the profile's `concurrency`; run handlers concurrently; persist
  `graph.json` (atomic write-rename) on every state change.
- **Dynamic expansion**: a handler may return new tasks (validated: unique
  ids, deps must reference existing or new ids, no cycles) — this is how
  `plan` and `fix-plan` shape the run agentically.
- **Failure**: a failed task retries once (fresh agent, error appended to its
  prompt). A task failing twice is marked `failed`; dependents become
  `skipped`; unrelated branches keep running. The run completes "with
  failures" and the overall report lists them — one broken assessor never
  kills a run.
- **Resume** (`--resume <run-dir>` or rerunning with the same `--out` and
  run id): reload `graph.json`, demote `running` → `pending` (crash
  recovery), re-enter the loop. Handlers are written to be idempotent:
  each task's outputs land in task-owned paths, overwritten on retry.
- **Budget stop**: if `budgets.maxUsd` is crossed, no new tasks start;
  in-flight tasks finish; the run reports partial completion.

## What this is not

No priorities, no persistence beyond the run dir, no cross-run state, no
distributed execution, no plugin system for task types. If a future need
appears, the escalation path is documented here first, with the observed
failure that justifies it.
