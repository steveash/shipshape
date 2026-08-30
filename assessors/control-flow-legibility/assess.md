# Assessing control-flow legibility

## Why this matters

Complexity is where agent edits go wrong. Faced with a 150-line branchy
function, an agent (like a human) builds a partial model and edits inside
it; if the code carries no statement of its invariants and whys, the agent
cannot distinguish load-bearing branches from incidental ones. Comments
matter here precisely because they say what code cannot: why this order,
what must stay true, what fails and how. And this property decays by
default — measured industry data shows AI-assisted codebases accumulate a
persistent ~40% cognitive-complexity increase when unguarded. The
countermeasure is mechanical: CI-detectable complexity budgets
(cognitive-complexity rules, max-depth, function-length limits), not
resolutions to write simpler code.

## Evidence to gather (scan step)

1. **Locate the repo's most complex flows** using structural signals — you
   are hunting the worst `sampleSize` (~10) sites, not averaging the repo:
   - indentation depth (deeply nested blocks);
   - function length (longest function bodies);
   - branching-keyword density as a cyclomatic hint (`if`/`elif`/`case`/
     `catch`/ternaries per function);
   - known-hard shapes: recursion, hand-rolled state machines, async
     orchestration/callback chains, exception-based control flow.
   Cheap greps and line-counting are fine; if the repo already configures a
   complexity linter, use its output and note that it exists.
2. **Judge each sampled site locally, as an agent would.** The two-question
   test, answered from the site plus its comments only:
   - Can you state what this code does?
   - Can you state what breaks if a given line changes?
   If yes, why (guard clauses? invariant comments? explicit state machine?).
   If no, what's missing at the point of need?
3. **Flag these patterns** (each cited path:line):
   - comment-free 100+-line branchy functions;
   - comments narrating WHAT the code does instead of WHY (noise that
     displaces signal);
   - error paths that silently swallow (`except: pass`, empty catch,
     ignored error returns) — non-obvious flow by construction;
   - boolean-parameter mazes (`fn(true, false, true)`) whose call sites are
     illegible;
   - clever one-liners guarding core logic (dense expressions where a
     mistake would be invisible).
4. **Credit these patterns** (also cited):
   - guard clauses and early returns flattening nesting;
   - state machines made explicit (named states, transition tables);
   - invariant/why/failure-mode comments at the hairy spots;
   - complexity linters configured with budgets (cognitive-complexity
     rules, max-depth, max-statements) — note whether they run in CI or
     are merely installed.
5. **Record the sample** in `resources/complexity-samples.md`: one entry
   per site with path:line-range, the structural signal that selected it,
   the two-question verdict, and flags/credits. The verdict must trace to
   this file.

## Judging

Because legibility of a given flow is judgment, L4/L5 for this practice
mean the property is GUARDED mechanically — complexity budgets in lint/CI,
review criteria that name it — not merely that today's worst sites are
tolerable.

- **L1** — pervasive illegible flow: most sampled sites fail both
  questions, no explanatory comments anywhere, silent error-swallowing in
  core paths.
- **L2** — the worst sites are unexplained: complex flows exist with no
  invariant/why comments, comment density does not track complexity, and
  nothing guards against more.
- **L3** — complexity is either absent or explained: sampled sites mostly
  pass the two-question test, invariants and whys are written at the point
  of need, error paths are deliberate.
- **L4** — complexity is linted with budgets in CI: cognitive-complexity /
  max-depth / function-length rules configured with real thresholds and
  enforced (blocking), and/or review criteria explicitly require
  explanation of complex flows.
- **L5** — the complexity trend is tracked and reviewed: budgets exist AND
  there's evidence of a loop — ratcheted thresholds, tracked metrics,
  refactors or budget adjustments traceable in history.

Judgment guidance: this assessor samples the worst sites by design — a repo
is judged by whether its hard parts are explained, not by its easy parts
being easy. A silently-swallowed error path in core logic outweighs several
uncommented long functions in scripts. Distinguish "linter installed" from
"linter enforced in CI with a budget" — only the latter reaches L4.

## Fix marking

Mark as `**Fix:**`: adding invariant/why comments to specific sampled sites
where the why is reconstructable FROM EVIDENCE in the repo — tests that pin
the behavior, callers that depend on it, docs/specs/commit messages that
state it — citing that evidence (never guess a why: a plausible-sounding
wrong invariant is worse than none); mechanical de-nesting via guard
clauses/early returns ONLY where existing tests cover the function and
pass. Do NOT mark: rewriting complex logic, adding a complexity linter the
repo hasn't chosen, or commenting sites where the why cannot be evidenced —
those are report-only opportunities.
