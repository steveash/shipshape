# Shipshape threat model

Durable security context for anyone (human or agent) reviewing changes to
shipshape. Reviewer agents reference this file; keep it current when the
attack surface changes.

## What shipshape is, from an attacker's view

A CLI that runs LLM agents with filesystem access against arbitrary
repositories, driven by prompt files (assessors, profiles, conventions) that
may come from third parties, and that (in doctor mode) writes commits into
the user's repos.

## Trust boundaries and concerns

1. **Assessor definitions and conventions files are executable trust.**
   They are prompts injected into agents that hold Read/Write/Bash grants.
   A malicious third-party assessor is the supply-chain risk here — treat
   like CI config. Mitigations: `shipshape validate` prints the trust
   surface (execution/fix access); specs instruct review-before-run; the
   wrapper prompt subordinates conventions to the contract. Residual risk:
   prompt-level constraints are not a security boundary.
2. **Target repo content is untrusted input to agents.** A scanned repo's
   files (including its CLAUDE.md) could carry prompt-injection aimed at
   shipshape's assessors. Mitigations: agents load no target settings
   (`settingSources: []` in `src/core/agent.ts`); report mode verifies
   targets stay git-clean after each assessment; agents get no network
   tools. Residual risk: an injected assessor could still write misleading
   report content — reports cite paths so humans can verify.
3. **Doctor mode writes to user repos.** Confined to `shipshape/*` branches
   created in dedicated worktrees; never pushes; never touches existing
   branches or the user's working tree. Reviewer agents re-check diffs
   before branches are offered.
4. **Command execution.** `needsExecution` assessors and doctor fixers run
   Bash with `bypassPermissions` inside the SDK session. Executing a target
   repo's build/tests runs that repo's code — build-test-locally therefore
   mandates scratch copies, but a hostile target repo can still execute
   arbitrary code on the host. Run shipshape against untrusted repos only
   in a sandbox. This is the sharpest edge; say so in user-facing docs.
5. **Secrets.** Shipshape adds no credential handling; the SDK inherits the
   user's environment (including AWS credentials when the Bedrock provider
   is selected). Agents must never write env contents into reports;
   transcripts land in the run directory — treat run directories as
   potentially sensitive when assessing private repos.
6. **Profile-controlled runtime environment.** A profile's `provider` block
   sets environment for the agent runtime. Keys are restricted to the
   AWS_/ANTHROPIC_/CLAUDE_CODE_ namespaces (`src/core/config.ts`), so a
   shared profile cannot inject PATH/NODE_OPTIONS-class variables — but the
   allowed namespaces still steer where traffic goes
   (`ANTHROPIC_BEDROCK_BASE_URL`, `provider.baseUrl`) and which models run.
   A malicious profile could route agent traffic (and thus repo content) to
   an attacker-controlled gateway. This is the same trust class as the rest
   of the profile (assessor prompts): review third-party profiles before
   running; `shipshape validate` prints the provider, baseUrl, and env keys
   as part of the trust surface.

## Review checklist for security-relevant diffs

- New tool grants to any agent role (diff against specs 010/050/060).
- Any weakening of: settingSources isolation, target-clean verification,
  branch/worktree confinement, no-push guarantee.
- New places where external text (target files, assessor prompts) reaches
  an agent with write/exec grants.
- Anything that starts sending data off-host (there is none today; adding
  any requires a spec change and explicit opt-in).
