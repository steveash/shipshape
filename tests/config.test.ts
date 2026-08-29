import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAssessorDir, loadAssessorLibrary, loadProfile } from '../src/core/config.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'shipshape-config-'));
}

function writeAssessor(root: string, id: string, extra = ''): string {
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'assessor.yaml'),
    `id: ${id}\ntitle: T\ncategory: docs\nsummary: s\npractice: p\ntiers: [judge]\n${extra}`,
  );
  writeFileSync(join(dir, 'assess.md'), '# instructions');
  return dir;
}

describe('assessor loading', () => {
  it('loads a minimal assessor with defaults', () => {
    const dir = writeAssessor(tmp(), 'my-check');
    const def = loadAssessorDir(dir);
    expect(def.id).toBe('my-check');
    expect(def.needsExecution).toBe(false);
    expect(def.canReview).toBe(false);
    expect(def.hasFix).toBe(false);
  });

  it('rejects non-kebab ids and missing assess.md', () => {
    const root = tmp();
    const dir = join(root, 'Bad_Id');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'assessor.yaml'),
      'id: Bad_Id\ntitle: T\ncategory: docs\nsummary: s\npractice: p\ntiers: [judge]\n',
    );
    writeFileSync(join(dir, 'assess.md'), 'x');
    expect(() => loadAssessorDir(dir)).toThrow(/kebab/);
  });

  it('detects duplicate ids across directories', () => {
    const a = tmp();
    const b = tmp();
    writeAssessor(a, 'dup');
    writeAssessor(b, 'dup');
    expect(() => loadAssessorLibrary([a, b])).toThrow(/duplicate/);
  });
});

describe('profile loading', () => {
  it('resolves extends with child-wins merge', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'base.yaml'),
      `name: base
models:
  judge: sonnet
  scan: haiku
concurrency: 3
assessors:
  - id: a1
    config: { x: 1, y: 2 }
  - id: a2
`,
    );
    writeFileSync(
      join(dir, 'child.yaml'),
      `name: child
extends: ./base.yaml
models:
  judge: opus
assessors:
  - id: a1
    config: { y: 9 }
  - id: a2
    enabled: false
  - id: a3
`,
    );
    const p = loadProfile(join(dir, 'child.yaml'));
    expect(p.name).toBe('child');
    expect(p.models.judge).toBe('opus');
    expect(p.models.scan).toBe('haiku');
    expect(p.concurrency).toBe(3);
    const a1 = p.assessors.find((a) => a.id === 'a1');
    expect(a1?.config).toEqual({ x: 1, y: 9 });
    expect(p.assessors.some((a) => a.id === 'a2')).toBe(false); // disabled
    expect(p.assessors.some((a) => a.id === 'a3')).toBe(true);
  });

  it('rejects extends cycles', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'a.yaml'), 'name: a\nextends: ./b.yaml\n');
    writeFileSync(join(dir, 'b.yaml'), 'name: b\nextends: ./a.yaml\n');
    expect(() => loadProfile(join(dir, 'a.yaml'))).toThrow(/cycle/);
  });
});
