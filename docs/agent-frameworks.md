# TypeScript agent stack for a restaurant ordering harness

Researched October 31, 2026. Links below are primary documentation. **Confirmed** describes documented capability; **proposed** describes the design recommended for this project. No live model calls, package compatibility tests, or authenticated credit inspection were performed for this report.

## Recommendation

Use **Next.js + assistant-ui + Mastra + Meta Model API**, with the business rules in ordinary TypeScript modules and Vitest tests. Mastra is the best fit for the stated preference to begin with evals and then build explicit workflows: it brings typed steps, suspension/resumption, scorers, datasets, experiments, and Studio into one TypeScript stack. The smaller fallback is assistant-ui + Vercel AI SDK with a plain TypeScript pipeline. Choose LangGraph JS instead if durable, branching, long-running graph execution becomes the main problem. This ranking is an engineering judgment for this hackathon, not a universal framework ranking.

The demo should show one dependable journey: recipe and servings → normalized demand → matches from an uploaded vendor catalog → rounded purchase quantities and source-backed prices → review → vendor-specific order export. A conversational sidebar should explain and edit a visible order worksheet. Its appeal is a trustworthy procurement result, not the number of agents.

## Framework comparison

| Option | Confirmed strengths | Project implication / tradeoff |
| --- | --- | --- |
| **Mastra** | Workflow steps have input/output schemas; workflows support suspension, resumption and streaming. Evals support rule-based, model-graded and statistical scoring. | Best integrated fit for this project's evals-to-workflow development loop. Keep calculations outside framework classes so tests and reuse remain simple. Sources: [workflows](https://mastra.ai/docs/workflows/overview), [evals](https://mastra.ai/docs/evals/overview). |
| **LangGraph JS** | Custom graph orchestration mixes deterministic and agentic nodes. Interrupts persist state through a checkpointer and resume using a stable thread ID and `Command`. | Strong alternative for complicated approvals and multi-session recovery; more graph and state decisions up front. Use a durable checkpointer for production recovery. Sources: [LangChain's framework positioning](https://www.langchain.com/oss-overview), [JS interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts). |
| **Vercel AI SDK directly** | Provider abstraction, typed tool calling, agent loops, approval configuration, mocks and stream simulation. | Smallest initial stack. Application code must own order state, persistence, quality datasets and workflow transitions. Sources: [agents](https://ai-sdk.dev/docs/agents/overview), [tools](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), [testing](https://ai-sdk.dev/docs/ai-sdk-core/testing). |

Do not add both Mastra and LangGraph. LangChain is useful for its integrations, but adding it alongside Mastra without a concrete missing capability increases adapter surface. LangGraph can call ordinary JavaScript nodes, and its documentation describes testing whole graphs and individual nodes with Vitest. [LangGraph testing](https://docs.langchain.com/oss/javascript/langgraph/test)

## assistant-ui integration and current version traps

**Confirmed:** assistant-ui is the React interface layer, connected to an AI backend through a runtime. Its current AI SDK documentation recommends **AI SDK v7**, `@ai-sdk/react@^4`, and `@assistant-ui/ai-sdk` for new projects. The older `@assistant-ui/react-ai-sdk` combinations belong to earlier AI SDK majors. Pin the actual resolved versions in the lockfile. [assistant-ui AI SDK runtime](https://www.assistant-ui.com/docs/runtimes/ai-sdk/overview)

Mastra has an official assistant-ui integration. The in-process approach runs the agent and API route inside Next.js, giving one deployment target. `@mastra/ai-sdk` adapts the stream, and `toAISdkStream` must explicitly select the installed AI SDK major: its documented default is v5. The current full-stack guide shows `version: "v7"`. It also calls out Node-only modules and server external package configuration. Validate streaming at runtime in addition to passing a build. [assistant-ui full-stack Mastra guide](https://www.assistant-ui.com/docs/integrations/frameworks/mastra/full-stack)

The LangGraph runtime integrates directly with `@langchain/langgraph-sdk` and supports interrupts and streaming. Its documented path assumes a LangGraph-compatible API server and message-bearing graph state. This is available if the project chooses that stack; it is not necessary merely to use assistant-ui. [assistant-ui LangGraph runtime](https://www.assistant-ui.com/docs/runtimes/langgraph/overview)

**Proposed UI:** render recipe fields, ambiguous ingredient questions, candidate SKU cards, and a vendor order table as structured UI. Make servings, stock-on-hand, pack choice, and delivery date editable. Show source catalog row and price date beside each quote. Export should be reproducible from the structured order, without asking the model to rewrite numbers.

## Meta integration: what is documented and what still needs proving

**Confirmed:** Meta's direct base URL is `https://api.meta.ai/v1`, using a bearer API key. The current overview lists `muse-spark-1.3` and OpenAI-compatible request surfaces. Use the direct Meta endpoint for the credits attached to this Meta project; do not assume credits carry over to an inference gateway or partner account. Gateway credit portability has not been verified. [Meta overview](https://dev.meta.ai/docs/overview)

Mastra explicitly documents the Meta provider and `meta/muse-spark-1.3`; the router expects **`META_MODEL_API_KEY`**. Meta's own SDK examples use **`MODEL_API_KEY`**. These are environment-variable conventions for the same kind of credential, not two credentials. Mastra's native provider path uses Chat Completions and warns that some provider-specific features may be unavailable. Its capability/price table is derived from models.dev, so Meta's own pricing page should govern budget estimates. [Mastra Meta provider](https://mastra.ai/models/providers/meta)

For a direct custom configuration, Mastra documents model objects with `id`, `url`, and `apiKey`; custom endpoints default to Chat Completions, with `api: "responses"` selecting Responses. This offers a way to wire the existing server-only `MODEL_API_KEY` explicitly. **Treat this as documented configuration to smoke-test, not proof that every Meta Responses capability survives every adapter.** [Mastra model configuration](https://mastra.ai/models)

Meta's Chat Completions guide documents token streaming through SSE. Its structured-output guide documents JSON Schema-constrained output. Tool calling is also documented: the model returns tool requests and the application executes developer-defined tools. Schema correctness does not establish that an ingredient amount or SKU is factually correct. Validate business invariants after parsing. [Chat Completions](https://dev.meta.ai/docs/protocols/chat-completions), [structured output](https://dev.meta.ai/docs/structured-output), [tool calling](https://dev.meta.ai/docs/tool-calling)

For longer autonomous tool loops, Meta recommends Responses because encrypted reasoning can carry across turns; plain Chat Completions history does not provide that continuity. Meta documents `@ai-sdk/openai` as the recommended adapter for its coding-agent Responses integrations. For this product, begin with small extraction and matching calls inside an explicit workflow, then prove Responses behavior before relying on long agent loops. [Responses API](https://dev.meta.ai/docs/protocols/responses), [coding-agent integration](https://dev.meta.ai/docs/coding-agents)

Before committing to an adapter, run five small live checks with the actual project key: plain text, schema output, one deterministic tool call, streamed text/tool output, and cancellation/error handling. Then check that usage appeared against the intended project credits. Authenticated model entitlement, remaining credits, expiry, and credit scope must come from the user's dashboard, not these public docs.

## Evals guide the workflow; they do not become the workflow automatically

**Proposed development loop:** define a gold example and expected outcome → run the simplest implementation → inspect failures → add only the stage or rule needed → preserve the example as a regression case. Promote stable domain operations into typed workflow steps. Evals measure whether the workflow works; they are not a specification-to-workflow code generator.

Mastra datasets version test cases; experiments run a target agent/workflow against them and can persist results. Custom scorers can use JavaScript for exact checks and LLM judges for subjective criteria. CI can evaluate multiple cases through `runEvals`. These capabilities support this loop without requiring a hosted judge for every score. [Datasets](https://mastra.ai/docs/evals/datasets), [experiments](https://mastra.ai/docs/evals/experiments), [custom scorers](https://mastra.ai/docs/evals/custom-scorers), [CI](https://mastra.ai/docs/evals/running-in-ci)

Start with 12–20 deliberately small, human-reviewed cases, then expand from failures. Split cases into a development set and a held-out demo-quality set. Store fixture/catalog version, model, prompt version, code version, request settings, latency, token usage, output and failure reasons with each run. Do not report synthetic fixture success as a measured real-world accuracy claim.

| Case family | Expected behavior / scorer |
| --- | --- |
| Servings and duplicate ingredients | Scale once; aggregate demand before pack rounding. Exact expected quantities. |
| Mass, volume, and count | Convert compatible units; ask for ingredient density or unit weight when dimensions differ. No invented conversion. |
| Yield and preparation | Distinguish usable quantity from purchased quantity; apply an explicit sourced yield only. |
| Inventory and pack sizes | Subtract usable stock, floor demand at zero, round purchase units upward. Exact pack count and cents. |
| SKU ambiguity and substitution | Choose only provided SKU IDs; explain product-form mismatch; request review when unresolved. |
| Missing, stale, variable prices | Flag unknown quote, stale date, or catch-weight estimate. Never invent a total. |
| Vendor constraints | Surface minimums, delivery cutoffs, and unavailable items; block an incomplete final order. |
| Review and export | Editing invalidates prior approval; regenerated export matches approved data. Repeated export does not submit an order. |
| Untrusted recipe/catalog text | Embedded instructions cannot alter workflow rules, destination, prices, or credentials. |

Use hard gates for invalid SKUs, fabricated prices, incompatible units, wrong money arithmetic, and bypassed review. Use field-level exactness or tolerance-aware comparisons for extraction and normalization. Use a human rubric for usefulness of clarifying questions; an optional Meta judge can help triage explanations, but should not certify arithmetic or its own SKU choice.

## Proposed workflow boundaries

1. **Build or import recipe:** model helps draft/extract; user confirms recipe, base yield and target servings.
2. **Normalize demand:** code scales, aggregates, applies explicit yields, and subtracts inventory. Unresolved dimensions become questions.
3. **Find catalog candidates:** deterministic filtering by vendor, availability and product requirements; model may rank a bounded list and must return known IDs.
4. **Calculate quote:** code computes packs, excess, subtotal, explicitly modeled fees, currency, and estimate status. Prices originate in catalog rows.
5. **Review:** show source evidence and blocking questions; capture approval tied to the current order revision.
6. **Export:** code emits vendor-grouped CSV/text. Sending an actual purchase order is a later, separately implemented capability.

Mastra supports workflow suspension with typed payloads and resumption data, making unresolved questions and review natural boundaries. Persist state if review must survive a restart. Keep external side effects behind idempotent operations. [Mastra workflow human input](https://mastra.ai/docs/workflows/human-in-the-loop)

## Use the Meta credits where they improve evidence

As checked, Meta lists Muse Spark Standard pricing of **$1.25 per million input tokens, $4.25 per million output tokens**, and $0.15 cached input. Contributor mode is cheaper in exchange for permission to train on submitted content. Do not switch modes implicitly for restaurant/vendor documents. Rate limits are team-wide. [Meta pricing and rate limits](https://dev.meta.ai/docs/pricing-rate-limits)

Proposed allocation: spend credits on repeated extraction/matching evals, adversarial inputs, prompt comparisons, a small held-out run, and rehearsing the live demo. Reuse deterministic fixtures for arithmetic and UI development. Bound output length, retries, concurrency and calls per run; log usage and halt when the configured run budget is reached. Do not burn credits simply to maximize consumption.

For scale, 100 calls at 5,000 uncached input and 1,000 output tokens each would cost roughly **$1.05** at those Standard rates, before any additional billed tokens or retries. This is an illustrative calculation, not a verified run estimate. Real data sizes and reported usage should replace it after the first smoke test.

The immediate implementation milestone is a passing, offline recipe-to-order fixture plus a failing live extraction baseline, followed by one passing end-to-end Meta-backed case. Wider catalog ingestion, real vendor dispatch, autonomous substitutions, and production multi-restaurant access can follow the hackathon proof.
