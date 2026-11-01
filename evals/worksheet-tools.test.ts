import { expect, test } from 'vitest';
import {
  approveOrderDraftInputSchema,
  approveOrderDraftOutputSchema,
  proposeOrderDraftInputSchema,
  proposeOrderDraftOutputSchema,
  requestMissingFactInputSchema,
  requestMissingFactOutputSchema,
} from '../src/worksheet-tools.js';

const draftLine = {
  vendorId: 'demo-produce', sku: 'TOM-2KG', ingredient: 'tomato',
  packs: 1, demandBase: 2500, netDemandBase: 1500, purchasedBase: 4000,
  excessBase: 2500, baseUnit: 'g', lineCents: 1250, priceCents: 1250,
  currency: 'USD', source: 'synthetic-catalog:row-1', quotedOn: '2026-10-31',
};

test('worksheet draft card carries a computed draft and editable servings/stock', () => {
  expect(proposeOrderDraftInputSchema.parse({
    servings: 20, stockEdits: [{ ingredient: 'tomato', amount: 1, unit: 'kg' }],
    draft: { status: 'needsReview', lines: [draftLine], issues: ['flour: confirm grams'],
      currency: null, subtotalCents: null },
  })).toMatchObject({ servings: 20 });
  expect(proposeOrderDraftOutputSchema.parse(
    { approved: true, servings: 20, stockEdits: [] })).toMatchObject({ approved: true });
});

test('missing-fact gate accepts only known topics and non-empty answers', () => {
  expect(requestMissingFactInputSchema.parse({
    ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit',
    label: 'Flour amount in grams', placeholder: 'e.g. 250',
    reason: '2 cups has no compatible catalog dimension',
  })).toMatchObject({ topic: 'unit' });
  expect(requestMissingFactOutputSchema.parse(
    { ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit', value: '250' }))
    .toMatchObject({ value: '250' });
  for (const invalid of [
    { ingredient: 'flour', sku: 'FLR-5KG', topic: 'density', label: 'l', placeholder: 'p', reason: 'r' },
    { ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit', value: '' },
  ]) {
    expect(() => requestMissingFactOutputSchema.parse(invalid)).toThrow();
  }
});

test('approval binds to a revision and rejects malformed totals', () => {
  expect(approveOrderDraftInputSchema.parse(
    { revisionId: 'rev-1', subtotalCents: 4450, currency: 'USD', lineCount: 4 }))
    .toMatchObject({ revisionId: 'rev-1' });
  expect(approveOrderDraftOutputSchema.parse({ approved: false, revisionId: 'rev-1' }))
    .toMatchObject({ approved: false });
  expect(() => approveOrderDraftInputSchema.parse(
    { revisionId: '', subtotalCents: -1, currency: 'USD', lineCount: 4 })).toThrow();
});
