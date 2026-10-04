'use client';

import { useEffect, useRef, useState } from 'react';
import { BlindSpotReport } from '@/components/Report';
import { DecisionForm } from '@/components/DecisionForm';
import { Logo } from '@/components/Logo';
import type { DecisionInput, Report } from '@/lib/schema';

type View =
  | { name: 'input' }
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'report'; report: Report };

const EMPTY: DecisionInput = { decision: '', context: '', reasoning: '', values: [] };
const CLIENT_TIMEOUT_MS = 90_000;
const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";

export default function Home() {
  const [view, setView] = useState<View>({ name: 'input' });
  const [input, setInput] = useState<DecisionInput>(EMPTY);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (view.name === 'error') alertRef.current?.focus(); }, [view]);

  async function analyze(next: DecisionInput) {
    setInput(next);
    setView({ name: 'loading' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.report) {
        setView({ name: 'error', message: typeof data.error === 'string' ? data.error : NETWORK_ERROR });
        return;
      }
      setView({ name: 'report', report: data.report as Report });
    } catch {
      setView({ name: 'error', message: NETWORK_ERROR });
    } finally {
      clearTimeout(timer);
    }
  }

  const showHero = view.name === 'input';

  return (
    <>
      <header className="site-header">
        <span className="brand"><Logo /> Blindspot</span>
      </header>

      <main id="main" className="shell">
        {showHero && (
          <section aria-labelledby="hero-title" className="hero">
            <div>
              <h1 id="hero-title">See what your reasoning might be missing.</h1>
              <p className="lede">Describe a decision and why you&apos;re leaning one way. Blindspot points out the assumptions, gaps, and tensions in your thinking, then asks the questions worth answering. It helps you think. It doesn&apos;t decide for you.</p>
              <a className="btn primary" href="#form-title">Start with your decision</a>
            </div>
            <aside className="sample" aria-label="Example of Blindspot's output">
              <p className="sample-label">You said</p>
              <blockquote>&ldquo;The stipend is good, and the company is close to home.&rdquo;</blockquote>
              <p className="sample-label">Blindspot asks</p>
              <p>What would you need to learn in six months for this to feel worth it, and how will you find out whether this role offers it?</p>
            </aside>
          </section>
        )}

        {view.name === 'input' && <DecisionForm initial={input} busy={false} onSubmit={analyze} />}

        {view.name === 'loading' && (
          <div role="status" aria-live="polite" className="loading">
            <span className="spinner" aria-hidden="true" />
            <div>
              <p className="loading-title">Examining your reasoning...</p>
              <p className="muted">This usually takes 10 to 20 seconds.</p>
            </div>
          </div>
        )}

        {view.name === 'error' && (
          <div role="alert" tabIndex={-1} ref={alertRef} className="error-box">
            <p className="item-title">Something went wrong</p>
            <p>{view.message}</p>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => analyze(input)}>Try again</button>
              <button type="button" className="btn ghost" onClick={() => setView({ name: 'input' })}>Edit my answers</button>
            </div>
          </div>
        )}

        {view.name === 'report' && (
          <BlindSpotReport report={view.report} onEdit={() => setView({ name: 'input' })} onReset={() => { setInput(EMPTY); setView({ name: 'input' }); }} />
        )}
      </main>

      <footer className="site-footer">
        <p>Blindspot supports your thinking. It is not advice, and it never makes the decision.</p>
      </footer>
    </>
  );
}
