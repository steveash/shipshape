// Guards against a repeat of the spill that produced 1b13ad3: report.md,
// resources/, and plan.json — all run artifacts of shipshape's own
// report/doctor pipeline — landing at the repo root instead of under
// shipshape-out/<run-id>/ (see README.md's documented convention).
//
// This intentionally does NOT use .gitignore for the same names: ignored
// paths are invisible to `git status --porcelain`, which is exactly what
// `verifyTargetsStillClean` (src/pipeline/report.ts) and doctor's `isClean`
// checks (src/core/gitops.ts) rely on to catch agents writing outside their
// assigned output directories. A gitignore rule here would silently defeat
// that guard for this specific spill class. A failing test surfaces it
// instead of muting it.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

describe('repo root has no leftover run artifacts', () => {
  for (const name of ['report.md', 'resources', 'plan.json']) {
    it(`does not contain '${name}'`, () => {
      expect(existsSync(join(ROOT, name))).toBe(false);
    });
  }
});
