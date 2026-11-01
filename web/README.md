# Prep / Order

assistant-ui renders the chat, Mastra runs the assistant, and Convex stores conversations. See [architecture](../docs/chat-architecture.md) for state ownership and limits.

From the repository root:

```powershell
npm ci
npm --prefix social ci
npm --prefix web ci
npx convex dev
```

In another terminal, run `npm run dev` and open [localhost:3000](http://localhost:3000). `/chat` opens the same app. To select a port, use `npm run dev -- --port 3001`.

The launcher loads existing shell variables, then `web/.env.local`, root `.env.local`, and root `.env`, keeping the first defined value. Set `NEXT_PUBLIC_CONVEX_URL` in `web/.env.local` and keep `META_MODEL_API_KEY` or `MODEL_API_KEY` in an ignored server environment file. The existing root Meta key is supported. Credentials never need a `NEXT_PUBLIC_` prefix.

To persist usage, set the same server-only `CHAT_SERVER_TOKEN` in a local environment file and on the selected Convex deployment with `npx convex env set CHAT_SERVER_TOKEN`. The CLI accepts the value through stdin. Without that token, usage is recorded as numbers in the server log. Missing or rejected model credentials produce a visible chat error. Missing Convex configuration produces a setup screen.

Run `npm run check` from the root for restaurant evals, chat persistence and HTTP tests, social checks, and web types. Run `npm --prefix web run build` for a production bundle, with the development server stopped. These commands make no model requests.

The app is a shared development workspace. It does not implement private accounts or restore the removed worksheet cards. Use synthetic examples until authentication and authorization are added.
