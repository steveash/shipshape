# Fixing unbacked prohibitions

Ground rules for this assessor's fix branches:

- **One control class per branch**: deny rules in one branch, hooks in
  another, CI checks in a third. Mixed-mechanism branches are hard to review
  and hard to revert.
- **Every control cites its prose rule.** In the settings/hook/workflow file
  (as a comment where the format allows) and in the commit body: the exact
  doc path and line of the prohibition this control enforces. A control
  without a traceable prose source is new policy — out of scope.
- **Enforce the rule as written, at the right tier.** Prefer the highest
  tier that fits: capability removal or deny rule for destructive actions,
  blocking hook for process steps, CI for post-hoc verifiable properties.
  Do not enforce a stricter reading than the prose states; if the prose is
  ambiguous, take the narrower reading and note the ambiguity in the report,
  not the control.
- **Narrowing permissions must not break documented workflows.** When
  replacing a blanket grant with granular prefixes, derive the prefix list
  from evidence (documented commands, existing hooks, CI steps, the repo's
  own guide) and list the derivation in the commit body. When in doubt,
  prefer ask-tier over deny for commands the docs are silent on.
- **Blocking hooks must fail closed and fast**, with an error message that
  quotes the documented rule so the blocked agent knows why and where the
  rule lives.
- Never add a control you cannot verify is syntactically valid for the
  harness/CI that will load it.

## When reviewing enforcement fixes (canReview)

Adversarially review other enforcement fix branches against the hierarchy:
did the fix land at the tier it claims (an advisory hook sold as blocking is
a blocking finding)? Does every added control trace to a documented rule?
Did any change widen a permission, weaken a deny, or add a suppression?
Verify by reading the actual settings/hook/workflow semantics — never trust
the branch's description of them.
