'use client';

import { makeAssistantToolUI } from '@assistant-ui/react';
import type {
  ApproveOrderDraftInput,
  ApproveOrderDraftOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';

/** Final review gate. Approval binds to the exact revision; never transmits. */
export const ApproveOrderDraftUI = makeAssistantToolUI<ApproveOrderDraftInput, ApproveOrderDraftOutput>({
  toolName: 'approveOrderDraft',
  render: ({ args, addResult }) => (
    <div style={{ border: '1px solid #999', padding: 12, margin: '8px 0', maxWidth: 640 }}>
      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Review and approve</p>
      <p style={{ fontSize: 13, margin: '0 0 8px' }}>
        Revision {args.revisionId} · {args.lineCount} lines · {(args.subtotalCents / 100).toFixed(2)} {args.currency}.
        Servings, stock or offer edits invalidate this approval. Nothing is sent.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => addResult({ approved: true, revisionId: args.revisionId })}>
          Approve
        </button>
        <button type="button" onClick={() => addResult({ approved: false, revisionId: args.revisionId })}>
          Revise
        </button>
      </div>
    </div>
  ),
});
