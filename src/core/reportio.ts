// Parse + validate assessor reports against the contract in spec 020, and
// review verdicts against spec 060. Validation errors are returned as a list
// so a failing agent can be bounced once with the exact problems.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { ReportFrontmatter, ReviewVerdict } from './types.js';

const frontmatterSchema = z.object({
  assessor: z.string(),
  title: z.string(),
  category: z.enum(['docs', 'process', 'enforcement', 'legibility', 'operations']),
  level: z.number().int().min(1).max(5),
  confidence: z.enum(['high', 'medium', 'low']),
  summary: z.string().min(1),
  strengths: z.number().int().min(0),
  opportunities: z.number().int().min(0),
  fixable: z.boolean(),
  resources: z.array(z.object({ path: z.string(), description: z.string() })).default([]),
});

export const REQUIRED_SECTIONS = [
  'What this assessor looks for',
  'Verdict',
  'Doing well',
  'Opportunities',
  'Resources',
];

export interface ParsedReport {
  frontmatter: ReportFrontmatter;
  body: string;
}

export interface ReportValidation {
  ok: boolean;
  errors: string[];
  report?: ParsedReport;
}

export function validateAssessorReport(
  reportPath: string,
  expectedAssessorId: string,
): ReportValidation {
  const errors: string[] = [];
  if (!existsSync(reportPath)) {
    return { ok: false, errors: [`report file not written: ${reportPath}`] };
  }
  let fm: ReportFrontmatter | undefined;
  let body = '';
  try {
    const parsed = matter(readFileSync(reportPath, 'utf8'));
    body = parsed.content;
    const result = frontmatterSchema.safeParse(parsed.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`frontmatter: ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      fm = result.data as ReportFrontmatter;
      if (fm.assessor !== expectedAssessorId) {
        errors.push(`frontmatter: assessor is '${fm.assessor}', expected '${expectedAssessorId}'`);
      }
    }
  } catch (err) {
    errors.push(`could not parse frontmatter: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const section of REQUIRED_SECTIONS) {
    const re = new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, 'm');
    if (!re.test(body)) errors.push(`missing required section: '## ${section}'`);
  }

  // Every declared resource must exist next to the report.
  if (fm) {
    const dir = join(reportPath, '..');
    for (const r of fm.resources) {
      if (!existsSync(join(dir, r.path))) {
        errors.push(`declared resource does not exist: ${r.path}`);
      }
    }
  }

  if (errors.length > 0 || !fm) return { ok: false, errors };
  return { ok: true, errors: [], report: { frontmatter: fm, body } };
}

const reviewSchema = z.object({
  verdict: z.enum(['approve', 'revise', 'reject']),
  blocking: z.array(z.string()).default([]),
  advisory: z.array(z.string()).default([]),
});

export interface ParsedReview {
  verdict: ReviewVerdict;
  blocking: string[];
  advisory: string[];
  body: string;
}

export function parseReview(reviewPath: string): {
  ok: boolean;
  errors: string[];
  review?: ParsedReview;
} {
  if (!existsSync(reviewPath)) {
    return { ok: false, errors: [`review file not written: ${reviewPath}`] };
  }
  try {
    const parsed = matter(readFileSync(reviewPath, 'utf8'));
    const result = reviewSchema.safeParse(parsed.data);
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((i) => `frontmatter: ${i.path.join('.')}: ${i.message}`),
      };
    }
    if (result.data.verdict !== 'approve' && result.data.blocking.length === 0) {
      return {
        ok: false,
        errors: [`verdict '${result.data.verdict}' requires at least one blocking item`],
      };
    }
    return { ok: true, errors: [], review: { ...result.data, body: parsed.content } };
  } catch (err) {
    return {
      ok: false,
      errors: [`could not parse review: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
