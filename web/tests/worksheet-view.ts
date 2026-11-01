import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planOrder } from '../../src/ordering';
import { worksheetView } from '../lib/worksheet-view';

const fixture = JSON.parse(readFileSync(new URL('../../evals/fixtures/bistro-stew.json', import.meta.url), 'utf8'));
const proposal = { servings: 4, stockEdits: [], draft: planOrder(fixture.orderInput) };
const part = (toolName: string, args: unknown, result?: unknown) => ({ type: 'tool-call', toolName, args, result });
const question = { ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit', label: 'Confirm flour', placeholder: '250 g', reason: 'Cups need measured grams.' };
const blocked = { ...proposal, draft: { ...proposal.draft, status: 'needsReview', issues: ['Confirm flour grams.'], subtotalCents: null } };

const first = worksheetView([{ content: [part('proposeOrderDraft', blocked), part('requestMissingFact', question)] }]);
assert.equal(first.status, 'blocked');
assert.equal(first.subtotalCents, null);
assert.equal(first.questions[0]?.ingredient, 'flour');
assert.equal(first.revisions.length, 1);

const resolved = worksheetView([{ content: [part('proposeOrderDraft', blocked)] }, { content: [part('proposeOrderDraft', proposal)] }]);
assert.equal(resolved.status, 'ready');
assert.equal(resolved.subtotalCents, 4450);
assert.equal(resolved.revisions.length, 2);
assert.deepEqual(resolved.vendors.map(vendor => vendor.id), ['demo-produce']);
assert.match(resolved.preview, /TOM-2KG/);
assert.match(resolved.preview, /USD 44.50/);

const approval = { revisionId: 'server-revision', subtotalCents: 4450, currency: 'USD', lineCount: 4 };
const approved = worksheetView([{ content: [part('proposeOrderDraft', proposal, { approved: true, servings: 4, stockEdits: [] }), part('approveOrderDraft', approval, { approved: true, revisionId: 'server-revision' })] }]);
assert.equal(approved.status, 'approved');
const edited = worksheetView([{ content: [part('proposeOrderDraft', proposal, { approved: true, servings: 8, stockEdits: [] }), part('approveOrderDraft', approval, { approved: true, revisionId: 'server-revision' })] }]);
assert.equal(edited.status, 'recalculating');
assert.equal(edited.subtotalCents, null);
assert.doesNotMatch(edited.preview, /USD 44.50/);
assert.equal(worksheetView([]).status, 'empty');
console.log('PASS worksheet view: blocked subtotal, 4450c resolution, vendor preview, revision history, edits invalidate approval, empty thread isolation');
