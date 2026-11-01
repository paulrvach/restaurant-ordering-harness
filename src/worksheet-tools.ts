import { z } from 'zod';

/**
 * Tool-HITL schemas for the Issue #2 chat worksheet.
 *
 * Follows the assistant-ui/mastra-hitl pattern: each gate is a tool with a
 * typed input (what the agent shows) and a typed output (what the user
 * returns via the card UI). Deterministic math stays in `planOrder`
 * (see src/ordering.ts); these schemas carry already-computed drafts and
 * answers, never raw prices to invent. Unit/ingredient constraints mirror
 * `orderInputSchema` so tool payloads cannot smuggle values `planOrder`
 * would reject.
 */

const servingsSchema = z.number().finite().positive().max(1_000_000);
const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'each']);

const stockEditSchema = z.object({
  ingredient: z.string().min(1),
  amount: z.number().finite().nonnegative().max(1_000_000_000),
  unit: unitSchema,
});

const draftLineSchema = z.object({
  vendorId: z.string().min(1),
  sku: z.string().min(1),
  ingredient: z.string().min(1),
  packs: z.number().int().nonnegative(),
  demandBase: z.number().finite().nonnegative(),
  netDemandBase: z.number().finite().nonnegative(),
  purchasedBase: z.number().finite().nonnegative(),
  excessBase: z.number().finite().nonnegative(),
  baseUnit: z.string().min(1),
  lineCents: z.number().int().nonnegative(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  source: z.string().min(1),
  quotedOn: z.string().min(1),
});

const orderDraftSchema = z.object({
  status: z.enum(['draft', 'needsReview']),
  lines: z.array(draftLineSchema),
  issues: z.array(z.string()),
  currency: z.string().min(1).nullable(),
  subtotalCents: z.number().int().nonnegative().nullable(),
});

/** Worksheet card: the computed draft plus the user's editable servings/stock. */
export const proposeOrderDraftInputSchema = z.object({
  servings: servingsSchema,
  stockEdits: z.array(stockEditSchema).max(500),
  draft: orderDraftSchema,
});
export const proposeOrderDraftOutputSchema = z.object({
  approved: z.boolean(),
  servings: servingsSchema,
  stockEdits: z.array(stockEditSchema).max(500),
});

/** Missing-fact gate: one focused question per call (yield, unit, SKU, price). */
export const missingFactTopicSchema = z.enum(['yield', 'unit', 'sku', 'price']);
export const requestMissingFactInputSchema = z.object({
  ingredient: z.string().min(1),
  sku: z.string().min(1),
  topic: missingFactTopicSchema,
  label: z.string().min(1),
  placeholder: z.string().min(1),
  reason: z.string().min(1),
});
export const requestMissingFactOutputSchema = z.object({
  ingredient: z.string().min(1),
  sku: z.string().min(1),
  topic: missingFactTopicSchema,
  value: z.string().min(1),
});

/** Final review gate: approval binds to the exact draft revision. */
export const approveOrderDraftInputSchema = z.object({
  revisionId: z.string().min(1),
  subtotalCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  lineCount: z.number().int().nonnegative(),
});
export const approveOrderDraftOutputSchema = z.object({
  approved: z.boolean(),
  revisionId: z.string().min(1),
});

export const worksheetToolIds = [
  'proposeOrderDraft',
  'requestMissingFact',
  'approveOrderDraft',
] as const;

export type ProposeOrderDraftInput = z.infer<typeof proposeOrderDraftInputSchema>;
export type ProposeOrderDraftOutput = z.infer<typeof proposeOrderDraftOutputSchema>;
export type RequestMissingFactInput = z.infer<typeof requestMissingFactInputSchema>;
export type RequestMissingFactOutput = z.infer<typeof requestMissingFactOutputSchema>;
export type ApproveOrderDraftInput = z.infer<typeof approveOrderDraftInputSchema>;
export type ApproveOrderDraftOutput = z.infer<typeof approveOrderDraftOutputSchema>;
