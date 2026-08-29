# Fixing architecture enforcement gaps

Ground rules for this assessor's fix branches:

- **Mirror prose, never invent.** Every arch-lint rule you add must encode a
  constraint the repo already documents. Cite the prose source (path and
  line) per rule — in the config as a comment where the format allows, and
  in the commit body always.
- **Express exactly the documented rule.** Configure the minimal rule that
  binds the paths the prose names — no bonus constraints, no "while I'm
  here" layering opinions. If the prose is ambiguous about scope, choose
  the narrower reading and say so.
- **Prove the rule binds.** Before committing, verify the rule's patterns
  match the current tree (run the tool in your branch's worktree; confirm it
  passes on current code, or if it fails, that the violations are real
  breaches of the documented rule — report red results rather than
  suppressing them to ship green).
- **Never seed an exception list** to make a new rule pass. If current code
  violates the documented rule, that is a finding for the team, not
  something to allowlist silently: leave the rule out, report the
  violations, and let the team decide.
- **CI wiring is behavior-preserving plumbing only**: add the existing
  tool's existing invocation as a CI step; do not modify what the tool
  checks in the same branch.
- One rule-set or wiring change per branch.

## When reviewing enforcement fixes (canReview)

You review other enforcement-category fix branches adversarially. Verify,
do not assume: run the changed configs/hooks/workflow logic mentally against
concrete cases; check that no check was weakened, no exception list grew,
and no suppression was added to get green — those are exactly the gamed-rule
patterns this assessor exists to catch. Confirm every rule the fix added
traces to a documented source, and that CI actually invokes what the branch
claims it wired.
