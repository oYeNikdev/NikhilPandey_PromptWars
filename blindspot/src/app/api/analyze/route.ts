import { NextResponse } from 'next/server';
import { AnalysisError, analyzeDecision } from '@/lib/gemini';
import { createRateLimiter } from '@/lib/rateLimit';
import { decisionInputSchema, fieldErrors } from '@/lib/schema';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 12_000;
const limiter = createRateLimiter(10, 10 * 60 * 1000);

const FRIENDLY_ERROR = "We couldn't analyze your reasoning right now. Please try again.";

async function readBody(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength > MAX_BODY_BYTES) return null;

  const reader = request.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const limit = limiter.check(clientKey(request));
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const body = await readBody(request);
  if (body === null) {
    return NextResponse.json({ error: 'Your input is too long.' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = decisionInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fix the highlighted fields.', fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const report = await analyzeDecision(parsed.data);
    return NextResponse.json({ report }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const known = error instanceof AnalysisError;
    const stage = known ? error.stage : 'unknown';
    const detail = known ? error.message : `unexpected ${error instanceof Error ? error.name : 'error'}`;
    console.error(`[analyze] failed stage=${stage} detail=${detail}`);
    // The detail holds no key or user text; it is shown to the client in development only.
    const debug = process.env.NODE_ENV === 'development' ? { stage, detail } : undefined;
    return NextResponse.json({ error: FRIENDLY_ERROR, debug }, { status: 502 });
  }
}
