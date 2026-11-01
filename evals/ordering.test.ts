import { expect, test } from 'vitest';
import { planOrder } from '../src/ordering.js';

const tomatoOffer = {
  vendorId: 'demo-produce', sku: 'TOM-2KG', ingredient: 'tomato',
  pack: { amount: 2, unit: 'kg' }, priceCents: 1250, currency: 'USD',
  source: 'synthetic-catalog:row-1', quotedOn: '2026-10-31', available: true,
};
const base = {
  recipe: { name: 'Synthetic tomato soup', servings: 4,
    ingredients: [{ ingredient: 'tomato', amount: 500, unit: 'g', sku: 'TOM-2KG' }] },
  targetServings: 20, inventory: [], catalog: [tomatoOffer], asOf: '2026-10-31',
};

test('operator gets two 2kg packs for 2.5kg of tomato, priced from the catalog', () => {
  expect(planOrder(base)).toMatchObject({ status: 'draft', subtotalCents: 2500,
    currency: 'USD', issues: [], lines: [{ sku: 'TOM-2KG', packs: 2,
      demandBase: 2500, purchasedBase: 4000, excessBase: 1500,
      lineCents: 2500, source: 'synthetic-catalog:row-1' }] });
});

test('operator buys one pack after repeated ingredient rows and duplicate stock entries are aggregated', () => {
  expect(planOrder({ ...base, targetServings: 4,
    recipe: { ...base.recipe, ingredients: [
      { ingredient: 'tomato', amount: 1500, unit: 'g', sku: 'TOM-2KG' },
      { ingredient: 'tomato', amount: 1, unit: 'kg', sku: 'TOM-2KG' },
    ] }, inventory: [
      { ingredient: 'tomato', amount: 500, unit: 'g' },
      { ingredient: 'tomato', amount: 0.5, unit: 'kg' },
    ] })).toMatchObject({ status: 'draft', subtotalCents: 1250,
      lines: [{ demandBase: 2500, netDemandBase: 1500, packs: 1, excessBase: 500 }] });
});

test('operator cannot get a complete priced order from an unresolved vendor offer', () => {
  const invalidOffers = [[], [{ ...tomatoOffer, priceCents: null }],
    [{ ...tomatoOffer, available: false }], [{ ...tomatoOffer, quotedOn: '2026-10-01' }],
    [{ ...tomatoOffer, quotedOn: '2026-11-01' }],
    [{ ...tomatoOffer, ingredient: 'basil' }],
    [{ ...tomatoOffer, pack: { amount: 2, unit: 'l' } }],
    [tomatoOffer, { ...tomatoOffer, vendorId: 'other-vendor' }],
  ];
  for (const catalog of invalidOffers) {
    const draft = planOrder({ ...base, catalog });
    expect(draft.status).toBe('needsReview');
    expect(draft.subtotalCents).toBeNull();
    expect(draft.issues.length).toBeGreaterThan(0);
    expect(draft.lines).toEqual([]);
  }
});

test('operator must resolve incompatible inventory and split product selections before stock is deducted', () => {
  const incompatible = planOrder({ ...base, inventory: [{ ingredient: 'tomato', amount: 100, unit: 'l' }] });
  expect(incompatible.status).toBe('needsReview');
  expect(incompatible.subtotalCents).toBeNull();
  const split = planOrder({ ...base, recipe: { ...base.recipe, ingredients: [
    ...base.recipe.ingredients, { ingredient: 'tomato', amount: 1, unit: 'kg', sku: 'OTHER' },
  ] }, catalog: [tomatoOffer, { ...tomatoOffer, sku: 'OTHER' }],
    inventory: [{ ingredient: 'tomato', amount: 1, unit: 'kg' }] });
  expect(split.status).toBe('needsReview');
  expect(split.subtotalCents).toBeNull();
});

test('operator buys exactly one fractional pack without floating point over-ordering', () => {
  expect(planOrder({ ...base, targetServings: 4,
    recipe: { ...base.recipe, ingredients: [
      { ingredient: 'tomato', amount: 0.1, unit: 'g', sku: 'TOM-2KG' },
      { ingredient: 'tomato', amount: 0.2, unit: 'g', sku: 'TOM-2KG' },
    ] }, catalog: [{ ...tomatoOffer, pack: { amount: 0.3, unit: 'g' } }] })).toMatchObject({
      subtotalCents: 1250, lines: [{ packs: 1, excessBase: 0 }],
    });
});

test('operator cannot combine currencies or receive unsafe monetary numbers', () => {
  const mixed = planOrder({ ...base, recipe: { ...base.recipe, ingredients: [
    ...base.recipe.ingredients, { ingredient: 'basil', amount: 10, unit: 'g', sku: 'BASIL' },
  ] }, catalog: [tomatoOffer, { ...tomatoOffer, sku: 'BASIL', ingredient: 'basil', currency: 'CAD' }] });
  expect(mixed).toMatchObject({ status: 'needsReview', subtotalCents: null, currency: null });
  const huge = planOrder({ ...base, targetServings: 1000000,
    catalog: [{ ...tomatoOffer, pack: { amount: 0.0000001, unit: 'g' }, priceCents: 1000000000 }] });
  expect(huge.status).toBe('needsReview');
  expect(huge.subtotalCents).toBeNull();
});

test('operator buys nothing when stock covers demand and malformed input is rejected', () => {
  expect(planOrder({ ...base, inventory: [{ ingredient: 'tomato', amount: 3, unit: 'kg' }] }))
    .toMatchObject({ status: 'draft', subtotalCents: 0, lines: [] });
  for (const invalid of [{ ...base, targetServings: 0 }, { ...base, asOf: '2026-02-30' },
    { ...base, inventory: [{ ingredient: 'tomato', amount: -1, unit: 'kg' }] }]) {
    expect(() => planOrder(invalid)).toThrow();
  }
});
