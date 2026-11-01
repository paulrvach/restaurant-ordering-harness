import { z } from 'zod';
import { Decimal } from 'decimal.js';

const Amount = Decimal.clone({ precision: 80 });

const quantity = z.number().finite().nonnegative().max(1_000_000_000);
const unit = z.enum(['g', 'kg', 'ml', 'l', 'each']);
const ingredientSchema = z.object({
  ingredient: z.string().min(1), amount: quantity, unit, sku: z.string().min(1),
});
export const recipeSchema = z.object({
  name: z.string().min(1), servings: z.number().finite().positive().max(1_000_000),
  ingredients: z.array(ingredientSchema).min(1).max(500),
});
export const orderInputSchema = z.object({
  recipe: recipeSchema, targetServings: z.number().finite().positive().max(1_000_000),
  inventory: z.array(z.object({ ingredient: z.string().min(1), amount: quantity, unit })).max(500),
  catalog: z.array(z.object({
    vendorId: z.string().min(1), sku: z.string().min(1), ingredient: z.string().min(1),
    pack: z.object({ amount: quantity.positive(), unit }),
    priceCents: z.number().int().nonnegative().max(1_000_000_000).nullable(),
    currency: z.enum(['USD', 'CAD', 'EUR']), source: z.string().min(1),
    quotedOn: z.iso.date(), available: z.boolean(),
  })).max(10000),
  asOf: z.iso.date(),
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderLine = {
  vendorId: string; sku: string; ingredient: string; packs: number;
  demandBase: number; netDemandBase: number; purchasedBase: number; excessBase: number;
  baseUnit: string; lineCents: number; priceCents: number; currency: string; source: string; quotedOn: string;
};
export type OrderDraft = {
  status: 'draft' | 'needsReview'; lines: OrderLine[]; issues: string[];
  currency: string | null; subtotalCents: number | null;
};
const measures = {
  g: { dimension: 'mass', factor: 1, base: 'g' },
  kg: { dimension: 'mass', factor: 1000, base: 'g' },
  ml: { dimension: 'volume', factor: 1, base: 'ml' },
  l: { dimension: 'volume', factor: 1000, base: 'ml' },
  each: { dimension: 'count', factor: 1, base: 'each' },
};

/** Fixed-weight synthetic baseline. Subtotal excludes tax, freight and fees. */
export function planOrder(raw: unknown): OrderDraft {
  const input = orderInputSchema.parse(raw);
  const lines: OrderLine[] = [];
  const issues: string[] = [];
  const currencies = new Set<string>();
  const demands = new Map<string, { ingredient: string; sku: string; unit: z.infer<typeof unit>; demandBase: Decimal }>();
  for (const requirement of input.recipe.ingredients) {
    const measure = measures[requirement.unit];
    const demandBase = new Amount(requirement.amount).times(measure.factor).times(input.targetServings).div(input.recipe.servings);
    const key = JSON.stringify([requirement.ingredient, requirement.sku, measure.dimension]);
    const previous = demands.get(key);
    demands.set(key, { ...requirement, demandBase: demandBase.plus(previous?.demandBase ?? 0) });
  }
  for (const requirement of demands.values()) {
    const measure = measures[requirement.unit];
    const related = [...demands.values()].filter(row => row.ingredient === requirement.ingredient);
    const stockRows = input.inventory.filter(row => row.ingredient === requirement.ingredient);
    if (related.length > 1 || stockRows.some(row => measures[row.unit].dimension !== measure.dimension)) {
      issues.push(`${requirement.ingredient}: resolve incompatible units or multiple selected products before allocating stock.`);
      continue;
    }
    const offers = input.catalog.filter(row => row.sku === requirement.sku);
    const offer = offers[0];
    if (offers.length !== 1 || !offer) {
      issues.push(`${requirement.ingredient}: select one unambiguous catalog SKU (${requirement.sku}).`);
      continue;
    }
    const ageDays = (Date.parse(input.asOf) - Date.parse(offer.quotedOn)) / 86400000;
    if (!offer.available || offer.priceCents === null || ageDays < 0 || ageDays > 7 ||
        offer.ingredient !== requirement.ingredient || measures[offer.pack.unit].dimension !== measure.dimension) {
      issues.push(`${requirement.ingredient}: confirm availability, ingredient, units and a current source price.`);
      continue;
    }
    const demandBase = requirement.demandBase;
    const stock = stockRows.reduce((sum, row) => sum.plus(new Amount(row.amount).times(measures[row.unit].factor)), new Amount(0));
    const netDemandBase = Amount.max(0, demandBase.minus(stock));
    const packBase = new Amount(offer.pack.amount).times(measures[offer.pack.unit].factor);
    const packs = netDemandBase.div(packBase).ceil().toNumber();
    if (packs === 0) continue;
    const lineCents = new Amount(packs).times(offer.priceCents).toNumber();
    if (!Number.isSafeInteger(packs) || !Number.isSafeInteger(lineCents) || !demandBase.isFinite() || !Number.isFinite(demandBase.toNumber())) {
      issues.push(`${requirement.ingredient}: quantity or price exceeds the supported numeric range.`);
      continue;
    }
    currencies.add(offer.currency);
    lines.push({ vendorId: offer.vendorId, sku: offer.sku, ingredient: requirement.ingredient,
      packs, demandBase: demandBase.toNumber(), netDemandBase: netDemandBase.toNumber(), purchasedBase: packBase.times(packs).toNumber(),
      excessBase: packBase.times(packs).minus(netDemandBase).toNumber(), baseUnit: measure.base,
      priceCents: offer.priceCents, lineCents, currency: offer.currency,
      source: offer.source, quotedOn: offer.quotedOn });
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  if (currencies.size > 1) issues.push('Select one currency before combining vendor subtotals.');
  if (!Number.isSafeInteger(subtotalCents)) issues.push('Subtotal exceeds supported integer cents.');
  return { status: issues.length ? 'needsReview' : 'draft', lines, issues,
    currency: currencies.size === 1 ? [...currencies][0]! : null,
    subtotalCents: issues.length ? null : subtotalCents };
}
