import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { orderInputSchema, planOrder } from '../src/ordering.js';
import {
  buildApprovalInput,
  buildProposeDraftInput,
  isApprovalValid,
  revisionIdForPropose,
  worksheetAgentTools,
} from '../src/worksheet-agent.js';
import { requestMissingFactInputSchema } from '../src/worksheet-tools.js';

const fixture = JSON.parse(readFileSync('evals/fixtures/bistro-stew.json', 'utf8'));

test('resolved bistro-stew plans to the 4450c gold draft', () => {
  const draft = planOrder(fixture.orderInput);
  expect(draft).toMatchObject({ status: 'draft', currency: 'USD', subtotalCents: 4450 });
  expect(draft.lines.map((line) => ({ sku: line.sku, packs: line.packs, demandBase: line.demandBase, netDemandBase: line.netDemandBase, lineCents: line.lineCents }))).toEqual(
    fixture.expected.lines,
  );
});

test('worksheet proposes the computed draft with editable servings and stock', () => {
  const input = buildProposeDraftInput(fixture.orderInput);
  expect(input.servings).toBe(4);
  expect(input.stockEdits).toEqual([]);
  expect(input.draft).toMatchObject({ status: 'draft', subtotalCents: 4450 });
  expect(input.draft.lines).toHaveLength(4);
});

test('first pass must ask instead of inventing a cups conversion', () => {
  expect(() => orderInputSchema.parse({
    ...fixture.orderInput,
    recipe: { ...fixture.orderInput.recipe, ingredients: [
      ...fixture.orderInput.recipe.ingredients.filter((row: { sku: string }) => row.sku !== 'FLR-5KG'),
      { ingredient: 'flour', amount: 2, unit: 'cups', sku: 'FLR-5KG' },
    ] },
  })).toThrow();
  for (const topic of fixture.expectedFirstPass.questionTopics) {
    expect(typeof topic).toBe('string');
  }
  expect(requestMissingFactInputSchema.parse({
    ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit',
    label: 'Flour amount in grams', placeholder: 'e.g. 250',
    reason: '2 cups has no compatible catalog dimension',
  })).toMatchObject({ topic: 'unit' });
  expect(requestMissingFactInputSchema.parse({
    ingredient: 'onion', sku: 'ONI-10EA', topic: 'yield',
    label: 'Usable onion yield', placeholder: 'e.g. 2 each',
    reason: 'usable weight per onion unstated',
  })).toMatchObject({ topic: 'yield' });
});

test('approval binds to the exact revision and edits invalidate it', () => {
  const first = buildProposeDraftInput(fixture.orderInput);
  const edited = buildProposeDraftInput({ ...fixture.orderInput, targetServings: 8 });
  const firstId = revisionIdForPropose(first);
  const editedId = revisionIdForPropose(edited);
  expect(firstId).not.toBe(editedId);
  expect(isApprovalValid({ approved: true, revisionId: firstId }, firstId)).toBe(true);
  expect(isApprovalValid({ approved: true, revisionId: firstId }, editedId)).toBe(false);
  expect(isApprovalValid({ approved: false, revisionId: firstId }, firstId)).toBe(false);
  expect(buildApprovalInput(first)).toMatchObject({ revisionId: firstId, subtotalCents: 4450 });
  expect(Object.keys(worksheetAgentTools)).toEqual(
    expect.arrayContaining(['proposeOrderDraft', 'requestMissingFact', 'approveOrderDraft']),
  );
});
