# Eval-first development plan

An eval is an example plus an independently reviewed expected outcome and a scorer. A workflow is the implementation under evaluation. Evals expose which steps are necessary; they do not automatically compile into workflow definitions.

## First measurable seam

`planOrder` receives a structured recipe, target servings, inventory and a versioned catalog. It returns an order draft or a draft needing review. Initial fixtures cover fixed-weight packs, USD prices and g/kg/ml/l/each. There is no real-world accuracy claim and no live SKU matching yet.

| Fixture | Independent expected result |
| --- | --- |
| 500g tomato / 4 servings → 20 servings; 2kg pack at $12.50 | Need 2.5kg, buy 2 packs, $25.00, 1.5kg excess |
| Same tomato in two recipe rows: 600g + 600g; 2kg pack | Aggregate 1.2kg, buy 1 pack |
| Need 2.5kg, usable stock 1kg, 2kg pack | Buy 1 pack, $12.50; excess above net need 0.5kg |
| Stock covers all demand | Buy zero packs, $0.00 |
| Cups specified against a kg product | Needs review; no invented density conversion |
| Unknown SKU, conflicting duplicate SKU or wrong ingredient | Needs review; no silently selected substitute |
| Missing, future-dated or over-7-day-old quote | Needs review; no complete payable total |
| Unavailable offer | Needs review; no order line for it |
| Mixed currencies | Needs review; no combined total |
| Negative quantity, zero servings or malformed date | Validation error |

The seven-day quote window is a synthetic harness policy, configurable later from the restaurant's actual vendor practices. Fees, tax and freight are excluded from subtotals. Never label a subtotal as a final invoice total.

## Live model cases

Begin with one synthetic recipe text with a gold structured recipe and known order output. Invoke Muse Spark through direct Meta routing, validate the schema, then evaluate the resulting order against literal gold quantities/SKUs/packs/subtotal. Add cases one at a time: abbreviations; missing yield; alternative forms; instruction injection; unknown units; unavailable items; substitutions. Do not expose held-out expected answers to the model.

Hard gates: no invented catalog IDs/prices; correct dimensional conversions and money; no missing ingredient; unresolved information blocks a complete order. Extraction and matching scores should be reported separately from arithmetic. Model-graded explanations may help triage but cannot override these gates.

For each live run record model and prompt version, fixture/catalog version, code revision, actual token usage, latency, finish reason, parsed output and failed checks. Default to one call, one concurrent request, no retries and a bounded output. Increase evaluation volume deliberately after inspecting failures and billing. Synthetic data is safe for initial experimentation; the owner must approve the use of real vendor/restaurant content.

## Meta credit allocation proposal

Prefer direct Meta for all model development in this project. After confirming the credited balance, allocate approximately 10% to integration checks, 45% to recipe/SKU experiments, 20% to adversarial/held-out cases, 15% to demo rehearsals and 10% reserve. This is a proposal, not a spending commitment. Use local code for arithmetic/UI development so credits buy model evidence. A billing notification is not proof of a hard spending cap.

Before a larger run, confirm streaming/tool/schema compatibility through the exact installed packages. Do not silently fall back to another provider. The initial live runner fails clearly if no key is configured and makes no model call during ordinary tests or CI.
