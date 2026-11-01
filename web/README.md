# Order worksheet web demo (Issue #2)

In-process Next.js + assistant-ui chat over the deterministic `planOrder`
boundary. Synthetic demo only. Drafts never place orders.

## Start

```powershell
cd web
npm install
# copy .env.example to .env and set META_MODEL_API_KEY (server-only)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Demo script

1. Paste the recipe text from `../evals/fixtures/bistro-stew.json`
   (`recipeText`) and confirm 4 servings.
2. First pass must ask: usable onion yield (2 each against the 10ea pack)
   and flour cups-to-grams (never invented).
3. Answer flour 250 g and onion 2 each. The worksheet card shows ingredient
   needs, stock deductions, packs, source price and quoted date per SKU.
4. The resolved draft totals 4450c across 4 lines (TOM-2KG, ONI-10EA,
   STK-1L, FLR-5KG). Approve binds to that exact revision; changing
   servings or stock invalidates it.

## Notes

- No key configured: the chat route answers 500 with a plain message and
  makes no model call.
- Live model evidence stays manual: `npm run eval:live` from the repo root
  (bounded: one call, one fixture, 1200 output tokens, 60s timeout) and
  writes its usage report to `outputs/evals/`. Never run in CI.
- Deterministic math lives in `../src/ordering.ts`. The three tool schemas
  live in `../src/worksheet-tools.ts`; the Mastra agent and revision
  helpers in `../src/worksheet-agent.ts`.
