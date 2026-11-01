'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuiState } from '@assistant-ui/react';
import { formatMoney, worksheetView } from '../lib/worksheet-view';
import { ThreadList } from './thread-list';

const statusLabels = { empty: 'Waiting for a recipe', blocked: 'Needs your input', recalculating: 'Awaiting recalculation', ready: 'Ready for review', approved: 'Reviewed draft' };

export function WorksheetShell({ children }: { children: ReactNode }) {
  const messages = useAuiState(state => state.thread.messages);
  const running = useAuiState(state => state.thread.isRunning);
  const view = worksheetView(messages);
  const [mode, setMode] = useState('Checking connection');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/chat', { signal: controller.signal }).then(response => response.json()).then(health => {
      setMode(health.mode === 'offline-synthetic' ? 'Offline synthetic demo' : health.configured ? 'Meta · synthetic catalog' : 'Meta not configured');
    }).catch(() => { if (!controller.signal.aborted) setMode('Connection unavailable'); });
    return () => controller.abort();
  }, []);
  const steps = [
    { label: 'Recipe and servings', done: Boolean(view.proposal) },
    { label: 'Resolve missing facts', done: Boolean(view.proposal) && view.status !== 'blocked' },
    { label: 'Calculate purchase packs', done: view.subtotalCents !== null },
    { label: 'Review the current revision', done: view.status === 'approved' },
  ];
  return <main className="worksheet-app">
    <aside className="recipe-sidebar" aria-label="Recipe threads">
      <div className="wordmark">PREP / ORDER</div>
      <p className="eyebrow">Restaurant worksheet</p>
      <ThreadList />
      <div className="sidebar-note"><span className="status-dot" />{mode}<p>Keep the questions visible.<br />Review every draft.</p></div>
    </aside>
    <section className="chat-column" aria-label="Recipe conversation">
      <header className="worksheet-header"><div><p className="eyebrow">Recipe to order draft</p><h1>Order worksheet</h1></div><span className="draft-badge">Drafts only</span></header>
      <div className="chat-content">{children}</div>
    </section>
    <aside className="worksheet-inspector" aria-label="Worksheet status">
      <div className="inspector-section"><p className="eyebrow">Current worksheet</p><h2 role="status">{statusLabels[view.status]}</h2>
        <p className="muted">{running ? 'Updating the conversation...' : view.proposal ? `${view.proposal.servings} planned servings` : 'Start with synthetic bistro stew or tomato soup.'}</p>
        <ol className="step-list" aria-label="Worksheet progress">{steps.map((step, index) => <li key={step.label} data-complete={step.done}><span aria-hidden="true">{step.done ? '✓' : index + 1}</span>{step.label}{step.done && <span className="sr-only"> complete</span>}</li>)}</ol>
      </div>
      {view.questions.length > 0 && <section className="inspector-section blocker-panel"><h3>Open questions</h3>{view.questions.map((question, index) => <p key={index}><strong>{question.ingredient}</strong><br />{question.reason}</p>)}</section>}
      <section className="inspector-section"><h3>Vendor groups</h3>
        {view.vendors.length === 0 ? <p className="muted">Catalog-backed purchase packs appear here.</p> : view.vendors.map(vendor => <div className="vendor-group" key={vendor.id}><strong>{vendor.id}</strong><p>{vendor.lines.length} catalog lines</p>{vendor.lines.map(line => <div className="vendor-line" key={line.sku}><span>{line.sku} · {line.packs} packs</span><span>{formatMoney(line.lineCents, line.currency)}</span></div>)}</div>)}
        <div className="subtotal"><span>Draft subtotal</span><strong>{view.subtotalCents === null ? 'Pending review' : view.proposal?.draft.currency ? formatMoney(view.subtotalCents, view.proposal.draft.currency) : 'No purchases'}</strong></div><p className="fine-print">Tax, freight and fees excluded.</p>
      </section>
      <section className="inspector-section"><h3>Revision history</h3>{view.revisions.length === 0 ? <p className="muted">Each recalculated draft stays in this thread.</p> : <ol className="revision-list">{view.revisions.map(revision => <li key={revision.number}><strong>Revision {revision.number}</strong><span>{revision.proposal.servings} servings · {revision.proposal.draft.status === 'needsReview' ? 'Needs review' : revision.proposal.draft.currency && revision.proposal.draft.subtotalCents !== null ? formatMoney(revision.proposal.draft.subtotalCents, revision.proposal.draft.currency) : 'No purchases'}</span></li>)}</ol>}{view.revisionId && <p className="fine-print revision-id">Server revision {view.revisionId}</p>}</section>
      <details className="inspector-section export-preview"><summary>Read-only export preview</summary><p className="fine-print">Preview only. No file is created or sent.</p><textarea aria-label="Order draft export preview" readOnly value={view.preview} rows={9} /></details>
    </aside>
  </main>;
}
