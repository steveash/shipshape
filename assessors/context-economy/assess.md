# Assessing context economy

## Why this matters

Context is the one budget every agent session spends whether or not anyone
is watching. The always-loaded surface — agent docs, MCP tool schemas,
hook output — is a fixed tax on turn one; command output is a recurring
tax, because 400 lines of passing-test output sit in the window and are
charged to every remaining turn. Each installed MCP server costs roughly
5-7k tokens permanently; a skill covering the same job costs ~50-100
tokens until invoked. Repos that curate this surface leave agents most of
the window for actual work; repos that don't start every session
half-spent.

## Evidence to gather (scan step)

Write all evidence to `resources/context-audit.md` as you go: per-file
token-ish weights (line counts are fine), the MCP inventory with verdicts,
and the command-flag audit.

1. **Weigh the agent-doc surface.** For every always-loaded doc (AGENTS.md,
   CLAUDE.md, nested variants, rules files — reuse the recon inventory),
   record line counts and judge value-per-line. There is NO hard line-count
   rule — sizing is debated and repo-shaped; flag only clear bloat: content
   restated from config or from other loaded docs, discoverable stack
   descriptions, boilerplate. Cite the specific bloated sections.
2. **Inventory MCP servers** (.mcp.json, .claude/settings*.json, harness
   configs, CI workflow flags). Each installed server costs ~5-7k tokens
   permanently; a healthy budget is `mcpBudgetMin`-`mcpBudgetMax` essential
   servers. For each server apply the **bash-script test**: does it wrap a
   CLI the agent could call directly (a github server where `gh` is
   available, a filesystem server, a DB server wrapping `psql`)? Wrapping a
   callable CLI = flag. Note where a skill would do the job (~50-100 tokens
   vs thousands) — skills are preferred over MCP where possible.
3. **Find inline procedures.** Scan the agent doc(s) for procedural
   sections longer than `procedureStepThreshold` steps (release process,
   migration recipe, debugging runbook). These are paid by every session
   but needed by few — they belong in skills/commands loaded on demand.
   Check whether a skills mechanism already exists in the repo (.claude/
   skills, commands) that they could move into.
4. **Audit documented commands for output discipline.** For each test/lint/
   build command in agent docs: does it use a quiet/failure-only reporter
   (`-q`, `--quiet`, `--reporter=dot`, `--silent`, `--onlyFailures`) or
   will it dump verbose passing output into the window? Record per command:
   doc path, command, verbose-or-quiet verdict, and the quiet flag the tool
   actually supports.
5. **Credit routing and structure**: docs that route noisy commands to
   subagents where the harness supports it; plan files where the harness
   preserves them across compaction; delimited auto-managed sections that
   keep tool-injected content bounded.
6. **Cross-reference**: if there is no agent surface at all, that is
   `agents-md-quality`'s finding — here it means L1 with a note; score
   whatever surface does exist.

## Judging

- **L1** — no agent-facing surface exists to economize (cross-ref
  `agents-md-quality`); score what exists, note the dependency.
- **L2** — clear waste: 10+ MCP servers or several failing the bash-script
  test, docs restating discoverable/duplicated content, verbose default
  commands, long inline procedures.
- **L3** — the surface is deliberately curated: docs dense with
  non-discoverable value, MCP inventory within budget and each server
  earning its cost, documented commands mostly quiet, procedures extracted
  or short.
- **L4** — the budget is guarded mechanically: doc-size or doc-content
  checks in CI/hooks, an MCP allowlist policy (settings that prevent
  drive-by server additions), delimited auto-managed sections enforced.
- **L5** — the budget is measured: context baselines recorded and compared
  over time, audits triggered on model/harness upgrades, with evidence the
  loop has fired.

Judgment guidance: this assessor judges cost-per-value, not size — a
600-line doc of surgical non-discoverable rules can be economical and a
40-line restated one wasteful. Weight permanent costs (MCP schemas,
always-loaded docs) over recurring-but-avoidable ones (verbose commands),
and both over one-time costs. Every flag cites the file/section/command.

## Fix marking

Mark as `**Fix:**`: adding a quiet/failure-only flag to a documented
command — only after verifying the flag exists for that tool and version
(check the tool's config/version in the repo, cite it); extracting a
specific long procedure from the agent doc into a skill file with a
one-line pointer left behind (only where a skills mechanism exists);
removing content restated from config or duplicated across loaded docs
(cite both the restated lines and their source of truth). Do NOT mark:
removing MCP servers (team workflow calls), rewriting docs wholesale, or
adding measurement infrastructure. Keep each fix small and citable.
