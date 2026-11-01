import {
  approveOrderDraftInputSchema, approveOrderDraftOutputSchema,
  proposeOrderDraftInputSchema, proposeOrderDraftOutputSchema,
  requestMissingFactInputSchema, requestMissingFactOutputSchema,
  type ProposeOrderDraftInput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';

type Part = { type: string; toolName?: string; args?: unknown; result?: unknown };
type Message = { content: readonly Part[] };
type Revision = { proposal: ProposeOrderDraftInput; number: number };

export function formatMoney(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function worksheetView(messages: readonly Message[]) {
  const parts = messages.flatMap(message => message.content).filter(part => part.type === 'tool-call');
  const revisions: Revision[] = [];
  let proposal: ProposeOrderDraftInput | undefined;
  let latestIndex = -1;
  for (const [index, part] of parts.entries()) {
    if (part.toolName !== 'proposeOrderDraft') continue;
    const parsed = proposeOrderDraftInputSchema.safeParse(part.args);
    if (!parsed.success) continue;
    if (JSON.stringify(parsed.data) !== JSON.stringify(proposal)) revisions.push({ proposal: parsed.data, number: revisions.length + 1 });
    proposal = parsed.data;
    latestIndex = index;
  }
  const questions = parts.flatMap(part => {
    if (part.toolName !== 'requestMissingFact') return [];
    const input = requestMissingFactInputSchema.safeParse(part.args);
    const output = requestMissingFactOutputSchema.safeParse(part.result);
    return input.success && !output.success ? [input.data] : [];
  });
  const review = proposeOrderDraftOutputSchema.safeParse(parts[latestIndex]?.result);
  const changed = proposal && review.success && (review.data.servings !== proposal.servings || JSON.stringify(review.data.stockEdits) !== JSON.stringify(proposal.stockEdits));
  let approved = false;
  let revisionId: string | undefined;
  for (const part of parts.slice(latestIndex + 1)) {
    if (part.toolName !== 'approveOrderDraft') continue;
    const input = approveOrderDraftInputSchema.safeParse(part.args);
    const output = approveOrderDraftOutputSchema.safeParse(part.result);
    if (proposal && input.success && input.data.subtotalCents === proposal.draft.subtotalCents && input.data.currency === proposal.draft.currency && input.data.lineCount === proposal.draft.lines.length) {
      revisionId = input.data.revisionId;
      approved = output.success && output.data.approved && output.data.revisionId === revisionId && review.success && review.data.approved;
    }
  }
  const status: 'recalculating' | 'blocked' | 'empty' | 'approved' | 'ready' = changed ? 'recalculating' : proposal?.draft.status === 'needsReview' || questions.length ? 'blocked'
    : !proposal ? 'empty' : approved ? 'approved' : 'ready';
  const subtotalCents = status === 'ready' || status === 'approved' ? proposal!.draft.subtotalCents : null;
  const grouped = new Map<string, NonNullable<typeof proposal>['draft']['lines']>();
  for (const line of proposal?.draft.lines ?? []) grouped.set(line.vendorId, [...(grouped.get(line.vendorId) ?? []), line]);
  const vendors = [...grouped].map(([id, lines]) => ({ id, lines,
    subtotalCents: subtotalCents === null ? null : lines.reduce((sum, line) => sum + line.lineCents, 0) }));
  const preview = subtotalCents === null
    ? 'Preview unavailable until the current worksheet is calculated and every review question is resolved.'
    : ['ORDER DRAFT', `Servings: ${proposal!.servings}`, ...vendors.flatMap(vendor => [
      '', `Vendor: ${vendor.id}`, ...vendor.lines.map(line => `${line.sku} | ${line.packs} purchase packs | ${formatMoney(line.lineCents, line.currency)} | ${line.source} | quoted ${line.quotedOn}`),
    ]), '', proposal!.draft.currency ? `Subtotal: ${formatMoney(subtotalCents, proposal!.draft.currency)}` : 'No purchases required.', 'Tax, freight and fees excluded. Draft preview only.'].join('\n');
  return { status, proposal, questions, revisions, revisionId, subtotalCents, vendors, preview };
}
