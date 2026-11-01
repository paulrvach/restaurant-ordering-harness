'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuiState } from '@assistant-ui/react';
import { formatMoney, worksheetView } from '../lib/worksheet-view';
import { ThreadList } from './thread-list';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

const statusLabels = {
  empty: 'Waiting for a recipe',
  blocked: 'Needs your input',
  recalculating: 'Awaiting recalculation',
  ready: 'Ready for review',
  approved: 'Reviewed draft',
} as const;

const statusVariants = {
  empty: 'outline',
  blocked: 'destructive',
  recalculating: 'secondary',
  ready: 'default',
  approved: 'default',
} as const;

export function WorksheetShell({ children }: { children: ReactNode }) {
  const messages = useAuiState((state) => state.thread.messages);
  const running = useAuiState((state) => state.thread.isRunning);
  const view = worksheetView(messages);
  const [mode, setMode] = useState('Checking connection');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/chat', { signal: controller.signal })
      .then((response) => response.json())
      .then((health) => {
        setMode(health.mode === 'offline-synthetic' ? 'Offline synthetic demo' : health.configured ? 'Meta · synthetic catalog' : 'Meta not configured');
      })
      .catch(() => {
        if (!controller.signal.aborted) setMode('Connection unavailable');
      });
    return () => controller.abort();
  }, []);
  const steps = [
    { label: 'Recipe and servings', done: Boolean(view.proposal) },
    { label: 'Resolve missing facts', done: Boolean(view.proposal) && view.status !== 'blocked' },
    { label: 'Calculate purchase packs', done: view.subtotalCents !== null },
    { label: 'Review the current revision', done: view.status === 'approved' },
  ];
  return (
    <main className="mx-auto grid h-dvh max-w-[1800px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside aria-label="Recipe threads" className="flex flex-col gap-3 border-b p-4 lg:border-r lg:border-b-0">
        <div>
          <p className="text-lg font-bold tracking-tight">Prep / Order</p>
          <p className="text-xs text-muted-foreground">Restaurant worksheet</p>
        </div>
        <ThreadList />
        <div className="text-xs text-muted-foreground">
          <p>{mode}</p>
          <p className="mt-2">Keep the questions visible. Review every draft.</p>
        </div>
      </aside>
      <section aria-label="Recipe conversation" className="flex min-h-[70dvh] min-w-0 flex-col lg:min-h-0">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Recipe to order draft</p>
            <h1 className="text-xl font-semibold tracking-tight">Order worksheet</h1>
          </div>
          <Badge variant="outline">Drafts only</Badge>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
      <aside aria-label="Worksheet status" className="overflow-y-auto border-t lg:border-t-0 lg:border-l">
        <div className="space-y-4 p-4">
          <Card>
            <CardHeader>
              <p className="text-xs text-muted-foreground">Current worksheet</p>
              <div className="flex items-center gap-2">
                <CardTitle>{statusLabels[view.status]}</CardTitle>
              </div>
              <Badge variant={statusVariants[view.status]} className="w-fit">
                {view.status === 'blocked' ? 'Needs review' : view.status === 'empty' ? 'Empty' : view.status === 'approved' ? 'Approved' : view.status === 'ready' ? 'Draft' : 'Recalculating'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p role="status" className="text-sm text-muted-foreground">
                {running ? 'Updating the conversation…' : view.proposal ? `${view.proposal.servings} planned servings` : 'Start with synthetic bistro stew or tomato soup.'}
              </p>
              <Separator />
              <ol aria-label="Worksheet progress" className="grid gap-2">
                {steps.map((step, index) => (
                  <li key={step.label} className="flex items-center gap-2 text-xs text-muted-foreground data-[complete=true]:text-foreground" data-complete={step.done}>
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full border text-[10px]">
                      {step.done ? '✓' : index + 1}
                    </span>
                    {step.label}
                    {step.done && <span className="sr-only"> complete</span>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          {view.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Open questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {view.questions.map((question, index) => (
                  <p key={index} className="text-xs">
                    <strong>{question.ingredient}</strong>
                    <br />
                    {question.reason}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Vendor groups</CardTitle>
            </CardHeader>
            <CardContent>
              {view.vendors.length === 0 ? (
                <p className="text-xs text-muted-foreground">Catalog-backed purchase packs appear here.</p>
              ) : (
                view.vendors.map((vendor) => (
                  <div key={vendor.id} className="mb-3 text-xs">
                    <strong>{vendor.id}</strong>
                    <p className="text-muted-foreground">{vendor.lines.length} catalog lines</p>
                    {vendor.lines.map((line) => (
                      <div key={line.sku} className="my-1 flex justify-between gap-2">
                        <span>
                          {line.sku} · {line.packs} packs
                        </span>
                        <span>{formatMoney(line.lineCents, line.currency)}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <Separator className="my-3" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Draft subtotal</span>
                <strong className="text-xl tracking-tight">
                  {view.subtotalCents === null
                    ? 'Pending review'
                    : view.proposal?.draft.currency
                      ? formatMoney(view.subtotalCents, view.proposal.draft.currency)
                      : 'No purchases'}
                </strong>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Tax, freight and fees excluded.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revision history</CardTitle>
            </CardHeader>
            <CardContent>
              {view.revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Each recalculated draft stays in this thread.</p>
              ) : (
                <ol className="grid gap-3 text-xs">
                  {view.revisions.map((revision) => (
                    <li key={revision.number} className="flex flex-col gap-0.5">
                      <strong>Revision {revision.number}</strong>
                      <span className="text-muted-foreground">
                        {revision.proposal.servings} servings ·{' '}
                        {revision.proposal.draft.status === 'needsReview'
                          ? 'Needs review'
                          : revision.proposal.draft.currency && revision.proposal.draft.subtotalCents !== null
                            ? formatMoney(revision.proposal.draft.subtotalCents, revision.proposal.draft.currency)
                            : 'No purchases'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {view.revisionId && <p className="mt-2 text-[10px] text-muted-foreground break-all">Server revision {view.revisionId}</p>}
            </CardContent>
          </Card>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-xs font-bold">Read-only export preview</summary>
            <p className="mt-1 text-[10px] text-muted-foreground">Preview only. No file is created or sent.</p>
            <Textarea aria-label="Order draft export preview" readOnly value={view.preview} rows={9} className="mt-2 font-mono text-[10px] leading-relaxed" />
          </details>
        </div>
      </aside>
    </main>
  );
}
