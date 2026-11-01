'use client';

import { useState } from 'react';
import Decimal from 'decimal.js';
import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  proposeOrderDraftInputSchema,
  proposeOrderDraftOutputSchema,
  type ProposeOrderDraftInput,
  type ProposeOrderDraftOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../ui/field';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { CardNotice, money, useCardSubmission } from './card-controls';

type StockRow = { ingredient: string; amount: string; unit: 'g' | 'kg' | 'ml' | 'l' | 'each' };

const HEADS = ['Ingredient / SKU', 'Demand', 'Stock deducted', 'Net need', 'Packs', 'Purchased', 'Excess', 'Pack price', 'Line subtotal', 'Source / quote date'];

function DraftCard({ args, result, addResult }: {
  args: ProposeOrderDraftInput;
  result: ProposeOrderDraftOutput | undefined;
  addResult: (result: ProposeOrderDraftOutput) => void;
}) {
  const [servings, setServings] = useState(String(args.servings));
  const [stock, setStock] = useState<StockRow[]>(() => args.stockEdits.map((row) => ({ ...row, amount: String(row.amount) })));
  const submission = useCardSubmission(addResult, result);
  const parsed = proposeOrderDraftOutputSchema.safeParse({
    approved: true,
    servings: servings.trim() === '' ? NaN : Number(servings),
    stockEdits: stock.map((row) => ({ ...row, ingredient: row.ingredient.trim(), amount: row.amount.trim() === '' ? NaN : Number(row.amount) })),
  });
  const updateStock = (index: number, edit: Partial<StockRow>) => setStock((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...edit } : row));
  const blocked = args.draft.status !== 'draft' || args.draft.subtotalCents === null;
  return (
    <Card aria-label="Order worksheet card" className="my-3">
      <CardHeader>
        <CardTitle>Order worksheet</CardTitle>
        <CardDescription>
          {blocked ? 'Needs review. Resolve the questions before final approval.' : `Draft subtotal ${money(args.draft.subtotalCents, args.draft.currency)}`}
        </CardDescription>
        <CardAction>
          <Badge variant={blocked ? 'destructive' : 'default'}>{blocked ? 'Needs review' : 'Draft'}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>{HEADS.map((head) => <TableHead key={head} scope="col">{head}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>{args.draft.lines.map((line) => (
            <TableRow key={`${line.vendorId}:${line.sku}`}>
              <TableCell>{line.ingredient}<br />{line.sku}<br />{line.vendorId}</TableCell>
              <TableCell>{line.demandBase} {line.baseUnit}</TableCell>
              <TableCell>{new Decimal(line.demandBase).minus(line.netDemandBase).toString()} {line.baseUnit}</TableCell>
              <TableCell>{line.netDemandBase} {line.baseUnit}</TableCell>
              <TableCell>{line.packs}</TableCell>
              <TableCell>{line.purchasedBase} {line.baseUnit}</TableCell>
              <TableCell>{line.excessBase} {line.baseUnit}</TableCell>
              <TableCell>{money(line.priceCents, line.currency)}</TableCell>
              <TableCell>{money(line.lineCents, line.currency)}</TableCell>
              <TableCell>{line.source}<br />{line.quotedOn}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
        {args.draft.issues.length > 0 && (
          <Alert aria-label="Review questions">
            <AlertTitle>Review questions</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">{args.draft.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        {submission.result ? (
          <p role="status" className="text-sm">{submission.result.approved ? 'Review recorded' : 'Questions requested'}. Servings {submission.result.servings}. {submission.result.stockEdits.length} stock entries recorded. Changes require a new calculation.</p>
        ) : (
          <>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="draft-servings">Servings</FieldLabel>
                <Input id="draft-servings" aria-label="Servings" type="number" min="0.000001" max="1000000" step="any" value={servings} onChange={(event) => setServings(event.target.value)} className="w-28" />
                <FieldDescription>Positive servings. Demand, packs and subtotal recalculate.</FieldDescription>
              </Field>
              <FieldSet>
                <FieldLegend>Stock on hand</FieldLegend>
                {stock.map((row, index) => (
                  <div key={index} className="flex flex-wrap gap-2">
                    <Input aria-label={`Stock ingredient ${index + 1}`} placeholder="Ingredient" value={row.ingredient} onChange={(event) => updateStock(index, { ingredient: event.target.value })} className="min-w-28 flex-1" />
                    <Input aria-label={`Stock amount ${index + 1}`} type="number" min="0" max="1000000000" step="any" value={row.amount} onChange={(event) => updateStock(index, { amount: event.target.value })} className="w-24" />
                    <select aria-label={`Stock unit ${index + 1}`} value={row.unit} onChange={(event) => updateStock(index, { unit: event.target.value as StockRow['unit'] })} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                      {(['g', 'kg', 'ml', 'l', 'each'] as const).map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                    <Button type="button" variant="outline" size="sm" aria-label={`Remove stock ${index + 1}`} onClick={() => setStock((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={stock.length >= 500} onClick={() => setStock((rows) => [...rows, { ingredient: '', amount: '0', unit: 'g' }])} className="w-fit">Add stock</Button>
              </FieldSet>
            </FieldGroup>
            {!parsed.success && <FieldError errors={[{ message: 'Enter positive servings and valid stock amounts with ingredient names.' }]} />}
            {submission.error && <FieldError errors={[{ message: submission.error }]} />}
            <p className="text-xs text-muted-foreground">Edits recalculate demand, packs and subtotal before final review. Taxes and freight are excluded.</p>
            <div className="flex gap-2">
              <Button type="button" disabled={!parsed.success || blocked} onClick={() => { if (parsed.success && !blocked) submission.submit(parsed.data); }}>Review draft</Button>
              <Button type="button" variant="outline" disabled={!parsed.success} onClick={() => { if (parsed.success) submission.submit({ ...parsed.data, approved: false }); }}>Ask first</Button>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export const ProposeOrderDraftUI = makeAssistantToolUI<ProposeOrderDraftInput, ProposeOrderDraftOutput>({
  toolName: 'proposeOrderDraft',
  render: ({ args, result, status, addResult, toolCallId }) => {
    const input = proposeOrderDraftInputSchema.safeParse(args);
    if (!input.success) return <CardNotice status={status.type === 'running' ? 'running' : 'incomplete'} label="worksheet" />;
    if (status.type === 'running') return <CardNotice status="running" label="worksheet" />;
    if (status.type === 'incomplete') return <CardNotice status="incomplete" label="worksheet" />;
    const output = proposeOrderDraftOutputSchema.safeParse(result);
    if (result !== undefined && !output.success) return <CardNotice status="incomplete" label="worksheet result" />;
    return <DraftCard key={toolCallId} args={input.data} result={output.success ? output.data : undefined} addResult={addResult} />;
  },
});
