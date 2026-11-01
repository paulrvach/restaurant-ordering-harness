'use client';

import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  approveOrderDraftInputSchema,
  approveOrderDraftOutputSchema,
  type ApproveOrderDraftInput,
  type ApproveOrderDraftOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { FieldError } from '../ui/field';
import { CardNotice, money, useCardSubmission } from './card-controls';

function ApprovalCard({ args, result, addResult }: {
  args: ApproveOrderDraftInput;
  result: ApproveOrderDraftOutput | undefined;
  addResult: (result: ApproveOrderDraftOutput) => void;
}) {
  const submission = useCardSubmission(addResult, result);
  const headline = `Approve revision ${args.revisionId} at ${money(args.subtotalCents, args.currency)}?`;
  return (
    <Card aria-label="Final review card" className="my-3">
      <CardHeader>
        <CardTitle>Review and approve</CardTitle>
        <CardDescription>
          Revision {args.revisionId}. {args.lineCount} lines. Subtotal {money(args.subtotalCents, args.currency)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Approval applies to this revision. Servings, stock or offer edits require another review. This remains a draft.</p>
      </CardContent>
      <CardFooter className="flex-col items-stretch">
        {submission.result ? <p role="status" className="text-sm">{submission.result.approved ? 'Draft approval recorded' : 'Revision requested'}. Nothing was sent.</p> : (
          <>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger className={buttonVariants()}>Approve draft</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{headline}</AlertDialogTitle>
                    <AlertDialogDescription>
                      This records approval for revision {args.revisionId} covering {args.lineCount} lines. Nothing is sent to any vendor.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Revise instead</AlertDialogCancel>
                    <AlertDialogAction onClick={() => submission.submit({ approved: true, revisionId: args.revisionId })}>Confirm approval</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" variant="outline" onClick={() => submission.submit({ approved: false, revisionId: args.revisionId })}>Revise</Button>
            </div>
            {submission.error && <FieldError errors={[{ message: submission.error }]} />}
          </>
        )}
      </CardFooter>
    </Card>
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
