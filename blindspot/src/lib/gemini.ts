import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { findDirective } from './guard';
import { buildUserPrompt, SYSTEM_INSTRUCTION } from './prompt';
import { reportSchema, type DecisionInput, type Report } from './schema';

export type FailureStage = 'config' | 'gemini-call' | 'timeout' | 'parse';

/** A failure with a stage and a detail string that never contains the API key or user text. */
export class AnalysisError extends Error {
  constructor(readonly stage: FailureStage, message: string) {
    super(message);
  }
}

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const TIMEOUT_MS = 40_000;
const MAX_OUTPUT_TOKENS = 8192; // thinking tokens count against this budget
const MAX_ATTEMPTS = 2;

export type Generate = (input: DecisionInput) => Promise<string>;

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AnalysisError('config', 'GEMINI_API_KEY is missing (set it in .env.local and restart the server)');
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const redact = (text: string) => text.replace(/AIza[\w-]{20,}/g, '[redacted-key]').slice(0, 400);

/** Request sent to Gemini. Sampling params (temperature, top_p, top_k) are deprecated, so none are set. */
export function buildRequest(input: DecisionInput, model = process.env.GEMINI_MODEL || DEFAULT_MODEL) {
  return {
    model,
    contents: buildUserPrompt(input),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Gemini 3.x selects reasoning effort with a level; 2.5 uses budgets, so leave it alone there.
      ...(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
    },
  };
}

/** One Gemini call that asks for JSON output under the Blindspot system instruction. */
export const generateWithGemini: Generate = async (input) => {
  const request = buildRequest(input);
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[gemini] API key ${process.env.GEMINI_API_KEY ? 'detected' : 'missing'}, model=${request.model}`);
  }

  const call = getClient().models.generateContent(request);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AnalysisError('timeout', `no response within ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([call, timeout]);
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && String(finishReason) !== 'STOP') console.warn(`[gemini] finishReason=${finishReason}`);
    return response.text ?? '';
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    const status = (error as { status?: number }).status;
    throw new AnalysisError('gemini-call', `HTTP ${status ?? 'n/a'}: ${redact(String((error as Error).message))}`);
  } finally {
    clearTimeout(timer);
  }
};

/** Validates model text. Returns the report, or a reason (never user content) for rejecting it. */
export function checkReport(raw: string): { report: Report } | { reason: string } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!cleaned) return { reason: 'empty response from model' };

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return { reason: `response is not valid JSON (${cleaned.length} chars, possibly truncated)` };
  }

  const result = reportSchema.safeParse(json);
  if (!result.success) {
    const paths = [...new Set(result.error.issues.map((i) => i.path.join('.') || '(root)'))].slice(0, 6);
    return { reason: `schema mismatch at: ${paths.join(', ')}` };
  }
  if (findDirective(result.data)) return { reason: 'verdict language detected' };
  return { report: result.data };
}

export function parseReport(raw: string): Report | null {
  const result = checkReport(raw);
  return 'report' in result ? result.report : null;
}

/** Calls the model and retries once if output is malformed or reads like a verdict. */
export async function analyzeDecision(input: DecisionInput, generate: Generate = generateWithGemini): Promise<Report> {
  let lastReason = 'unknown';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = checkReport(await generate(input));
    if ('report' in result) return result.report;
    lastReason = result.reason;
    console.warn(`[analyze] attempt ${attempt}/${MAX_ATTEMPTS} rejected: ${lastReason}`);
  }
  throw new AnalysisError('parse', lastReason);
}
