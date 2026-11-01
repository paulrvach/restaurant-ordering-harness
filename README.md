# Restaurant ordering harness

An eval-first project for the 2026 Meta Global AI Developer Hackathon: build a recipe, calculate ingredient needs, choose catalog products, and produce source-backed, priced vendor order drafts.

**Current status:** a runnable TypeScript baseline with offline behavioral checks, a synthetic order demo, a prepared Meta recipe-extraction eval, and an independent social mini harness with illustrated post previews. The assistant-ui frontend, live catalog matching, review persistence and vendor exports are planned work. No purchasing or autonomous posting is implemented.

## Run the baseline

Use Node 22.22+ (recommended for the installed Mastra dependency tree) and npm. The development machine's Node 22.17 passed offline checks but npm warned about Mastra's transitive posthog-node engine floor; live compatibility is not established yet.

```powershell
npm ci
npm --prefix social ci
npm run check
npm run demo
npm run social
```

The demo uses **synthetic** tomato soup and a synthetic vendor quote: 500g for four servings, scaled to 20 servings, minus 1kg of stock, yields one 2kg pack at $12.50. Output is an order draft; subtotal excludes tax, freight and fees.

Open the generated `outputs/social/2026-10-31-intro/posting-desk.html` for Discord/X drafts, image preview/download and destination links. See [social's own commands and workflow](social/README.md). Each post has its own folder, image brief, asset, alt text and published-link record.

## Meta-backed evaluation

Copy `.env.example` to `.env` and add the existing Meta project's API key locally as `META_MODEL_API_KEY`. Do not paste it into issues, chat, logs or committed files. Then:

```powershell
npm run eval:live
```

This explicitly invokes one synthetic recipe-extraction case using direct `https://api.meta.ai/v1`, Standard-mode `meta/muse-spark-1.3`, one step, no retries, at most 1,200 output tokens and a 60-second timeout. It validates model output, runs the deterministic order planner and compares the result against a gold fixture. Reports go to ignored `outputs/evals/`. The command fails without a key; ordinary tests and CI never call the model. This bounded runner is not an account-level dollar cap. Verify credits, billing mode and entitlement before larger experiments.

The adapter is prepared and typechecked. No successful live Meta call or model-quality result is claimed until a report exists. Meta credit balance and expiry could not be verified because billing remained in a loading state during research.

## Design and workflow

Recommended product stack: Next.js + assistant-ui + Mastra + direct Meta Model API. AI interprets recipe text and proposes bounded catalog matches; deterministic TypeScript owns conversions, stock deductions, pack counts and cents. Unknown or conflicting information requires review. Evals guide which workflow steps to build; they do not automatically generate a workflow.

- [Product spec](docs/spec.md) and [GitHub issue #1](https://github.com/paulrvach/restaurant-ordering-harness/issues/1)
- [Framework comparison and official integration sources](docs/agent-frameworks.md)
- [Eval plan and credit-use proposal](docs/eval-plan.md)
- [Hackathon requirements, rubric, deadlines and resources](docs/hackathon.md)
- [Next slices](docs/next-slices.md)

Matt Pocock's selected skills are installed project-locally under `.agents/skills/`, pinned to source commit `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`, with the upstream MIT license. GitHub Issues is the selected tracker; agent instructions live in `AGENTS.md` and `docs/agents/`. The first slices used red/green checks at the agreed public interfaces.

## Practical limits

The initial planner expects structured recipes with explicit SKU selections and supports g/kg/ml/l/each, fixed-weight packs and one currency per combined draft. SKUs must be globally unique in the input catalog for this baseline; duplicate vendor SKU strings require disambiguation. Current source prices use a provisional seven-day freshness window. Unknown units are rejected by input validation; cross-dimension conversions require review. Catch-weight prices, yields, substitutions, vendor minimums, freight/tax and live stock are not modeled yet.

Use synthetic or permitted data in the public repository. Real catalogs and private restaurant examples should stay in ignored local storage until their sharing rights are established. Submission deadline: **November 4, 2026 at 6:00 PM Pacific**.
