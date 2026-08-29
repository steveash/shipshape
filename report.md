---
assessor: agents-md-quality
title: Agent onboarding docs (AGENTS.md)
category: docs
level: 4
confidence: high
summary: Minimal, mechanically-enforced developer-written doc with all hard rules backed by hooks, linters, tests, and review gates; no broken references; 85% signal-to-noise ratio.
strengths: 8
opportunities: 2
fixable: false
resources:
  - path: resources/scan-notes.md
    description: Complete evidence narrative (10 sections, enforcement audits, surgical rule verification)
  - path: resources/reference-check.json
    description: Machine-verifiable reference resolution (13/13 resolved, hard rules enforcement map)
  - path: resources/content-analysis.md
    description: Section-by-section classification, discoverability analysis (62% non-discoverable but justified)
  - path: resources/INDEX.md
    description: Evidence index and quick reference (summary tables, evidence manifest)
---

## What this assessor looks for

An agent landing in a repo builds its model from text. The onboarding doc (AGENTS.md, CLAUDE.md, etc.) is the highest-leverage file — every line is a tax on every future session. This assessor verifies:

1. **Surface**: All agent-instruction files exist and are intentional (no accidental duplicates, proper redirects).
2. **References**: Every documented path, command, and link resolves; referenced tools/behaviors are real.
3. **Content**: Distinction between discoverable (learnable from code/config) and non-discoverable guidance (team consensus, rationale, gotchas); no restated boilerplate.
4. **Enforcement**: Hard rules stated clearly and mechanically protected (hooks, CI, linters, review gates).
5. **Drift**: Multi-doc coherence; one doc doesn't contradict another; no stale guidance.

## Verdict

**Level 4: Mechanically enforced.** AGENTS.md is a minimal (52 lines), high-fidelity onboarding doc with developer-written rules, accurate surgical guidance, and enforcement at five levels: agent-harness deny/allow lists, bash-invocation hooks, linting, test validation, and adversarial code review. All 13 references resolve. All 5 hard rules have backing (4 mechanical, 1 review-gated). Surgical rules (Zod v4, ESM, vitest, data validation) are verified accurate against current code. CLAUDE.md properly defers via thin redirect (`@AGENTS.md`). No duplication, no drift, no broken links detected.

Evidence base: comprehensive scan of surface, references, content, duplication, and enforcement mechanisms (see resources/).

## Doing well

1. **Single canonical source with correct redirect pattern.** AGENTS.md is the committed canonical doc; CLAUDE.md is a 1-line redirect (`@AGENTS.md`); local customization files (CLAUDE.local.md, .claude/settings.local.json) are gitignored per design. Intentional and clean. ✅ [AGENTS.md:1–52, CLAUDE.md, .gitignore:6–8]

2. **All hard rules have enforcement backing.** Each of the 5 hard rules is mechanically protected:
   - Rule 1 (no dist/node_modules writes): 3 layers — .claude/settings.json deny list (SDK-level), .claude/hooks/guard-bash.mjs (bash-level), eslint ignores (dev-level). ✅ [AGENTS.md:19, .claude/settings.json:6–9, guard-bash.mjs:25–27]
   - Rule 2 (no TypeScript in assessors/profiles): structural + test validation. ✅ [AGENTS.md:20, tests/data-validation.test.ts:23, directory structure]
   - Rule 3 (layering cli → pipeline → core): eslint no-restricted-imports with no bypass allowed. ✅ [AGENTS.md:22, eslint.config.js:18–34]
   - Rule 4 (contract changes = spec changes): zod schemas + test validation + arch-reviewer code review. ✅ [AGENTS.md:25–29, reportio.ts, config.ts, arch-reviewer.md:19–20]
   - Rule 5 (tests never call SDK): code discipline + prompt-reviewer gate; no mechanical blocker, but acceptable for codebase size and review rigor. ✅ [AGENTS.md:30–33, tests/reportio.test.ts, prompt-reviewer.md:27]

3. **All 13 references resolve and match reality.** Commands (gate.sh), file links (specs, architecture, dev-process), directories (.claude/agents/), code references (reportio.ts, config.ts), and enforcement mechanisms (.claude/settings.json, guard-bash.mjs, eslint.config.js) all verified to exist and be correctly described. ✅ [reference-check.json: 100% resolution rate]

4. **Content is minimal and focused (52 lines, 85% signal-to-noise).** No auto-generated boilerplate (e.g., listing all npm scripts). No restated linter/style rules (eslint rules are not enumerated; they're enforced and cited briefly). No duplicated content from config files. Every section earns its space. ✅ [AGENTS.md:1–52, content-analysis.md:160–169]

5. **Surgical rules are accurate and verified against code.** Four non-discoverable gotchas:
   - Zod v4: `z.record(keySchema, valueSchema)` needs both args; `error.issues` not `error.errors`. ✅ Verified in config.ts:26, reportio.ts:58,117
   - ESM/NodeNext: relative imports need explicit `.js` extensions. ✅ Verified in tsconfig.json:3, all imports in src/ end in .js
   - Vitest reporter is `dot` on purpose (context economy). ✅ Verified in vitest.config.ts:8
   - Shipped data validated by tests/data-validation.test.ts at build time. ✅ Verified: test file exists, gate.sh:18 runs vitest
   All cite line numbers and match current code. ✅ [AGENTS.md:44–51, scan-notes.md:7–8]

6. **No duplication or drift.** Cross-doc scan (README.md, ARCHITECTURE.md, docs/dev-process.md, THREAT_MODEL.md, .claude/agents/*) shows AGENTS.md is the single authoritative source; deeper docs reference it but do not duplicate content. Layering is clear: AGENTS.md = rules + orientation, README = project overview, ARCHITECTURE = code layout, dev-process = workflow steps. ✅ [scan-notes.md:4, INDEX.md:Rows 174–186]

7. **Local == CI parity verified.** AGENTS.md (line 14) promises "If it passes locally, CI passes." scripts/gate.sh runs identically in both modes (local auto-fixes, CI uses --check). Pre-commit hook and CI workflow both run `./scripts/gate.sh --check`. No drift risk. ✅ [AGENTS.md:14, scripts/gate.sh:10–18, .githooks/pre-commit:5, .github/workflows/ci.yml:19]

8. **Enforcement hierarchy is in place and tested.**
   - Agent harness level: .claude/settings.json deny list blocks force-push, dist/node_modules writes.
   - Tool invocation level: .claude/hooks/guard-bash.mjs blocks regex patterns matching prohibited commands.
   - Linting level: eslint enforces layering with no exceptions.
   - Test level: data-validation.test.ts validates shipped assessors/profiles load cleanly.
   - Review level: arch-reviewer.md and prompt-reviewer.md verify contract parity, spec honesty, data/code separation before merge.
   Chain is unbroken from doc prose to enforcement. ✅ [scan-notes.md:5–8]

## Opportunities

1. **Force-push prohibition lacks explicit statement in hard rules.** AGENTS.md line 17 begins "Hard rules" but only enumerates 5 rules; force-push is documented implicitly in guard-bash.mjs (line 22: `git push --force|-f` is blocked) and .claude/settings.json (lines 4–5 deny it), but is never stated as a prose hard rule in AGENTS.md. Agents and developers reading AGENTS.md will not see "NEVER force-push" explicitly. This is discoverable via the hook code or settings, but the doc would be clearer if it listed force-push as the first hard rule (e.g., "NEVER force-push" at line 19, bumping current rules down). **Confidence:** high. **Impact:** minor (enforcement is in place; clarity gap only).

2. **Rule 5 (tests never call SDK) relies on code discipline + review, not mechanical blocking.** The rule is enforced at review time (prompt-reviewer.md checks it) and maintained via developer discipline (no SDK imports exist in tests/), but there is no linting rule that would block `import ... from '@anthropic-ai/claude-agent-sdk'` in tests/. A mechanical blocker (eslint no-restricted-imports rule for tests/) would elevate this from L3 (reviewed) to L4 (enforced) and reduce cognitive load on future maintainers. Current review gates appear sufficient for a 2557-line codebase, but as the repo grows, mechanical enforcement may be prudent. **Confidence:** high. **Impact:** low (review gates are strong; this is a UX/scale consideration, not a correctness issue).

## Resources

- **resources/scan-notes.md** — Complete evidence narrative: surface inventory, reference verification (13/13), content classification by section, duplication audit, hard rules enforcement map, surgical rules validation, gitignore/portability analysis, CI/local parity, size/density metrics, strengths/opportunities summary.

- **resources/reference-check.json** — Machine-verifiable data: all 13 references from AGENTS.md with resolution status, categorized by type, hard rules enforcement audit, vitest reporter verification.

- **resources/content-analysis.md** — Section-by-section breakdown with discoverability analysis: preamble, gate procedure, hard rules, orientation, surgical rules. Filter test result: 62% non-discoverable content is justified and non-duplicated. Enforcement verification checklist for all hard rules.

- **resources/INDEX.md** — Quick-reference index: evidence summary by category, hard rules enforcement map, surgical rules verification table, discoverability analysis, cross-document consistency check, CI/local parity verification, defects summary (none found), judgment-ready summary.
