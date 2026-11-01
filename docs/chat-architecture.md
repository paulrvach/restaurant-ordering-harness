# Chat architecture

The configured Convex functions directory is `web/convex/`, selected by the root `convex.json`. Run backend commands from the repository root. The generated files under the root `convex/` directory came from the initial setup and are not a second deployed backend.

The request path is:

1. assistant-ui initializes the thread through the Convex adapter and sends its ID with the message.
2. The Next chat handler validates the request and saves the user prompt in Convex.
3. The server reconstructs the selected branch from saved parent links. It uses saved conversation content for the model context.
4. Mastra calls the direct Meta API using `muse-spark-1.3`, one step, zero retries, a 1,200-token output limit and a 45-second deadline. Each Next process allows two concurrent responses.
5. The server translates the stream to AI SDK v7 events and saves the completed reply. The client adapter uses the same message IDs, so its writes update existing messages.
6. Usage goes to a server-authenticated Convex mutation. Logs contain usage numbers, not prompts or keys.

The Convex Agent component stores message content. `historyRefs` connects assistant-ui IDs, parent links and formats to component messages. `histories` is retained for lazy migration of the previous blob format; reads preserve it until the first write migrates that format atomically. A chat supports 500 stored messages per format; a model request supports 80 messages and a 64,000-character body. Limits return errors instead of silently truncating history.

The browser URL selects a conversation. Composer text, sidebar visibility and the active stream are temporary UI state. Saved messages, thread titles and usage records are durable. In-flight generation is request-bound; refreshing can stop a response. A saved prompt remains available afterward.

This is one shared, unauthenticated development workspace. Anyone with its deployment URL can read or mutate its public conversation API. Use synthetic data. Per-user authentication and authorization are required before a private or public deployment with restaurant data.

The restaurant and social harnesses remain separate. No chat tool places an order, sends a social message or substitutes model-generated arithmetic for `planOrder`. The removed worksheet cards are not part of this chat repair.

Reference source was cloned into the Windows temp directory under `restaurant-ui-references-1101/`: [assistant-ui](https://github.com/assistant-ui/assistant-ui), including [base.tsx](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/pages/examples/base.tsx), and [mastra-hitl](https://github.com/assistant-ui/mastra-hitl). The UI follows the base example's sidebar, centered composer and docked conversation layout. It does not use the example's model proxy, cloud persistence or email tools.
