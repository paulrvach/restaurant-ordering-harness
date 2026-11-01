'use client';

import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  approveOrderDraftInputSchema,
  approveOrderDraftOutputSchema,
  type ApproveOrderDraftInput,
  type ApproveOrderDraftOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';
import { CardNotice, money, useCardSubmission } from './card-controls';

function ApprovalCard({ args, result, addResult }: {
  args: ApproveOrderDraftInput;
  result: ApproveOrderDraftOutput | undefined;
  addResult: (result: ApproveOrderDraftOutput) => void;
}) {
  const submission = useCardSubmission(addResult, result);
  return (
    <section className="tool-card" aria-label="Final review card" style={{ border: '1px solid #bbb', borderRadius: 8, padding: 16, margin: '12px 0' }}>
      <h3 style={{ marginTop: 0 }}>Review and approve</h3>
      <p>Revision {args.revisionId}. {args.lineCount} lines. Subtotal {money(args.subtotalCents, args.currency)}.</p>
      <p>Approval applies to this revision. Servings, stock or offer edits require another review. This remains a draft.</p>
      {submission.result ? <p role="status">{submission.result.approved ? 'Draft approval recorded' : 'Revision requested'}. Nothing was sent.</p> : (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => submission.submit({ approved: true, revisionId: args.revisionId })}>Approve draft</button>
            <button type="button" onClick={() => submission.submit({ approved: false, revisionId: args.revisionId })}>Revise</button>
          </div>
          {submission.error && <p role="alert">{submission.error}</p>}
        </>
      )}
    </section>
  );
}

export const ApproveOrderDraftUI = makeAssistantToolUI<ApproveOrderDraftInput, ApproveOrderDraftOutput>({
  toolName: 'approveOrderDraft',
  render: ({ args, result, status, addResult, toolCallId }) => {
    const input = approveOrderDraftInputSchema.safeParse(args);
    if (!input.success) return <CardNotice status={status.type === 'running' ? 'running' : 'incomplete'} label="final review" />;
    if (status.type === 'running') return <CardNotice status="running" label="final review" />;
    if (status.type === 'incomplete') return <CardNotice status="incomplete" label="final review" />;
    const output = approveOrderDraftOutputSchema.safeParse(result);
    if (result !== undefined && !output.success) return <CardNotice status="incomplete" label="approval result" />;
    return <ApprovalCard key={toolCallId} args={input.data} result={output.success ? output.data : undefined} addResult={addResult} />;
  },
});
