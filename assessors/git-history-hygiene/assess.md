# Assessing git history against the stated process

## Why this matters

Every other process assessor reads what the repo says; this one reads what
the repo did. History is also agent-facing documentation: agents infer the
real conventions — message style, doc-coupling, granularity — from `git
log`, and a history of bare "fix" commits teaches every future session that
bare "fix" is the house style. The core move is a stated-vs-practiced
comparison: take the repo's own documented rules (issue-first, docs updated
with code, gate before commit, PR flow) and check whether recent history
exhibits them.

## Execution boundaries

`needsExecution` here authorizes **read-only git inspection only**: `git
log`, `git show`, `git diff`, `git shortlog`, `git rev-list` and similar
read commands against the target's existing checkout. Never `git checkout`,
`switch`, `reset`, `stash`, `clean`, or any command that mutates the
working tree, index, refs, or config. You are reading history, not touching
it.

## Evidence to gather (scan step)

1. **Collect the stated process first.** From CONTRIBUTING, AGENTS.md,
   process docs, PR templates: what does this repo claim about how work
   lands? (Issue/spec linkage? Docs with code? PR flow? Gate before
   commit? Message conventions?) List each claim with its source path in
   `resources/stated-process.md`. Claims found here define what steps 2-6
   check; where the repo claims nothing, measure anyway but judge against
   general good practice, gently.
2. **Sample recent history.** Last `commitSampleSize` commits: subjects,
   bodies, files touched (`git log --stat`). Identify PR-shaped history
   via merge patterns: squash-merge subjects with `(#N)`, explicit merge
   commits; sample up to `prSampleSize`. Write raw analysis to
   `resources/history-analysis.md`.
3. **Linkage.** Where the repo claims issue/spec/decision-driven work: what
   fraction of sampled commits (or PR subjects) reference an issue, spec
   path, or decision ID? Cite examples both ways (hashes).
4. **Doc-code coupling.** For sampled commits touching behavior (source
   files, configs — not pure-doc or pure-test commits), compute the ratio
   that also touch docs describing that behavior. Perfect coupling is not
   expected; near-zero coupling in a docs-heavy repo is the finding.
5. **Message quality.** Classify sampled messages: explains WHY (rationale,
   constraint, tradeoff) / describes WHAT beyond the diff obvious / bare
   ("fix", "wip", "updates") / model-output dump (pasted plans, tool
   transcripts, boilerplate essays). Report the distribution with example
   hashes for each class.
6. **Stability signals.** Revert/fixup rate in the sample (`Revert`,
   `fixup!`, immediate re-touching of the same lines). Direct-to-default
   pushes where the repo claims PR flow (non-merge-shaped commits on the
   default branch between merges).
7. **Compare stated vs practiced.** For each claim from step 1, mark it
   observed / partially observed / contradicted, with the evidence hash
   counts. This table is the heart of the report.

## Judging

- **L1** — history is noise: no linkage, bare or dump messages dominate,
  no doc coupling, no relation to any stated process (or nothing is
  stated and nothing is practiced).
- **L2** — inconsistent habits: some commits show the documented process,
  but an agent reading history could not tell which convention to follow;
  or the stated process is clearly contradicted by practice.
- **L3** — practiced-as-documented: the stated conventions are visible in
  a solid majority of the sample — linkage where claimed, doc coupling on
  behavior commits, messages that carry why, merge shapes matching claimed
  flow.
- **L4** — hygiene is enforced, not remembered: commit-msg hooks or CI
  checks validating message format/linkage, required PR checks and branch
  protection evidence (merge shapes uniformly PR-shaped), templates that
  make the process the path of least resistance.
- **L5** — hygiene is measured: revert/keep-rate tracking, retro processes
  that feed history lessons back into docs or hooks, scheduled audits of
  process compliance.

Judgment guidance:

- **Thin history lowers confidence, not level.** A freshly-squashed,
  shallow, or single-commit history limits what is checkable: score from
  what IS checkable, set confidence low, and say explicitly which checks
  the history could not support. Never punish a repo for having rewritten
  or truncated history.
- Distinguish "no stated process" from "stated and violated": the latter
  is the sharper finding — the docs are lying about the process.
- Cite commit hashes (short) for every distribution claim and every
  example; cite doc paths for every stated-process claim.

## Fix marking

History is immutable — most findings here are NOT fixable, and the report
should usually set `fixable: false`. Mark as `**Fix:**` only
forward-looking mechanisms, and only where the repo's tooling supports
them: a commit-msg hook enforcing the repo's OWN documented message/linkage
convention (cite the doc that states it), added via the hook manager the
repo already uses; a PR template section prompting the documented linkage
or doc-update check. Do NOT mark: rewriting history, inventing message
conventions the repo never documented, or adding a hook framework where
none exists.
