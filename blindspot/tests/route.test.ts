import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validInput, validReport } from './fixtures';

const analyzeDecision = vi.fn();
vi.mock('@/lib/gemini', () => ({
  analyzeDecision: (...args: unknown[]) => analyzeDecision(...args),
  AnalysisError: class AnalysisError extends Error {},
}));

const { POST } = await import('@/app/api/analyze/route');

let ipCounter = 0;
const post = (body: unknown, ip = `10.0.0.${++ipCounter}`) =>
  POST(new Request('http://x/api/analyze', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));

describe('POST /api/analyze', () => {
  beforeEach(() => { analyzeDecision.mockReset(); });

  it('returns a report for valid input', async () => {
    analyzeDecision.mockResolvedValue(validReport);
    const res = await post(validInput);
    expect(res.status).toBe(200);
    expect((await res.json()).report).toEqual(validReport);
  });

  it('returns field errors for invalid input without calling the model', async () => {
    const res = await post({ ...validInput, decision: '' });
    expect(res.status).toBe(400);
    expect((await res.json()).fields.decision).toBeTruthy();
    expect(analyzeDecision).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and oversized bodies', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post('x'.repeat(13_000))).status).toBe(413);
    const multibyteBody = JSON.stringify({ ...validInput, context: '🙂'.repeat(3_500) });
    expect((await post(multibyteBody)).status).toBe(413);
  });

  it('hides internal error details', async () => {
    analyzeDecision.mockImplementation(async () => { throw new Error('secret stack detail AIza123'); });
    const res = await post(validInput);
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).not.toContain('secret');
    expect(text).toContain("couldn't analyze");
  });

  it('rate limits repeated requests from one IP', async () => {
    analyzeDecision.mockResolvedValue(validReport);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await post(validInput, '9.9.9.9')).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
