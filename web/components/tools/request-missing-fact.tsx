'use client';

import { useId, useState } from 'react';
import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  requestMissingFactInputSchema,
  requestMissingFactOutputSchema,
  type RequestMissingFactInput,
  type RequestMissingFactOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
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
    <Card aria-label="Missing fact card" className="my-3">
      <CardHeader>
        <CardTitle>{args.label}</CardTitle>
        <CardDescription>{args.ingredient} / {args.sku} / {args.topic}</CardDescription>
      </CardHeader>
      <CardContent>
        <p id={`${inputId}-reason`} className="text-sm text-muted-foreground">{args.reason}</p>
      </CardContent>
      <CardFooter className="flex-col items-stretch">
        {submission.result ? <p role="status" className="text-sm">Answer recorded: {submission.result.value}</p> : (
          <form onSubmit={(event) => { event.preventDefault(); if (answer.success) submission.submit(answer.data); }}>
            <Field>
              <FieldLabel htmlFor={inputId}>{args.label}</FieldLabel>
              <div className="flex gap-2">
                <Input id={inputId} aria-describedby={`${inputId}-reason`} value={value} placeholder={args.placeholder} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1" />
                <Button type="submit" disabled={!answer.success}>Answer</Button>
              </div>
              <FieldDescription>Answer with a measured value so the draft can recalculate.</FieldDescription>
            </Field>
            {submission.error && <FieldError errors={[{ message: submission.error }]} />}
          </form>
        )}
      </CardFooter>
    </Card>
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
