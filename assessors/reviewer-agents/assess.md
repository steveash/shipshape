# Assessing adversarial reviewer agents

## Why this matters

Models are trained to be agreeable; a reviewer that shares the author's
context agrees with the author. The studied pattern that works is
structural: review happens in a **separate context** — a fresh agent that
gets the diff and the spec, never the author's chain of reasoning — with
explicit anti-sycophancy framing. Real production prompts read like "Do NOT
assume the feedback is valid; verify the bug is real" and "do not
rubber-stamp weak work". In one real security pipeline, denying the
verifier the finder's analysis roughly halved non-exploitable findings. One
studied repo states the principle outright: no agent both creates and
approves the same content. Fast and thorough review paths, an
architecture-consistency reviewer, and effort/model routing by risk are how
the pattern scales.

## Evidence to gather (scan step)

1. **Inventory reviewer definitions.** Find every agent reviewer in any
   form: .claude/agents/*, .claude/commands/*review* (and *verify*, *check*,
   *audit* variants), .github/workflows/ jobs invoking a model for review,
   reviewer prompts in docs/ or scripts, harness-specific equivalents
   (.cursor/rules review roles, etc.). Record path, invocation mechanism,
   and role. Write the inventory to `resources/reviewer-inventory.md`.
2. **Classify each reviewer prompt** (up to `maxReviewersToAnalyze`), on
   these axes, with quoted lines and paths for each classification:
   - **Context separation** — is it a subagent/fresh-session/CI job
     (separate context), or a slash command asking the SAME session to
     review work it just wrote (shared context)?
   - **Input discipline** — does it receive diff + spec/findings only, or
     is it handed (or does it inherit) the author's reasoning?
   - **Skeptical framing** — anti-sycophancy instructions present
     ("verify claims, don't assume them", "do not rubber-stamp"), or
     neutral/absent, or actively sycophancy-prone ("confirm the change
     looks good")?
   - **Enumerable criteria** — a checkable list, or vibes ("review for
     quality")?
3. **Coverage of the review-path matrix.** Is there an
   architecture-consistency reviewer (checks changes against documented
   architecture/invariants, citing which docs)? Both a fast path (cheap,
   quick pass for low-risk changes) and a thorough path? Effort/model
   routing by risk — high effort on auth/payments/migrations-type paths,
   cheap models on docs — is an advanced strength; record it if present.
4. **Author/approver separation.** Trace each wired workflow: can any agent
   approve content it created (same session, same definition, or a pipeline
   where the fixer's output is accepted on its own say-so)? Cite the wiring
   (workflow file, command definition) either way.
5. **Wiring.** For each reviewer, is it actually invoked by anything — a CI
   job, a hook, a documented required step — or is it a definition nothing
   calls? A defined-but-unwired reviewer is documentation, not process.

## Judging

- **L1** — no reviewer agent definitions in any form.
- **L2** — reviewer traces exist but embody the anti-pattern or are
  unreliable: a review command that asks the same session to review its own
  work, prompts with no skeptical framing and no criteria, or definitions
  nothing invokes and no doc mentions.
- **L3** — at least one real separate-context reviewer exists and is
  documented (an agent would find and use it): fresh-context invocation,
  diff-and-spec input, skeptical framing, mostly enumerable criteria.
- **L4** — reviewers are wired in mechanically: a CI reviewer job, a hook,
  or a command documented as required pre-push/pre-merge; author/approver
  separation holds structurally, not by convention.
- **L5** — reviewer quality is itself maintained: calibration runs against
  known-bad diffs, reviewer definitions updated on model upgrades, measured
  catch/false-positive rates feeding prompt revisions.

Judgment guidance:

- Separation is worth more than prose: a terse reviewer that structurally
  runs fresh-context outranks an eloquent prompt executed in the author's
  session.
- A same-session self-review command is not worthless — it beats nothing —
  but it caps this practice at L2 on its own; say so plainly rather than
  rounding up.
- Cite every classification: the file, the quoted line that shows skeptical
  framing (or its absence), the workflow that wires (or fails to wire) the
  reviewer.

## Fix marking

Mark as `**Fix:**`: creating reviewer agent definitions distilled from the
repo's own docs and invariants — every criterion cites its source doc;
adding anti-sycophancy framing and enumerable criteria to existing reviewer
prompts (criteria derived from repo docs, cited); restructuring a
same-session review command into a separate-context subagent using the
harness mechanisms the repo already has; splitting a pipeline so the author
agent no longer approves its own output. Do NOT mark: inventing review
criteria with no source in the repo, or wiring reviewers into CI when no
agent-in-CI infrastructure exists (propose it as an opportunity instead).
