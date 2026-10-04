import { describe, expect, it } from 'vitest';
import { decisionInputSchema, fieldErrors, LIMITS, reportSchema } from '@/lib/schema';
import { validInput, validReport } from './fixtures';

describe('decisionInputSchema', () => {
  it('accepts a valid input and trims whitespace', () => {
    const r = decisionInputSchema.safeParse({ ...validInput, decision: '  Should I accept this?  ' });
    expect(r.success && r.data.decision).toBe('Should I accept this?');
  });

  it('rejects empty and too-short fields with per-field messages', () => {
    const r = decisionInputSchema.safeParse({ decision: '', context: '', reasoning: 'short', values: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(['decision', 'reasoning']);
  });

  it('rejects over-long input', () => {
    const r = decisionInputSchema.safeParse({ ...validInput, reasoning: 'x'.repeat(LIMITS.reasoningMax + 1) });
    expect(r.success).toBe(false);
  });

  it('allows empty optional context and values', () => {
    expect(decisionInputSchema.safeParse({ ...validInput, context: '', values: [] }).success).toBe(true);
  });

  it('rejects non-string and missing fields', () => {
    expect(decisionInputSchema.safeParse({ decision: 5 }).success).toBe(false);
  });
});

describe('reportSchema', () => {
  it('accepts a valid report', () => expect(reportSchema.safeParse(validReport).success).toBe(true));
  it('rejects unknown importance levels', () => {
    const bad = { ...validReport, overlooked_factors: [{ title: 'a', description: 'b', importance: 'critical' }] };
    expect(reportSchema.safeParse(bad).success).toBe(false);
  });
  it('requires at least one reflection question', () => {
    expect(reportSchema.safeParse({ ...validReport, reflection_questions: [] }).success).toBe(false);
  });
});
