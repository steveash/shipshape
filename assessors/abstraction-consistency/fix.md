# Fixing abstraction consistency and duplication

Ground rules for this assessor's fix branches:

- **Consolidate only the provably identical.** Stage a de-duplication only
  when the copies are near-verbatim (whitespace/name-level differences at
  most), the report's `resources/patterns.md` cites both, and the
  consolidated target is an EXISTING shared location — creating a new
  shared module is designing an abstraction, which is the team's call.
  Run the test suite and state the result in the commit message; if the
  duplicated code has no test coverage, do not touch it.
- **Never resolve divergence.** Copies that differ in behavior are
  report-only: merging them means choosing which behavior survives, and
  that choice needs an owner, not a fixer branch.
- **Pattern docs describe the majority, with receipts.** When documenting a
  blessed pattern, it must be the pattern the sampled sites already
  demonstrate dominates — cite those majority sites in the doc or commit
  body. Do not document your preferred pattern; document theirs.
- **No sweeping refactors.** One duplication pair or one concern's pattern
  doc per branch. If a fix starts touching more than a handful of call
  sites, stop and downgrade it to a report opportunity.
- **Behavior-preserving means provable.** The diff must be explainable as
  pure call-site redirection; anything that changes an argument default,
  error path, or ordering is out of scope.
