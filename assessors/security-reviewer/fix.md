# Fixing the security review layer

Ground rules for this assessor's fix branches:

- **Never invent threat claims.** Every concern written into a threat model
  must point at evidence in this repo: the auth middleware at a cited path,
  the parser that takes external input, the secrets flow in a workflow
  file. A threat you cannot cite is a question for the team — leave a
  clearly-marked TODO prompt in the skeleton instead of a fabricated claim.
- **Keep the reviewer prompt simple.** The reviewer definition carries the
  discovery framing and a reference to the threat doc; durable specifics
  live in the doc. Do not embed long vulnerability checklists — the
  evidence says they reduce novel-bug discovery.
- **Separate, don't duplicate.** When extracting security review from a
  general reviewer, remove the line from the general prompt in the same
  branch so the two do not drift.
- **Blocking gates are earned, not declared.** Wire new security checks in
  shadow or comment-only mode; note the promotion path (shadow →
  PR-comment → blocking) in the workflow comment. Never flip an existing
  check to blocking in a fix branch.
- **Match existing conventions.** Reviewer definitions go where the repo's
  harness loads them; CI wiring mirrors the repo's existing workflow style;
  only wire SAST whose config already exists.
- Keep each branch one coherent change: threat-model skeleton, reviewer
  definition, and SAST wiring are separate branches unless tiny.
