# Worksheet verification

This slice uses synthetic recipes and catalog rows. Offline results establish calculation and integration behavior. They do not establish live Meta extraction quality.

The implementation follows the client tool pattern in [assistant-ui/mastra-hitl](https://github.com/assistant-ui/mastra-hitl). The three locked human-input tools remain client-side so `addResult()` resumes the thread. A separate server-side `prepareOrderDraft` tool calls `planOrder` and supplies canonical card arguments. The model cannot supply catalog prices to that calculation.

## Reproduce

Use the [web setup](../web/README.md). `npm run check` runs restaurant evals, the independent social package, web types and the installed SDK streaming regression. `npm --prefix web run build` checks the production bundle. Neither command contacts a model provider.

The [real-route streaming check](../web/tests/chat-stream.ts) uses Mastra core 1.81.0, Mastra AI SDK 1.11.3 and AI SDK 7.0.159 with an explicitly injected deterministic model. It exercises the actual stream adapter, server session and tool-result ingestion.

The integrated `npm run check` passed with 21 restaurant evals, two social evals, web types, real-route stream checks and worksheet state checks. The production build passed on Windows with Node 22.17.0. It emitted Mastra's existing dynamic-dependency webpack warning. Node 22.22 or newer remains recommended for the dependency engine requirements.

## Observed output pairs

| Case | Before | After |
| --- | --- | --- |
| Server calculation | Client gates had schemas but no calculation tool | `prepareOrderDraft` runs the existing planner against server-owned catalog terms |
| Bistro stew | Cups input was rejected without executing a clarification journey | Flour and onion questions block the subtotal; `250 g` and `confirm each` resolve to four lines totaling 4450 cents |
| Edited or altered draft | UI arguments could carry model-supplied prices | Server rejects arguments that differ from its computed worksheet |
| Approval | Revision helper existed without a server review state | Final approval requires the accepted current proposal; edits invalidate review and approval |
| Concurrent requests | Two requests could pass the same initial availability check | The simultaneous-request regression receives one 200 and one 429 |
| Malformed message parts | A null part threw after reserving the reply slot | Malformed parts return 400 and the next valid request streams successfully |
| Streamed card arguments | A partial argument stream crashed while reading `stockEdits.map` | Cards wait for valid arguments, validate edits and disable completed controls |
| Worksheet shell | No progress, revision history or vendor preview | Active-thread results drive the checklist, vendor groups, revision history and read-only preview |

The restaurant examples are independently worked fixture expectations. See [the session and tool evals](../evals/worksheet-agent.test.ts).

## Browser evidence

The [card regression script](../web/scripts/card-smoke.mjs) passed six synthetic stream checks and three checks against the actual offline route. Both paths made zero provider calls and reported zero browser errors. Playwright was installed in ignored output storage, outside the application dependencies.

Set `PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`, `BASE_URL` to the running local app and run `node web/scripts/card-smoke.mjs` from the root. Set `CARD_SMOKE_REAL=1` for the real-route journey. That mode refuses to proceed unless the health route reports `offline-synthetic`.

The hands-on Chrome pass confirmed flour and onion questions blocking the subtotal, explicit answers resolving to USD 44.50, final revision approval, a read-only source-backed preview, and worksheet isolation when switching threads. An unsupported offline recipe produced a visible safe error. Captures and structured browser results are in ignored `outputs/worksheet-evidence/` in the task worktree. The before-and-after CLI produced a Markdown pair from matching empty-thread captures. Screen recording was unavailable because ffmpeg and ffprobe were absent.

## Work split

The starting point was the existing Issue #2 work at `f2ec0bc`. Each writer used its own branch and worktree. The integration worktree retained the owner's assigned branch.

- Tools agent changed `src/worksheet-agent.ts`, `evals/worksheet-agent.test.ts`, `web/mastra/agents/worksheet-agent.ts` and `web/mastra/tools/worksheet-tools.ts`. Its checks passed with 21 root evals and two social evals. It did not run the browser or Meta.
- Scaffold agent changed the root check script, `web/.env.example`, `web/README.md`, `web/app/api/chat/route.ts`, `web/app/assistant.tsx`, `web/app/page.tsx`, `web/components/thread-list.tsx`, `web/components/thread.tsx`, `web/mastra/index.ts`, `web/mastra/offline-model.ts`, `web/package.json`, `web/package-lock.json` and `web/tests/chat-stream.ts`. It replaced `web/next.config.mjs` with `web/next.config.ts`. Its checks and production build passed. The installed package stream pair and plain browser reply passed. Live provider behavior remains unverified.
- Cards agent changed the three files in `web/components/tools/`, added `web/components/tools/card-controls.tsx` and `web/scripts/card-smoke.mjs`. Its full checks, six synthetic browser assertions and three real-route browser assertions passed. No provider was called.
- Shell and integration work changed `.github/workflows/check.yml`, `README.md`, this report, the root dev script, `web/app/assistant.tsx`, `web/app/layout.tsx`, `web/app/globals.css`, `web/components/thread.tsx`, `web/components/worksheet-shell.tsx`, `web/lib/worksheet-view.ts`, `web/tests/worksheet-view.ts` and the web check script. The shell state test covers blockers, the literal 4450-cent result, revisions, vendor previews and edit invalidation. The browser checks were rerun against the integrated app.

## Limits

Sessions live in one server process and expire after one hour. Restarting the server clears them. This demonstration has no production account authorization or durable history.

A fully stocked recipe can produce a zero subtotal with `currency:null` from the existing planner. The final approval card is unavailable for that case. No purchase is needed and no transmission occurs.

The live Meta acceptance item in [Issue #2](https://github.com/paulrvach/restaurant-ordering-harness/issues/2) remains open until the owner approves the single bounded `npm run eval:live` invocation and its report is inspected. Live provider streaming, timeout and error behavior have not been established by the offline test model.
