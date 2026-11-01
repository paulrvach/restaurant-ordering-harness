'use client';

import { useState } from 'react';
import { makeAssistantToolUI } from '@assistant-ui/react';
import type {
  ProposeOrderDraftInput,
  ProposeOrderDraftOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';

/**
 * Worksheet card: computed lines, stock, packs, source price and date per
 * SKU plus blockers. Approve returns the edited servings/stock so the agent
 * can re-run planOrder; Ask-first routes to requestMissingFact.
 */
export const ProposeOrderDraftUI = makeAssistantToolUI<ProposeOrderDraftInput, ProposeOrderDraftOutput>({
  toolName: 'proposeOrderDraft',
  render: ({ args, addResult }) => {
    const [servings, setServings] = useState(args.servings);
    const [stock, setStock] = useState(
      args.stockEdits.map((row) => `${row.ingredient}: ${row.amount} ${row.unit}`).join('\n'),
    );
    const money = (cents: number | null) => (cents == null ? '—' : `$${(cents / 100).toFixed(2)}`);
    return (
      <div style={{ border: '1px solid #999', padding: 12, margin: '8px 0', maxWidth: 640 }}>
        <p style={{ fontWeight: 600, margin: '0 0 8px' }}>
          Order worksheet · {args.draft.status} · subtotal {money(args.draft.subtotalCents)}
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              {['SKU', 'Need', 'Packs', 'Line', 'Source'].map((head) => (
                <th key={head} style={{ textAlign: 'left', borderBottom: '1px solid #999', padding: 4 }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {args.draft.lines.map((line) => (
              <tr key={line.sku}>
                <td style={{ padding: 4 }}>{line.sku}</td>
                <td style={{ padding: 4 }}>{line.netDemandBase} {line.baseUnit}</td>
                <td style={{ padding: 4 }}>{line.packs}</td>
                <td style={{ padding: 4 }}>{money(line.lineCents)}</td>
                <td style={{ padding: 4 }}>{line.source} · {line.quotedOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {args.draft.issues.length > 0 && (
          <ul style={{ color: '#8a3b00', fontSize: 13 }}>
            {args.draft.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <label style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
          Servings
          <input
            type="number"
            value={servings}
            min={1}
            onChange={(event) => setServings(Number(event.target.value))}
            style={{ marginLeft: 8, width: 90 }}
          />
        </label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
          Stock on hand (one per line)
          <textarea value={stock} onChange={(event) => setStock(event.target.value)} rows={2} style={{ display: 'block', width: '100%' }} />
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => addResult({ approved: true, servings, stockEdits: args.stockEdits })}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => addResult({ approved: false, servings, stockEdits: args.stockEdits })}
          >
            Ask first
          </button>
        </div>
      </div>
    );
  },
});
