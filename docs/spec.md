# Recipe-to-order hackathon MVP

Status: proposed product scope; initial harness implementation approved through the setup discussion. Test boundaries: `planOrder` and `composeUpdate`. Real vendor policies remain to be confirmed.

## Problem statement

Restaurant operators translate recipes into ingredient quantities, compare supplier product formats, round to purchase packs and manually prepare separate priced orders. Missing units and uncertain prices make a plausible-looking AI answer insufficient.

## Solution

A visible order worksheet with an assistant that helps build a recipe, asks focused questions and proposes catalog matches. The result is a source-backed, vendor-grouped order draft that a person can review and export. An accompanying project harness records eval evidence and produces progress drafts for Discord and X.

## User stories

1. As an operator, I can create or paste a recipe and confirm its base servings.
2. I can change target servings and see demand update.
3. I can provide a permitted vendor catalog with SKUs, packs, source prices and quote dates.
4. I can enter usable stock and avoid purchasing what I already have.
5. I can inspect candidate products and distinguish whole, prepared and substitute ingredients.
6. I can answer missing-unit or missing-yield questions.
7. I can see purchase packs, excess quantity and subtotal per vendor.
8. I can trace every SKU and price to a catalog row.
9. I can see missing/stale prices and availability constraints as blockers.
10. I can review and edit a draft before exporting it.
11. I can export vendor-specific CSV/text without transmitting a purchase.
12. As a builder, I can run known examples offline before spending API credits.
13. I can run bounded Meta-backed extraction/matching evals and inspect failures.
14. I can distinguish synthetic fixture scores from live model and real-user results.
15. I can turn a verified milestone into editable Discord/X drafts and save published links.
16. I can keep social work in its own mini harness, pairing every post with an image brief, selected image, alt text and review preview.

## Implementation decisions

Recommended stack: TypeScript, Next.js, assistant-ui, Mastra and direct Meta Model API. Add the UI after one complete order journey passes evaluation. Start with synthetic fixtures, one currency, fixed-weight catalog offers and explicit source prices. Use typed boundaries; keep calculations independent of framework state.

Workflow: recipe creation/import and confirmation → normalize/scale demand → find bounded catalog candidates → calculate quote → resolve questions and review → deterministic export. State distinguishes a draft, a blocked draft and later reviewed revisions. Recipe/catalog text cannot change instructions, model configuration or destinations.

Initial executable harness accepts already structured recipes and explicit catalog SKU selection. It establishes arithmetic and blocking behavior before model extraction. This initial milestone does not claim natural-language recipe understanding or production vendor matching.

## Testing decisions

Use independent worked examples at the public `planOrder` interface for demand, aggregation, inventory, pack rounding, source prices and review blockers. Use `composeUpdate` for deterministic social drafts; supplied milestones remain the owner's responsibility to verify. Do not test framework internals. No existing test prior art exists in this new repository.

AI eval cases separately measure recipe field extraction, bounded SKU selection and asking for clarification. Schema validity is required but insufficient. No unknown SKU, invented price, ungrounded cross-dimension conversion or silently omitted ingredient may pass. Use human-reviewed expected outcomes and a held-out case set. Record prompt/model/catalog/code versions and usage.

## Out of scope for the hackathon MVP

Autonomous purchasing, emailing vendors, live vendor portal automation, POS integrations, forecasting, comprehensive tax/freight accounting, catch-weight settlement, autonomous ingredient substitutions, medical/nutrition advice and production multi-tenant authorization. Flag these as unsupported rather than estimating silently.

## Further notes

Critical input needed from the owner: one representative recipe, its servings and preparation yields, one permitted vendor price list and its pack conventions, and the desired order format. Until supplied, all examples are explicitly synthetic. Public claims of time saved or accuracy require measurement.
