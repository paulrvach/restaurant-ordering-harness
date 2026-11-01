# Order worksheet

Next.js, assistant-ui and an in-process Mastra agent show synthetic order drafts. Draft review never places an order.

## Run locally

From the repository root, install the root, social and web packages with `npm ci`, `npm --prefix social ci` and `npm --prefix web ci`.

```powershell
cd web
Copy-Item .env.example .env.local
# For the local synthetic demonstration, set WORKSHEET_OFFLINE_DEMO=1.
npm run dev
```

Open [localhost:3000](http://localhost:3000). The explicit offline mode uses a local deterministic model. It makes no provider calls and supports the synthetic bistro stew and tomato soup fixtures. Ask for either fixture by name. A plain greeting also streams a local reply.

After configuring `web/.env.local`, `npm run dev` from the repository root starts the same app. The sidebar shows recipe threads and the current worksheet. The progress panel tracks missing facts, purchase packs and final review. Revision history and a read-only vendor preview follow the active thread.

To use Meta, set `WORKSHEET_OFFLINE_DEMO=0` and the server-only `META_MODEL_API_KEY` in `.env.local`. This does not approve a live eval. The separate `npm run eval:live` command remains manual and requires the owner's approval.

## Check the bistro fixture

1. Ask to load synthetic bistro stew, 4 servings.
2. Review the blocked worksheet. Answer the onion question with `confirm each` and flour with the independently confirmed `250 g`. Submit the worksheet's Ask-first decision so every pending tool has a result.
3. The resumed worksheet shows four catalog lines and a 4450 cent subtotal.
4. Accept the unchanged worksheet, then open the final approval card and confirm the exact revision in its dialog. Servings or stock changes require another review.

## Verification and limits

`npm run check` from the root runs the existing offline behavioral evals, the independent social checks, web types and a real-route streaming test. The test uses the installed Mastra core 1.81.0, Mastra AI SDK 1.11.3 and AI SDK 7.0.159. It checks blocked questions, 4450 cent resolution, revision review, thread isolation, tampered results, malformed requests and concurrency without a model API call. The worksheet presentation renders on shadcn components (Tailwind v4) over the installed assistant-ui primitives; `web/tests/card-structure.ts` asserts that mapping offline, and the approval card confirms through a revision-bound alert dialog.

`GET /api/chat` reports health and whether the server is configured. Missing configuration returns 503 on POST. Input is limited to 100 messages and 100,000 characters. Each reply permits at most three model steps, 1024 output tokens per step, no retries and a 30 second abort deadline. Only one reply runs at a time in this server process.

Sessions are in memory, expire after an hour and disappear on server restart. This local demonstration has no production account authorization or durable chat history. Prices and revisions come from server session state. Client tool arguments and results must match the issued gate. There is no export transmission endpoint.

See the [verification report](../docs/worksheet-verification.md) for output pairs, browser evidence and the work split.
