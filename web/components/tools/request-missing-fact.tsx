'use client';

import { useId, useState } from 'react';
import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  requestMissingFactInputSchema,
  requestMissingFactOutputSchema,
  type RequestMissingFactInput,
  type RequestMissingFactOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';
import { CardNotice, useCardSubmission } from './card-controls';

function MissingFactCard({ args, result, addResult }: {
  args: RequestMissingFactInput;
  result: RequestMissingFactOutput | undefined;
  addResult: (result: RequestMissingFactOutput) => void;
}) {
  const inputId = useId();
  const [value, setValue] = useState('');
  const submission = useCardSubmission(addResult, result);
  const answer = requestMissingFactOutputSchema.safeParse({ ingredient: args.ingredient, sku: args.sku, topic: args.topic, value: value.trim() });
  return (
    <section className="tool-card" aria-label="Missing fact card" style={{ border: '1px solid #bbb', borderRadius: 8, padding: 16, margin: '12px 0' }}>
      <h3 style={{ marginTop: 0 }}>{args.label}</h3>
      <p>{args.ingredient} / {args.sku} / {args.topic}</p>
      <p id={`${inputId}-reason`}>{args.reason}</p>
      {submission.result ? <p role="status">Answer recorded: {submission.result.value}</p> : (
        <form onSubmit={(event) => { event.preventDefault(); if (answer.success) submission.submit(answer.data); }}>
          <label htmlFor={inputId}>{args.label}</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input id={inputId} aria-describedby={`${inputId}-reason`} value={value} placeholder={args.placeholder} onChange={(event) => setValue(event.target.value)} style={{ flex: 1, minWidth: 0 }} />
            <button type="submit" disabled={!answer.success}>Answer</button>
          </div>
          {submission.error && <p role="alert">{submission.error}</p>}
        </form>
      )}
    </section>
  );
}

export const RequestMissingFactUI = makeAssistantToolUI<RequestMissingFactInput, RequestMissingFactOutput>({
  toolName: 'requestMissingFact',
  render: ({ args, result, status, addResult, toolCallId }) => {
    const input = requestMissingFactInputSchema.safeParse(args);
    if (!input.success) return <CardNotice status={status.type === 'running' ? 'running' : 'incomplete'} label="review question" />;
    if (status.type === 'running') return <CardNotice status="running" label="review question" />;
    if (status.type === 'incomplete') return <CardNotice status="incomplete" label="review question" />;
    const output = requestMissingFactOutputSchema.safeParse(result);
    if (result !== undefined && !output.success) return <CardNotice status="incomplete" label="answer" />;
    return <MissingFactCard key={toolCallId} args={input.data} result={output.success ? output.data : undefined} addResult={addResult} />;
  },
});
