# Fixing reviewer agent definitions

Ground rules for this assessor's fix branches:

- **Every criterion cites a source.** A reviewer definition you create or
  extend may only check things traceable to the repo: documented
  invariants, architecture docs, the gate's actual checks, stated
  prohibitions. Name the source doc in a comment or the definition's
  preamble. No source, no criterion.
- **Build in the separation.** New reviewers must be separate-context by
  construction (subagent definition, fresh-session command, CI job) and
  their instructions must specify inputs as diff + spec/findings only —
  never the author's reasoning. Include explicit anti-sycophancy framing:
  verify claims rather than assume them; do not rubber-stamp weak work.
- **Match the harness the repo already uses.** Put definitions where this
  repo's tooling actually loads them (.claude/agents/, .claude/commands/,
  existing workflow patterns) and mirror the format of neighboring files.
  Do not introduce a new harness.
- **Never let an author approve itself.** If a fix touches workflow wiring,
  the resulting flow must not allow any agent to approve content it
  created.
- **Route thorough review to risk only where risk is documented** — reuse
  the repo's own designation of sensitive paths; do not invent one.
- Keep each branch one coherent change: "create architecture reviewer" and
  "harden existing reviewer prompts" are separate branches unless tiny.
