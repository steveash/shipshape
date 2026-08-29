# AGENTS.md Quality Assessment — Evidence Scan Index

**Assessment Target**: `/home/user/shipshape/AGENTS.md`  
**Assessor**: agents-md-quality  
**Scan Date**: 2026-08-29  
**Status**: Evidence scan complete; ready for judgment phase  

---

## Resources Generated

### 1. **scan-notes.md** (Primary Evidence Document)
**Purpose**: Complete evidence inventory and analysis  
**Contents**:
- Surface inventory (all agent-instruction files found and classified)
- Reference verification (13/13 references resolved with status)
- Content classification by section (5 sections analyzed for discoverability)
- Duplication & drift analysis (cross-doc comparison)
- Enforcement mechanism audit (every hard rule backed by verification)
- Surgical rules validation (Zod v4, ESM, vitest, test validation — all verified accurate)
- Gitignore & portability pattern analysis
- CI/local parity verification
- Size & density analysis
- Strengths, opportunities, defects summary

**Key Findings Summary**:
- All 13 references resolve ✅
- All 5 hard rules have enforcement ✅
- All 4 surgical rules are accurate ✅
- Content is minimal (52 lines, 85% signal) ✅
- No duplication or drift ✅
- Passes filter test (62% non-discoverable content is non-restated) ✅

### 2. **reference-check.json** (Machine-Readable Reference Status)
**Purpose**: Comprehensive reference resolution audit  
**Contents**:
- All 13 references from AGENTS.md with resolution status
- Categorized by type: commands, file links, directory links, code references, enforcement mechanisms, workflow files
- Hard rules enforcement audit (each rule mapped to its enforcement mechanisms)
- Vitest reporter verification (matches actual config)

**Key Data**:
- Total references: 13
- Resolved: 13 (100%)
- Broken: 0

### 3. **content-analysis.md** (Content Classification & Discoverability)
**Purpose**: Detailed section-by-section analysis  
**Contents**:
- 5-section breakdown (preamble, gate, hard rules, orientation, surgical rules)
- Each section classified by type, line count, discoverability, value density
- Filter test assessment: "Could an agent learn this from code/config?" → NO (62% non-discoverable, which is appropriate)
- Comparison to anti-patterns (no auto-generated boilerplate, no restated linter rules, etc.)
- CLAUDE.md redirect pattern verification
- Enforcement verification checklist (5/5 hard rules checked)
- Summary assessment: minimalism, structure, accuracy

**Key Metrics**:
- Total lines: 52 (including whitespace)
- Substantive lines: 44 (85% signal-to-noise ratio)
- Discoverable content: ~38%
- Non-discoverable content: ~62% (justified, not duplicated)

---

## Evidence Summary by Category

### Reference Integrity
| Category | Count | Status | Details |
| --- | --- | --- | --- |
| File/directory links | 5 | ✅ All resolved | docs/specs/020, docs/dev-process, ARCHITECTURE, docs/specs/000, .claude/agents/ |
| Commands | 1 | ✅ Resolved | ./scripts/gate.sh (executable, correct args) |
| Code references (zod, ESM) | 2 | ✅ Verified | v4 API usage, extension requirements |
| Enforcement mechanisms | 5 | ✅ In place | .claude/settings.json, guard-bash.mjs, eslint, tests, code review |

### Content Quality
| Aspect | Assessment |
| --- | --- |
| Minimalism | Excellent (52 lines, no padding) |
| Discoverability ratio | Good (38% discoverable, 62% non-discoverable but justified) |
| Duplication | None found |
| Drift | None detected |
| Accuracy | 100% (all surgical rules verified against code) |
| Enforceability | 4/5 hard rules mechanically enforced; 1/5 enforced via review |

### Surface Inventory
| File Type | Count | Status |
| --- | --- | --- |
| Canonical agent docs | 1 | AGENTS.md (committed) |
| Redirect docs | 1 | CLAUDE.md → @AGENTS.md (correct pattern) |
| Harness config | 1 | .claude/settings.json (permissions, hooks) |
| Reviewer agents | 2 | arch-reviewer.md, prompt-reviewer.md |
| Enforcement hooks | 1 | .claude/hooks/guard-bash.mjs |
| Unused patterns | 6 | .cursorrules, .cursor/, WARP.md, GEMINI.md, agents.toml, CLAUDE.local.md |

---

## Hard Rules Enforcement Map

### Rule 1: Never edit `dist/` or `node_modules/`
- **AGENTS.md line**: 19
- **Enforcement**:
  - .claude/settings.json deny list (SDK level)
  - .claude/hooks/guard-bash.mjs regex guard (bash level)
  - eslint ignores (development level)
- **Strength**: L4 (Enforced) — three layers of defense

### Rule 2: No TypeScript in `assessors/` or `profiles/`
- **AGENTS.md line**: 20
- **Enforcement**:
  - tests/data-validation.test.ts build-time validation
  - Code review (arch-reviewer.md checks)
- **Strength**: L4 (Enforced) — structural + test

### Rule 3: Layering `cli → pipeline → core`
- **AGENTS.md line**: 22
- **Enforcement**:
  - eslint.config.js no-restricted-imports (blocking, no exceptions)
- **Strength**: L4 (Enforced) — lint-enforced with no bypass allowed

### Rule 4: Contract changes require spec updates
- **AGENTS.md line**: 25–29
- **Enforcement**:
  - Zod schemas in src/core/reportio.ts
  - tests/data-validation.test.ts validation
  - arch-reviewer.md code review
- **Strength**: L4 (Enforced) — code + test + review

### Rule 5: Tests never call SDK
- **AGENTS.md line**: 30–33
- **Enforcement**:
  - Code discipline (no SDK imports in tests/)
  - prompt-reviewer.md code review
- **Strength**: L3 (Documented) — code review gates, no mechanical block (acceptable for codebase size)

---

## Surgical Rules Verification

| Rule | Documented | Verified in Code | Status |
| --- | --- | --- | --- |
| Zod v4: `z.record(keySchema, valueSchema)` + `error.issues` | Line 44 | ✅ config.ts:26, reportio.ts:58,117 | Accurate |
| ESM/NodeNext: `.js` extensions on relative imports | Line 46 | ✅ tsconfig.json + all imports in src/ | Accurate |
| Vitest `dot` reporter for context economy | Line 48 | ✅ vitest.config.ts:8 + comment:6 | Accurate |
| Data validation in tests/data-validation.test.ts | Line 49–51 | ✅ test file exists, runs in gate.sh:18 | Accurate |

---

## Discoverability Analysis

### Discoverable Content (~38%)
An agent arriving at this repo could learn these points by reading code, config, and tool output:
- The `./scripts/gate.sh` command (in package.json scripts)
- Vitest reporter is `dot` (in vitest.config.ts)
- Layering rules (in eslint.config.js)
- Report format (in src/core/reportio.ts zod schema)
- Generated dirs are gitignored (in .gitignore)
- Data structure validation (visible in test file)

### Non-Discoverable Content (~62%)
These require explicit prose guidance; cannot be learned from code inspection alone:
- Local == CI parity guarantee and philosophy
- Cost rationale (why tests don't call SDK)
- Zod v4 specific API details (both-args requirement)
- ESM extension requirement (.js on relative imports)
- Vitest context-economy rationale
- Procedural integration ("adding assessor means test must pass")
- Why data is separate from engine code (separation-of-concerns principle)

**Filter Test**: ✅ PASS — Non-discoverable content is essential, minimal, and not duplicated elsewhere.

---

## Cross-Document Consistency Check

| Doc | Mentions AGENTS.md | Duplicates Content | Conflict | Status |
| --- | --- | --- | --- | --- |
| README.md | Yes (line 54) | No (different focus) | None | ✅ |
| ARCHITECTURE.md | No | No (different focus: code layout vs. rules) | None | ✅ |
| docs/dev-process.md | Yes (line 15) | No (expands loop, references AGENTS.md) | None | ✅ |
| THREAT_MODEL.md | No | No (different focus: security) | None | ✅ |
| CLAUDE.md | Yes (redirect: @AGENTS.md) | N/A | None | ✅ |
| .claude/agents/arch-reviewer.md | Yes (references rules) | No (verifies, doesn't duplicate) | None | ✅ |
| .claude/agents/prompt-reviewer.md | No (implicit: enforces spirit) | No | None | ✅ |

**Finding**: AGENTS.md is the single authoritative source. No duplication detected. All references are consistent.

---

## CI/Local Development Parity

**Gate script**: `./scripts/gate.sh`  
**Local mode**: `./scripts/gate.sh` (auto-fixes formatting/lint)  
**CI mode**: `./scripts/gate.sh --check` (verify only)  

**Verification**:
- `.github/workflows/ci.yml` line 19: Runs `./scripts/gate.sh --check` ✅
- `.githooks/pre-commit` line 5: Runs `./scripts/gate.sh --check` ✅
- AGENTS.md line 14: States "If it passes locally, CI passes" ✅

**Finding**: Promise is kept. No drift risk between local and CI.

---

## Defects or Gaps Found

**None**. 

All 13 references resolve. All hard rules have enforcement backing. All surgical rules are accurate. No duplication or drift. No broken links. No outdated guidance. No gitignore violations (deliberate portability pattern is correct).

Minor opportunities for enhancement (not defects):
- Rule 5 could have mechanical linting instead of relying on review (but current gates are sufficient)
- Force-push rule could be explicitly cited in hard rules section (though guard-bash.mjs enforces it)

---

## Judgment-Ready Summary

**Document**: AGENTS.md at `/home/user/shipshape/AGENTS.md`  
**Scope**: Agent onboarding / developer guidance  
**Evidence base**:
- ✅ Surface inventory: 5 files, intentional pattern (1 canonical + 1 redirect + 3 enforcement/review)
- ✅ Reference integrity: 13/13 resolved
- ✅ Content quality: Minimal (52 lines), high signal (85%), appropriate discoverability ratio (62% non-discoverable but justified)
- ✅ Enforcement: 4 hard rules mechanically enforced (L4), 1 review-enforced (L3)
- ✅ Accuracy: All surgical rules verified against current code
- ✅ Consistency: No duplication, no drift, single source of truth maintained
- ✅ Procedures: Local == CI parity, pre-commit hooks in place, reviewer agents documented

**Ready for**: Judgment phase (level 1–5 scoring, confidence assessment, findings summary)

---

## How to Use This Evidence

**For the judgment phase**:
1. Read `scan-notes.md` for the complete narrative
2. Reference `reference-check.json` for machine-verifiable data
3. Consult `content-analysis.md` for discoverability and density metrics
4. Use the "Hard Rules Enforcement Map" and "Surgical Rules Verification" sections above for detailed findings

**For fix recommendations**:
- No fixes required for correctness (zero defects found)
- Enhancements are optional (e.g., mechanical linting for SDK-in-tests, explicit cite of force-push rule)

---

## File Manifest

```
resources/
  ├── INDEX.md                          (this file)
  ├── scan-notes.md                     (primary evidence, 350+ lines)
  ├── reference-check.json              (13 references, resolution status)
  └── content-analysis.md               (section analysis, discoverability)
```

All files are generated during the evidence scan phase and are ready for review.
