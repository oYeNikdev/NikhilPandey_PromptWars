'use client';

import { useState } from 'react';
import { decisionInputSchema, fieldErrors, LIMITS, type DecisionInput } from '@/lib/schema';

const VALUE_OPTIONS = ['Career growth', 'Money', 'Time', 'Family', 'Education', 'Location', 'Stability', 'Health'];

export const EXAMPLE: DecisionInput = {
  decision: 'Should I accept a 6-month internship while I am still in college?',
  context:
    'The stipend is 25,000 per month. The office is 20 minutes from home. Hours are 10 to 6, five days a week. The role is in marketing operations. My classes run until 2 pm on three days and I have exams in two months.',
  reasoning:
    'The stipend is good, the company is close to home, and it will give me industry experience. I think it will look good on my resume.',
  values: ['Career growth', 'Money', 'Education'],
};

interface Props {
  initial: DecisionInput;
  busy: boolean;
  onSubmit: (input: DecisionInput) => void;
}

function Counter({ id, value, max }: { id: string; value: string; max: number }) {
  return <span id={id} className="counter">{value.length} / {max}</span>;
}

export function DecisionForm({ initial, busy, onSubmit }: Props) {
  const [form, setForm] = useState<DecisionInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof DecisionInput>(key: K, value: DecisionInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleValue = (v: string) =>
    set('values', form.values.includes(v) ? form.values.filter((x) => x !== v) : [...form.values, v]);

  function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    const parsed = decisionInputSchema.safeParse(form);
    if (!parsed.success) {
      const found = fieldErrors(parsed.error);
      setErrors(found);
      const first = ['decision', 'context', 'reasoning'].find((k) => found[k]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  const fieldProps = (name: 'decision' | 'context' | 'reasoning') => ({
    id: name,
    value: form[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error ${name}-count` : `${name}-count`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(name, e.target.value),
  });

  const error = (name: string) =>
    errors[name] ? <p id={`${name}-error`} className="field-error">{errors[name]}</p> : null;

  return (
    <form onSubmit={submit} noValidate aria-labelledby="form-title" className="form">
      <h2 id="form-title">Describe your decision</h2>

      <div className="field">
        <label htmlFor="decision">What decision are you considering?</label>
        <input type="text" {...fieldProps('decision')} placeholder="Should I accept this internship?" autoComplete="off" />
        <Counter id="decision-count" value={form.decision} max={LIMITS.decisionMax} />
        {error('decision')}
      </div>

      <div className="field">
        <label htmlFor="context">Relevant context <span className="optional">(optional)</span></label>
        <textarea {...fieldProps('context')} rows={4} placeholder="Facts about the situation: numbers, dates, constraints, who is involved." />
        <Counter id="context-count" value={form.context} max={LIMITS.contextMax} />
        {error('context')}
      </div>

      <div className="field">
        <label htmlFor="reasoning">Why are you leaning the way you are?</label>
        <textarea {...fieldProps('reasoning')} rows={5} placeholder="Write it the way you'd explain it to a friend." />
        <Counter id="reasoning-count" value={form.reasoning} max={LIMITS.reasoningMax} />
        {error('reasoning')}
      </div>

      <fieldset className="field chips">
        <legend>What matters most to you? <span className="optional">(optional)</span></legend>
        <div className="chip-row">
          {VALUE_OPTIONS.map((v) => (
            <label key={v} className="chip">
              <input type="checkbox" checked={form.values.includes(v)} onChange={() => toggleValue(v)} />
              <span>{v}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="actions">
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Examining your reasoning...' : 'Find my blind spots'}
        </button>
        <button type="button" className="btn ghost" onClick={() => { setForm(EXAMPLE); setErrors({}); }}>
          Fill in an example
        </button>
      </div>
      <p className="privacy">Your text is sent to Google&apos;s Gemini API to produce the analysis. This app does not store it.</p>
    </form>
  );
}
