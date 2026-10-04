import { z } from 'zod';

export const LIMITS = {
  decisionMin: 5,
  decisionMax: 300,
  contextMax: 2000,
  reasoningMin: 20,
  reasoningMax: 2000,
  valuesMax: 8,
  valueMax: 60,
} as const;

export const decisionInputSchema = z.object({
  decision: z
    .string()
    .trim()
    .min(LIMITS.decisionMin, 'Describe the decision in at least a few words.')
    .max(LIMITS.decisionMax, `Keep the decision under ${LIMITS.decisionMax} characters.`),
  context: z
    .string()
    .trim()
    .max(LIMITS.contextMax, `Keep the context under ${LIMITS.contextMax} characters.`),
  reasoning: z
    .string()
    .trim()
    .min(LIMITS.reasoningMin, 'Explain your reasoning in at least a sentence.')
    .max(LIMITS.reasoningMax, `Keep your reasoning under ${LIMITS.reasoningMax} characters.`),
  values: z.array(z.string().trim().min(1).max(LIMITS.valueMax)).max(LIMITS.valuesMax),
});

export type DecisionInput = z.infer<typeof decisionInputSchema>;

const text = (max: number) => z.string().trim().min(1).max(max);
const level = z.enum(['low', 'medium', 'high']);
const item = z.object({ title: text(120), description: text(700) });

export const reportSchema = z.object({
  reasoning_summary: text(900),
  assumptions: z.array(item.extend({ impact_if_wrong: level })).max(5),
  overlooked_factors: z.array(item.extend({ importance: level })).max(5),
  missing_evidence: z.array(item).max(5),
  reasoning_tensions: z.array(item).max(4),
  alternative_perspectives: z.array(item).max(4),
  reflection_questions: z.array(text(300)).min(1).max(6),
  key_takeaway: text(700),
  uncertainty_note: text(500),
});

export type Report = z.infer<typeof reportSchema>;

/** Map zod issues to a { field: message } record for forms and API responses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
