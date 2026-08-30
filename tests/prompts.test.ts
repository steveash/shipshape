import { describe, expect, it } from 'vitest';
import { filterConventions } from '../src/pipeline/prompts.js';

const DOC = `General rule for everyone.

## assessor:agents-md-quality
Only for agents-md.

## assessor:security-reviewer
Only for security.

## Shared heading
More general text.
`;

describe('filterConventions', () => {
  it('keeps general prose and the addressed section, drops other assessor sections', () => {
    const out = filterConventions(DOC, 'agents-md-quality');
    expect(out).toContain('General rule for everyone.');
    expect(out).toContain('Only for agents-md.');
    expect(out).not.toContain('Only for security.');
    expect(out).toContain('More general text.');
  });

  it('drops all assessor sections for non-assessor agents', () => {
    const out = filterConventions(DOC, null);
    expect(out).not.toContain('Only for agents-md.');
    expect(out).not.toContain('Only for security.');
    expect(out).toContain('General rule for everyone.');
  });
});
