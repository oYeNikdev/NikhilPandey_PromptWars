'use client';

import { useEffect, useRef, useState } from 'react';
import type { Report } from '@/lib/schema';

interface Item { title: string; description: string; tag?: string }

const REFLECTION_PROMPTS = [
  'Which blind spot surprised you most?',
  'What information would most change your thinking?',
  'What would make you change your mind?',
];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="section">
      <h3 id={id}>{title}</h3>
      {intro && <p className="intro">{intro}</p>}
      {children}
    </section>
  );
}

function ItemList({ items, empty }: { items: Item[]; empty?: string }) {
  if (items.length === 0) return empty ? <p className="muted">{empty}</p> : null;
  return (
    <ul className="items">
      {items.map((item) => (
        <li key={item.title}>
          <p className="item-title">
            {item.title}
            {item.tag && <span className="tag">{item.tag}</span>}
          </p>
          <p>{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

function toText(report: Report, notes: string[]): string {
  const list = (name: string, items: Item[]) =>
    items.length ? `\n${name}\n${items.map((i) => `- ${i.title}: ${i.description}`).join('\n')}\n` : '';
  const answered = REFLECTION_PROMPTS.map((q, i) => (notes[i]?.trim() ? `${q}\n${notes[i].trim()}` : '')).filter(Boolean);
  return [
    'BLINDSPOT REPORT',
    `\nSummary\n${report.reasoning_summary}`,
    list('Assumptions', report.assumptions),
    list('Overlooked factors', report.overlooked_factors),
    list('Missing evidence', report.missing_evidence),
    list('Reasoning tensions', report.reasoning_tensions),
    list('Alternative perspectives', report.alternative_perspectives),
    `\nQuestions worth exploring\n${report.reflection_questions.map((q) => `- ${q}`).join('\n')}`,
    `\nKey takeaway\n${report.key_takeaway}`,
    answered.length ? `\nMy reflections\n${answered.join('\n\n')}` : '',
    '\nThe decision remains mine.',
  ].join('\n');
}

export function BlindSpotReport({ report, onReset, onEdit }: { report: Report; onReset: () => void; onEdit: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [notes, setNotes] = useState<string[]>(['', '', '']);
  const [copied, setCopied] = useState(false);

  useEffect(() => { headingRef.current?.focus(); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toText(report, notes));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article aria-labelledby="report-title" className="report">
      <h2 id="report-title" ref={headingRef} tabIndex={-1}>Your blind spot report</h2>

      <Section id="summary" title="What you seem to be prioritizing">
        <p>{report.reasoning_summary}</p>
      </Section>

      <Section id="assumptions" title="Assumptions to test" intro="Things your reasoning treats as true that haven't been checked.">
        <ItemList items={report.assumptions.map((a) => ({ ...a, tag: `Impact if wrong: ${a.impact_if_wrong}` }))} empty="No clear unstated assumptions found." />
      </Section>

      <Section id="overlooked" title="Factors you may have overlooked">
        <ItemList items={report.overlooked_factors.map((f) => ({ ...f, tag: `Importance: ${f.importance}` }))} empty="Nothing obvious stands out as overlooked." />
      </Section>

      <Section id="evidence" title="Evidence worth gathering">
        <ItemList items={report.missing_evidence} empty="No specific missing evidence identified." />
      </Section>

      <Section id="tensions" title="Tensions in your reasoning">
        <ItemList items={report.reasoning_tensions} empty="No clear conflict between your values and your reasoning in what you shared." />
      </Section>

      <Section id="perspectives" title="Other ways to see it">
        <ItemList items={report.alternative_perspectives} />
      </Section>

      <Section id="questions" title="Questions worth exploring">
        <ul className="questions">
          {report.reflection_questions.map((q) => <li key={q}>{q}</li>)}
        </ul>
      </Section>

      <Section id="takeaway" title="Key takeaway">
        <p className="takeaway">{report.key_takeaway}</p>
        <p className="muted"><strong>What this can&apos;t tell you:</strong> {report.uncertainty_note}</p>
      </Section>

      <Section id="reflect" title="Your reflection" intro="Notes stay in this browser tab only. Nothing is saved.">
        {REFLECTION_PROMPTS.map((prompt, i) => (
          <div className="field" key={prompt}>
            <label htmlFor={`note-${i}`}>{prompt}</label>
            <textarea id={`note-${i}`} rows={3} value={notes[i]} maxLength={1000}
              onChange={(e) => setNotes((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))} />
          </div>
        ))}
        <p className="decision-yours">The decision remains yours.</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={copy}>Copy report and notes</button>
          <button type="button" className="btn ghost" onClick={onEdit}>Edit my answers</button>
          <button type="button" className="btn ghost" onClick={onReset}>Start over</button>
        </div>
        <p role="status" className="muted">{copied ? 'Copied to clipboard.' : ''}</p>
      </Section>
    </article>
  );
}
