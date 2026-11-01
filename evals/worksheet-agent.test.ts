import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { orderInputSchema, planOrder } from '../src/ordering.js';
import {
  buildApprovalInput,
  buildProposeDraftInput,
  isApprovalValid,
  revisionIdForPropose,
  worksheetAgentTools,
  createWorksheetSession,
  createPrepareOrderDraftTool,
} from '../src/worksheet-agent.js';
import { requestMissingFactInputSchema } from '../src/worksheet-tools.js';

const fixture = JSON.parse(readFileSync('evals/fixtures/bistro-stew.json', 'utf8'));

test('headless gates keep flour and yield blocked until human answers, then quote 4450c', () => {
  const initial = structuredClone(fixture.orderInput);
  initial.recipe.ingredients.find((row: { ingredient: string }) => row.ingredient === 'flour').unit = 'cups';
  initial.recipe.ingredients.find((row: { ingredient: string }) => row.ingredient === 'flour').amount = 2;
  const session = createWorksheetSession(initial, [{
    ingredient: 'onion', sku: 'ONI-10EA', topic: 'yield', label: 'Confirm onion planning in each',
    placeholder: 'confirm each', reason: 'Usable onion weight is unstated.',
  }]);
  expect(session.snapshot().proposal.draft).toMatchObject({ status: 'needsReview', subtotalCents: null });
  expect(session.snapshot().questions.map(question => question.topic).sort()).toEqual(['unit', 'yield']);
  for (const question of session.snapshot().questions) {
    session.ingestResult('requestMissingFact', question, {
      ingredient: question.ingredient, sku: question.sku, topic: question.topic,
      value: question.topic === 'unit' ? '250 g' : 'confirm each',
    });
  }
  expect(session.snapshot().proposal.draft).toMatchObject({ status: 'draft', subtotalCents: 4450 });
  const proposal = session.snapshot().proposal;
  session.ingestResult('proposeOrderDraft', proposal, { approved: true, servings: 4, stockEdits: [] });
  const approval = session.snapshot().approval!;
  session.ingestResult('approveOrderDraft', approval, { approved: true, revisionId: approval.revisionId });
  expect(session.snapshot().approved).toBe(true);
  const oldProposal = session.snapshot().proposal;
  session.ingestResult('proposeOrderDraft', oldProposal, { approved: true, servings: 8, stockEdits: [] });
  expect(session.snapshot().approved).toBe(false);
  expect(session.validateGate('approveOrderDraft', approval)).toBe(false);
});

test('unpriced and ambiguous offers produce focused questions, never human-entered prices', () => {
  const input = structuredClone(fixture.orderInput);
  input.catalog[0].priceCents = null;
  input.recipe.ingredients[1].sku = 'UNKNOWN';
  const session = createWorksheetSession(input);
  expect(session.snapshot().questions.map(question => question.topic).sort()).toEqual(['price', 'sku']);
  const price = session.snapshot().questions.find(question => question.topic === 'price')!;
  session.ingestResult('requestMissingFact', price, { ingredient: price.ingredient, sku: price.sku, topic: price.topic, value: '$1.00' });
  expect(session.snapshot().proposal.draft.subtotalCents).toBe(null);
  expect(session.snapshot().approval).toBe(null);
});

test('server preparation executes planOrder for tomato soup and ignores supplied draft arithmetic', async () => {
  const tomato = JSON.parse(readFileSync('evals/fixtures/tomato-soup.json', 'utf8'));
  const session = createWorksheetSession(tomato.orderInput);
  const result = await createPrepareOrderDraftTool(session).execute?.({}, {});
  expect(result).toMatchObject({ proposal: { draft: { status: 'draft', subtotalCents: 1250,
    lines: [{ sku: 'TOM-2KG', packs: 1, demandBase: 2500, netDemandBase: 1500, lineCents: 1250 }] } } });
  const forged = structuredClone(session.snapshot().proposal);
  forged.draft.subtotalCents = 1;
  expect(session.validateGate('proposeOrderDraft', forged)).toBe(false);
  expect(() => session.ingestResult('proposeOrderDraft', forged,
    { approved: true, servings: 20, stockEdits: [] })).toThrow('current server worksheet');
  expect(session.snapshot().proposal.draft.subtotalCents).toBe(1250);
});

test('unit answers are atomic and incompatible dimensions remain review questions', () => {
  const input = structuredClone(fixture.orderInput);
  input.recipe.ingredients[3].unit = 'ml';
  const session = createWorksheetSession(input);
  const question = session.snapshot().questions.find(question => question.topic === 'unit')!;
  expect(question).toMatchObject({ ingredient: 'flour' });
  const before = session.snapshot();
  expect(() => session.ingestResult('requestMissingFact', question,
    { ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit', value: '99999999999999999999 g' })).toThrow();
  expect(session.snapshot()).toEqual(before);
  expect(session.validateGate('approveOrderDraft', before.approval)).toBe(false);
});

test('final approval requires the accepted current proposal', () => {
  const session = createWorksheetSession(fixture.orderInput);
  expect(session.validateGate('approveOrderDraft', session.snapshot().approval)).toBe(false);
  session.ingestResult('proposeOrderDraft', session.snapshot().proposal, { approved: true, servings: 4, stockEdits: [] });
  expect(session.validateGate('approveOrderDraft', session.snapshot().approval)).toBe(true);
  session.ingestResult('proposeOrderDraft', session.snapshot().proposal, { approved: true, servings: 8, stockEdits: [] });
  expect(session.validateGate('approveOrderDraft', session.snapshot().approval)).toBe(false);
});

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

test('correcting a stock unit clears its obsolete question and unblocks the draft', () => {
  const tomato = JSON.parse(readFileSync('evals/fixtures/tomato-soup.json', 'utf8'));
  const input = structuredClone(tomato.orderInput);
  input.inventory = [{ ingredient: 'tomato', amount: 500, unit: 'ml' }];
  const session = createWorksheetSession(input);
  expect(session.snapshot().proposal.draft).toMatchObject({ status: 'needsReview', subtotalCents: null });
  expect(session.snapshot().questions.map(question => question.topic)).toEqual(['unit']);
  session.ingestResult('proposeOrderDraft', session.snapshot().proposal, {
    approved: false, servings: 20, stockEdits: [{ ingredient: 'tomato', amount: 1, unit: 'kg' }],
  });
  expect(session.snapshot().questions).toEqual([]);
  expect(session.snapshot().proposal.draft).toMatchObject({ status: 'draft', subtotalCents: 1250 });
});
