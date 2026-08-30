import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseReview, validateAssessorReport } from '../src/core/reportio.js';

const GOOD_REPORT = `---
assessor: agents-md-quality
title: Agent onboarding docs
category: docs
level: 3
confidence: high
summary: Solid AGENTS.md, two stale references.
strengths: 2
opportunities: 3
fixable: true
resources:
  - path: resources/links.json
    description: link check results
---

## What this assessor looks for
Stuff.

## Verdict
L3 because reasons.

## Doing well
1. thing

## Opportunities
1. thing
**Fix:** repair the links.

## Resources
- resources/links.json
`;

function writeReport(content: string, withResource = true): string {
  const dir = mkdtempSync(join(tmpdir(), 'shipshape-report-'));
  if (withResource) {
    mkdirSync(join(dir, 'resources'));
    writeFileSync(join(dir, 'resources', 'links.json'), '{}');
  }
  const p = join(dir, 'report.md');
  writeFileSync(p, content);
  return p;
}

describe('validateAssessorReport', () => {
  it('accepts a contract-conforming report', () => {
    const v = validateAssessorReport(writeReport(GOOD_REPORT), 'agents-md-quality');
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.report?.frontmatter.level).toBe(3);
  });

  it('rejects a wrong assessor id', () => {
    const v = validateAssessorReport(writeReport(GOOD_REPORT), 'other-assessor');
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toContain("expected 'other-assessor'");
  });

  it('rejects missing sections and bad level', () => {
    const bad = GOOD_REPORT.replace('level: 3', 'level: 9').replace('## Verdict', '## Vibes');
    const v = validateAssessorReport(writeReport(bad), 'agents-md-quality');
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('level'))).toBe(true);
    expect(v.errors.some((e) => e.includes("'## Verdict'"))).toBe(true);
  });

  it('rejects declared resources that do not exist', () => {
    const v = validateAssessorReport(writeReport(GOOD_REPORT, false), 'agents-md-quality');
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('resource'))).toBe(true);
  });

  it('reports a missing file rather than throwing', () => {
    const v = validateAssessorReport('/nonexistent/report.md', 'x');
    expect(v.ok).toBe(false);
  });
});

describe('parseReview', () => {
  function writeReview(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'shipshape-review-'));
    const p = join(dir, 'r.md');
    writeFileSync(p, content);
    return p;
  }

  it('parses an approval', () => {
    const r = parseReview(writeReview('---\nverdict: approve\n---\nLooks right.\n'));
    expect(r.ok).toBe(true);
    expect(r.review?.verdict).toBe('approve');
  });

  it('requires blocking items for revise', () => {
    const r = parseReview(writeReview('---\nverdict: revise\n---\nHmm.\n'));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain('blocking');
  });

  it('rejects unknown verdicts', () => {
    const r = parseReview(writeReview('---\nverdict: maybe\n---\n'));
    expect(r.ok).toBe(false);
  });
});
