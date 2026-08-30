# 060 — Doctor Mode

> Status: ACTIVE. Depends on [050-report-mode.md](050-report-mode.md).

```
shipshape doctor <run-dir> [--assessor id]... [--max-branches n] [--resume]
```

Doctor mode takes a completed report run and turns its `**Fix:**`-marked
findings into reviewed, locally-staged git branches plus a human review plan.
It never pushes, never opens PRs, never commits to existing branches.

## Pipeline

```
fix-plan:<assessor> (fan-out) ──> fix:<branch> ──> review:<branch> ──> [revise] ──> doctor-report
```

### 1. Fix planning (tier: judge)

Per assessor whose report has `fixable: true`: an agent re-reads **its own**
`report.md` and `resources/`, plus the current repo state (the repo may have
moved since the report — findings that no longer apply are dropped with a
note). It emits `fix` tasks: one per coherent, independently-reviewable
branch, each with: branch slug, the finding numbers it addresses, a change
plan, an effort/impact estimate, and dependencies on other planned branches
(e.g. "create ARCHITECTURE.md" before "reference it from AGENTS.md" — the
graph serializes dependent fixes so later branches build on earlier ones'
branch points where declared).

### 2. Fix (tier: fix)

The fixer agent works in the target repo on branch
`shipshape/<assessor-id>/<slug>` cut from the current default branch (or from
a declared dependency's branch). Guardrails enforced by the harness, not the
prompt: writes only on its branch; commits are small and conventional;
documentation the repo's practices require (per its own conventions) is
updated in the same commit; the fixer runs the repo's own quality gate/tests
when the repo documents one and reports the result honestly in the branch's
final commit message body. Scope is the findings named in the plan — no
opportunistic extra changes.

### 3. Adversarial review (tier: review)

Every branch is reviewed before it is offered to humans — shipshape's own
medicine. Reviewers are assessors with `canReview: true` whose
`reviewsCategories` match the fix's category (always including the
`review-process`-style general reviewer; `security-reviewer` reviews any fix
touching executable config, hooks, or CI). The reviewer gets the diff, the
originating findings, repo access, and the team conventions — **not** the
fixer's reasoning — and writes `doctor/reviews/<slug>.md`:

```yaml
verdict: approve | revise | reject
blocking: ["…"]        # must-fix items (revise) or fatal reasons (reject)
advisory: ["…"]
```

Reviewer prompts carry anti-sycophancy instructions: verify claims against
the diff and repo, do not assume the fix works because it says so, and check
the fix is consistent with the practices the assessor library promotes (a fix
must not lower another assessor's maturity).

- `revise` → one `revise` task (same fixer role, fresh context, blocking
  items in-prompt), then one re-review. A second `revise` verdict demotes the
  branch to `rejected` — bounded loop, no infinite ping-pong.
- `reject` → branch is kept (never deleted) but listed as rejected with
  reasons in the review plan.

### 4. The review plan (tier: synthesize) — `doctor/review-plan.md`

The human-facing deliverable, ordering approved branches for review:

1. `## How to use this plan` — one paragraph; branches are local; how to
   inspect (`git diff main...shipshape/...`), merge, or discard.
2. `## Review order` — a numbered table: branch, assessor, what it changes,
   maturity impact (which assessor levels it should raise), effort to review,
   dependencies (must merge after #n). Ordering: dependency edges first, then
   impact-per-review-minute — humans who stop reading at #3 should still have
   captured the most value.
3. `## Per-branch detail` — a page per branch: findings addressed, summary of
   the diff, review verdict incl. advisory notes, what to check by hand.
4. `## Not staged` — rejected branches (with reasons) and `**Fix:**` findings
   that were dropped or deemed too large/risky to stage — these remain
   documented opportunities, handed back to humans rather than silently lost.

`doctor/fixes.json` mirrors the plan in structured form (branch, status,
commits, findings, verdict) for tooling and resume.
