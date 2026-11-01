# Design Agent for personal social posts

Researched 2026-10-31 Pacific time. Source snapshot: [`langchain-ai/design-agent` at `cb4dc17da9d0b99a97087d661ef8702da5e256b9`](https://github.com/langchain-ai/design-agent/tree/cb4dc17da9d0b99a97087d661ef8702da5e256b9). This is a source review, not a successful installation or model trial. No external code ran, dependencies were not installed, and no provider calls or deployments were made.

## Recommendation

Start with the local CLI generating one still image, then review and export it through the existing social workflow. Slack, hosted infrastructure, Paper, voice, music and video can wait. This recommendation follows the repository's local `ask` path and HTML still-image workflow. It produces files rather than requiring a social publishing integration. [README](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/README.md), [stills workflow](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/skills/stills/SKILL.md)

The immediate inputs are a permitted brand pack, the actual licensed Kanos font file or an approved fallback, one post brief, target dimensions, a working vision and tool-calling model, and an agreed spending limit. Meta credits alone do not establish compatibility with this project. The source enforces registered vision capability before starting a lead, helper or look model. [Brand onboarding](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/.agents/skills/brand-onboarding/SKILL.md), [model factory](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/models/factory.py), [registry](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/models/registry.py)

## Minimum local setup

The package requires Python 3.11 or later. The documented local path uses Git, uv and Docker. There is no v0.1 web setup console. The package is marked alpha, version `0.1.0.dev0`. [Package metadata](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/pyproject.toml), [CLI](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/cli.md)

A proposed trial, not commands executed during this investigation:

```text
git clone https://github.com/langchain-ai/design-agent.git
cd design-agent
git checkout cb4dc17da9d0b99a97087d661ef8702da5e256b9
uv sync
uv run design-agent sandbox build
uv run design-agent demo
```

The demo uses a scripted model with no API keys and writes a card in three sizes plus a four-second teaser to `workspace/out/demo/`. It always renders the sample brand, so it proves the rendering setup rather than custom creative quality or model compatibility. [README](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/README.md), [brand onboarding](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/.agents/skills/brand-onboarding/SKILL.md)

After configuring a deliberately chosen provider in the Git-ignored `.env`, build and validate the brand pack, run `doctor`, then make one real request with `uv run design-agent ask "..."`. That real request calls the configured provider and can incur charges. It writes delivered files under `workspace/out/<thread>/` and maintains local thread state under `workspace/state/`. [README](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/README.md), [CLI](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/cli.md)

This Windows machine needs an environment check before adoption. Python metadata includes Windows timezone support, but the self-hosting guide explicitly documents Linux or macOS with Docker Desktop. Windows Docker or WSL behavior was not verified here. [Package metadata](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/pyproject.toml), [self-hosting](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/self-hosting.md)

## Brand inputs

The active pack is `workspace/brand/`, with a neutral example fallback until a custom pack exists. It contains `brand.toml`, `tokens.json`, `fonts.toml`, `voice.md`, `graphic-language.md`, `logos/`, and generated `tokens.css`. `brand.toml` supplies name, description, voice, license, dimensions and real logo files. Logos may be omitted while files are unavailable. [Customization](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/customization.md), [schema](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/brand/schema.py)

The existing social palette and voice can supply inputs, but copying the local token JSON verbatim will not work. Upstream expects `version: "1"`, CSS names beginning `--brand-`, separate design and copy rules, and font stacks ending in a generic family. Unknown schema keys fail validation. Translate the palette, font roles, spacing and copy rules into that contract. [Schema](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/brand/schema.py), [sample tokens](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/examples/brands/example-studio/tokens.json)

Each font entry needs its internal family name, weight, style, relative file path, SHA-256, required flag and license. Open fonts live in `fonts/`; permitted proprietary files live in Git-ignored `private-fonts/`. WOFF and WOFF2 work through generated `@font-face` rules. Missing or mismatched required font files fail validation. A Kanos specimen screenshot is reference material, not a usable font installation. [Sample font manifest](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/examples/brands/example-studio/fonts.toml), [customization](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/customization.md)

Use `brand init`, replace the sample facts and assets, then run `brand validate`, `fonts verify` and `brand css`. The custom pack needs human review on one actual card. Local requests pick up changes immediately; managed deployments require redeploying. [Brand onboarding](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/.agents/skills/brand-onboarding/SKILL.md)

## Posts and exports

The still-image tool renders HTML through Chrome into PNG, JPEG or WebP. It can produce separate layouts for X, LinkedIn, Instagram and other placements. Common starting dimensions include 1600x900 for X, 1080x1080 square, 1080x1350 portrait and 1080x1920 story. These are layout defaults, not a claim that every platform's current upload rules were checked in this investigation. Request exact sizes and verify final placement requirements before publication. [Stills](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/skills/stills/SKILL.md), [sizes](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/skills/stills/references/sizes-and-sets.md)

It also supports carousel PNGs and PDF documents, static decks as PDF plus PNGs, and motion workflows. Slack is a request-and-delivery interface; it is not evidence of X, Instagram or LinkedIn posting support. The documented default sends nothing outside the requesting thread. Keep final captions, alt text, factual review and publication approval in the existing social package. [Sizes and documents](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/skills/stills/references/sizes-and-sets.md), [security](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/SECURITY.md)

## Providers and cost

The snapshot defaults to `anthropic:claude-opus-5-5`. Anthropic and OpenAI packages install by default; Google, Groq and Mistral are optional extras. A custom OpenAI-compatible endpoint can be configured with `DESIGN_AGENT_MODEL_BASE_URL` and `DESIGN_AGENT_MODEL_API_KEY_ENV`, but endpoint compatibility alone is insufficient. There are no Meta models in the exact-ID registry. Unknown models have `vision=False`, and `resolve_model` rejects them for lead, helper and look roles. A real Meta adoption trial therefore needs the credited project's exact model ID, vision/tool support, a verified registry entry, and bounded connectivity and behavioral evals. No paid-provider substitution is implied. [Models guide](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/models.md), [registry](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/models/registry.py), [factory](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/models/factory.py)

HTML layouts with supplied images, real logos and fonts do not require generative image calls. Optional `generate_image` uses OpenAI directly when `OPENAI_API_KEY` exists, otherwise the LangSmith Gateway's OpenAI route when configured. The snapshot's default image model is `gpt-image-2.5-flare`. This route is separate from the chat-model base URL and does not establish Meta image compatibility. Exact copy and logos are composed in HTML after image generation. [Media tool source](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/tools/media.py), [settings](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/config.py)

The code is Apache 2.0. LangChain reports median model spend of about $0.50 per request for its own use, which is not a personal-use quote or cap. Managed hosting and sandbox builds cost extra; optional image, voice and music services can add separate provider charges. The local meter prices chat token usage using a manually maintained table. The reviewed image-generation function does not emit usage into that token meter, so its final cost line should not be treated as an all-in bill. Verify provider invoices and actual usage for the chosen trial. [README](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/README.md), [deploy guide](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/deploy-mda.md), [meter](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/harness/meter.py), [media source](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/tools/media.py)

`DESIGN_AGENT_JOB_BUDGET_USD` is a soft notice to the model after estimated spend reaches the limit. It stops nothing in code, and already-running work continues. The defaults also allow three parallel builders and a 600-second model timeout. For a credited-project experiment, lower concurrency and add enforceable call, retry, token and spending limits before making live calls. [Budget middleware](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/middleware/budget.py), [environment example](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/.env.example)

## Deployment choices

| Option | What it adds | Fit for this first trial |
| --- | --- | --- |
| Local CLI | Python, uv, Docker, local files and one chosen model | Smallest documented route |
| Managed Deep Agents | Paid LangSmith Cloud account, deployment permission, published sandbox snapshot, managed Slack app and tracing | Useful later for recurring Slack requests |
| Self-hosted | Linux or documented macOS Docker host, Compose 2.24+, API tokens, Postgres durability, optional custom Slack app | More operation than a personal image trial needs |

These requirements come from the [README](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/README.md), [managed deploy guide](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/deploy-mda.md) and [self-hosting guide](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/self-hosting.md). Managed API-key requests have a documented background-delivery limitation: background helpers can finish without waking the lead. Keep those requests to one turn, or use Slack. Local `ask` stays open for background work. [CLI](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/cli.md), [managed deployment](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/deploy-mda.md)

## Security and privacy facts to check before adoption

Keys remain in the host process and sandbox network egress is denied by default. Host tools fetch assets and call providers. Self-hosting uses the Docker socket, which is root-equivalent on its host. The guide recommends a dedicated machine or LangSmith sandboxes. The HTTP API binds to localhost and requires bearer tokens except for health checks. [Security policy](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/SECURITY.md), [self-hosting](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/self-hosting.md)

Trace-reading tools are enabled by default and can read every thread in their LangSmith project, including DMs. `DESIGN_AGENT_ENABLE_TRACES=0` disables those tools; it should not be described as disabling all LangSmith tracing. `DESIGN_AGENT_TEMPLATE_TELEMETRY=0` disables template/version tags used to count adopters. Learning is also on by default and can be disabled with `DESIGN_AGENT_ENABLE_LEARNING=0`. Decide on these settings explicitly for personal drafts. [Security](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/SECURITY.md), [customization](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/customization.md), [trace middleware](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/src/design_agent/middleware/tracing.py)

For managed deployment, `.env` values except LangSmith's keys become deployment secrets. Git-ignored brand packs, private fonts and even old output files ship in the project archive. Inspect what ships before deployment; Git-ignored does not mean cloud-excluded. The source documents a 200 MB archive limit. [Managed deployment](https://github.com/langchain-ai/design-agent/blob/cb4dc17da9d0b99a97087d661ef8702da5e256b9/docs/deploy-mda.md)

## Open decisions

- Which personal channels and exact image sizes should the first reusable card cover?
- Can the owner supply a permitted Kanos file and real marks, or approve an open fallback and no logo?
- Which credited Meta model exposes both vision and tool calling, and can it satisfy the registry and behavioral checks?
- What enforceable live-call limits and usage record should bound the first request?

The next useful result is one reviewed still image and its reproducible HTML, with actual provider usage recorded. Shipping infrastructure or automating publication is outside this investigation.
