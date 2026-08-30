// Shipped data is validated by the same loaders the CLI uses, inside the test
// suite, so the quality gate fails if an assessor or profile rots
// (scripts/gate.sh runs this; see docs/specs/030-profiles.md).
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAssessorLibrary, resolveProfile } from '../src/core/config.js';

const ROOT = resolve(__dirname, '..');
const CATALOG_MIN = 20;

describe('shipped assessors', () => {
  const lib = loadAssessorLibrary([join(ROOT, 'assessors')]);

  it(`has at least ${CATALOG_MIN} assessors`, () => {
    expect(lib.size).toBeGreaterThanOrEqual(CATALOG_MIN);
  });

  it('every assessor with fix guidance declares real files, and reviewers exist per category', () => {
    const categories = new Set<string>();
    for (const def of lib.values()) {
      categories.add(def.category);
      expect(existsSync(join(def.dir, 'assess.md'))).toBe(true);
      if (def.canReview) expect(def.reviewsCategories.length).toBeGreaterThan(0);
    }
    // Every category of fixable assessor must have at least one reviewer able to cover it.
    for (const def of lib.values()) {
      if (!def.hasFix) continue;
      const covered = [...lib.values()].some(
        (r) => r.canReview && r.id !== def.id && r.reviewsCategories.includes(def.category),
      );
      expect(covered, `no reviewer covers category '${def.category}' for fixable '${def.id}'`).toBe(
        true,
      );
    }
  });
});

describe('shipped profiles', () => {
  for (const name of ['cheap', 'balanced', 'thorough']) {
    it(`profile '${name}' resolves cleanly with zero warnings`, () => {
      const resolved = resolveProfile(join(ROOT, 'profiles', `${name}.yaml`));
      expect(resolved.warnings).toEqual([]);
      expect(resolved.assessors.length).toBeGreaterThanOrEqual(CATALOG_MIN);
    });
  }

  it('all three profiles run the same assessor set (cost posture only differs)', () => {
    const ids = (n: string): string[] =>
      resolveProfile(join(ROOT, 'profiles', `${n}.yaml`))
        .assessors.map((a) => a.id)
        .sort();
    expect(ids('cheap')).toEqual(ids('balanced'));
    expect(ids('thorough')).toEqual(ids('balanced'));
  });
});
