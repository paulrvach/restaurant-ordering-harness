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
import { CardNotice, money, useCardSubmission } from './card-controls';

type StockRow = { ingredient: string; amount: string; unit: 'g' | 'kg' | 'ml' | 'l' | 'each' };

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
    <section className="tool-card" style={{ border: '1px solid #bbb', borderRadius: 8, padding: 16, margin: '12px 0', maxWidth: '100%' }} aria-label="Order worksheet card">
      <h3 style={{ margin: '0 0 8px' }}>Order worksheet</h3>
      <p>{blocked ? 'Needs review. Resolve the questions before final approval.' : `Draft subtotal ${money(args.draft.subtotalCents, args.draft.currency)}`}</p>
      <div style={{ overflowX: 'auto' }}>
        <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%', minWidth: 960, fontSize: 13 }}>
          <thead><tr>{['Ingredient / SKU', 'Demand', 'Stock deducted', 'Net need', 'Packs', 'Purchased', 'Excess', 'Pack price', 'Line subtotal', 'Source / quote date'].map((head) => <th key={head} scope="col" style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #bbb' }}>{head}</th>)}</tr></thead>
          <tbody>{args.draft.lines.map((line) => (
            <tr key={`${line.vendorId}:${line.sku}`}>
              <td style={{ padding: 6 }}>{line.ingredient}<br />{line.sku}<br />{line.vendorId}</td>
              <td>{line.demandBase} {line.baseUnit}</td>
              <td>{new Decimal(line.demandBase).minus(line.netDemandBase).toString()} {line.baseUnit}</td>
              <td>{line.netDemandBase} {line.baseUnit}</td>
              <td>{line.packs}</td>
              <td>{line.purchasedBase} {line.baseUnit}</td>
              <td>{line.excessBase} {line.baseUnit}</td>
              <td>{money(line.priceCents, line.currency)}</td>
              <td>{money(line.lineCents, line.currency)}</td>
              <td>{line.source}<br />{line.quotedOn}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {args.draft.issues.length > 0 && <ul aria-label="Review questions">{args.draft.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
      {submission.result ? (
        <p role="status">{submission.result.approved ? 'Review recorded' : 'Questions requested'}. Servings {submission.result.servings}. {submission.result.stockEdits.length} stock entries recorded. Changes require a new calculation.</p>
      ) : (
        <>
          <label style={{ display: 'block', marginTop: 12 }}>Servings <input aria-label="Servings" type="number" min="0.000001" max="1000000" step="any" value={servings} onChange={(event) => setServings(event.target.value)} style={{ width: 100, marginLeft: 8 }} /></label>
          <fieldset style={{ margin: '12px 0' }}>
            <legend>Stock on hand</legend>
            {stock.map((row, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <input aria-label={`Stock ingredient ${index + 1}`} placeholder="Ingredient" value={row.ingredient} onChange={(event) => updateStock(index, { ingredient: event.target.value })} />
                <input aria-label={`Stock amount ${index + 1}`} type="number" min="0" max="1000000000" step="any" value={row.amount} onChange={(event) => updateStock(index, { amount: event.target.value })} style={{ width: 100 }} />
                <select aria-label={`Stock unit ${index + 1}`} value={row.unit} onChange={(event) => updateStock(index, { unit: event.target.value as StockRow['unit'] })}>{(['g', 'kg', 'ml', 'l', 'each'] as const).map((unit) => <option key={unit}>{unit}</option>)}</select>
                <button type="button" aria-label={`Remove stock ${index + 1}`} onClick={() => setStock((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
              </div>
            ))}
            <button type="button" disabled={stock.length >= 500} onClick={() => setStock((rows) => [...rows, { ingredient: '', amount: '0', unit: 'g' }])}>Add stock</button>
          </fieldset>
          {!parsed.success && <p role="alert">Enter positive servings and valid stock amounts with ingredient names.</p>}
          {submission.error && <p role="alert">{submission.error}</p>}
          <p>Edits recalculate demand, packs and subtotal before final review. Taxes and freight are excluded.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={!parsed.success || blocked} onClick={() => { if (parsed.success && !blocked) submission.submit(parsed.data); }}>Review draft</button>
            <button type="button" disabled={!parsed.success} onClick={() => { if (parsed.success) submission.submit({ ...parsed.data, approved: false }); }}>Ask first</button>
          </div>
        </>
      )}
    </section>
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
