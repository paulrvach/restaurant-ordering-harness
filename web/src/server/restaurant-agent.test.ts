/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import { MockLanguageModelV4 } from "ai/test";
import { ConvexHttpClient } from "convex/browser";
import { aiSDKV6FormatAdapter } from "assistant-cloud/ai-sdk";
import { DefaultChatTransport, readUIMessageStream, simulateReadableStream, validateUIMessages, type UIMessage } from "ai";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { createChatHandler } from "./chat-handler";
import { HISTORY_FORMAT, prepareConversation } from "./conversation-store";
import { streamRestaurantReply } from "./restaurant-agent";
import { createConvexHistoryStore } from "../lib/convex-thread-adapter";

vi.mock("server-only", () => ({}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({ chatModel: () => model }),
}));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = backend.query;
    mutation = backend.mutation;
  },
}));

let model: MockLanguageModelV4;
let backend: TestConvex<typeof schema>;
const modules = import.meta.glob("../../convex/**/*.ts");
const scope = { threadId: "offline-stream", format: HISTORY_FORMAT };
const firstPrompt: UIMessage = { id: "prompt-1", role: "user", parts: [{ type: "text", text: "Tomato soup recipe for 4 servings" }] };
const textOf = (message: UIMessage) => message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");

function replying(text: string, fails = false) {
  return new MockLanguageModelV4({ doStream: {
    stream: simulateReadableStream({ initialDelayInMs: null, chunkDelayInMs: null, chunks: [
      { type: "stream-start", warnings: [] },
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: text },
      { type: "text-end", id: "text-1" },
      ...(fails ? [{ type: "error" as const, error: new Error("Synthetic provider failure") }] : []),
      { type: "finish", finishReason: { unified: fails ? "error" : "stop", raw: fails ? "error" : "stop" }, usage: {
        inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 2, text: 2, reasoning: 0 },
      } },
    ] }),
  } });
}

function transport() {
  const handle = createChatHandler({ getApiKey: () => "synthetic-offline-key", prepare: prepareConversation, run: streamRestaurantReply });
  return new DefaultChatTransport({ api: "http://offline.test/api/chat", body: { threadId: scope.threadId },
    fetch: (input, init) => handle(new Request(input, init)),
  });
}

async function send(messages: UIMessage[], signal = new AbortController().signal, observe?: (message: UIMessage) => void) {
  const chunks = await transport().sendMessages({ trigger: "submit-message", chatId: scope.threadId, messageId: undefined, messages, abortSignal: signal });
  let reply: UIMessage | undefined;
  for await (const message of readUIMessageStream({ stream: chunks })) {
    reply = message;
    observe?.(message);
  }
  return reply;
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  vi.stubEnv("CHAT_SERVER_TOKEN", "synthetic-offline-token");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline test attempted network access"));
  backend = convexTest(schema, modules);
  agentTest.register(backend);
  await backend.mutation(api.threads.initialize, { threadId: scope.threadId });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("production Mastra chat stream", () => {
  it("saves the streamed message ID and reloads it as context for a follow-up", async () => {
    model = replying("Which ingredients and vendor offers do you have?");
    const first = await send([firstPrompt]);
    expect(first && textOf(first)).toBe("Which ingredients and vendor offers do you have?");
    const entries = await backend.query(api.history.loadEntries, scope);
    expect(entries.map((entry) => entry.id)).toEqual(["prompt-1", first?.id]);
    expect(entries[1]?.parentId).toBe("prompt-1");
    const restored = await validateUIMessages({ messages: entries.map((entry) => ({ id: entry.id, ...JSON.parse(entry.blob) })) });
    expect(restored[1] && textOf(restored[1])).toBe("Which ingredients and vendor offers do you have?");

    model = replying("4");
    const followUp: UIMessage = { id: "prompt-2", role: "user", parts: [{ type: "text", text: "What serving count did I give you?" }] };
    const second = await send([...restored, followUp]);
    expect(second && textOf(second)).toBe("4");
    const context = JSON.stringify(model.doStreamCalls[0]?.prompt);
    expect(context).toContain("Tomato soup recipe for 4 servings");
    expect(context).toContain("Which ingredients and vendor offers do you have?");
    expect(model.doStreamCalls[0]?.maxOutputTokens).toBe(1200);
    expect((await backend.query(api.history.loadEntries, scope)).map((entry) => entry.id)).toEqual(["prompt-1", first?.id, "prompt-2", second?.id]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps the saved prompt without treating interrupted partial text as a completed reply", async () => {
    const abort = new AbortController();
    model = new MockLanguageModelV4({ doStream: async ({ abortSignal }) => ({
      stream: new ReadableStream({ start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        controller.enqueue({ type: "text-start", id: "partial" });
        controller.enqueue({ type: "text-delta", id: "partial", delta: "Partial answer" });
        abortSignal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
      } }),
    }) });
    let sawPartial = false;
    const partial = await send([firstPrompt], abort.signal, (message) => {
      if (textOf(message) === "Partial answer") { sawPartial = true; abort.abort(); }
    });
    expect(sawPartial).toBe(true);
    const entries = await backend.query(api.history.loadEntries, scope);
    expect(entries.map((entry) => entry.id)).toEqual(["prompt-1"]);
    expect(partial).toBeDefined();
    const history = createConvexHistoryStore(new ConvexHttpClient("https://synthetic.convex.cloud"), { current: () => scope.threadId }, vi.fn()).withFormat(aiSDKV6FormatAdapter);
    if (partial) await history.append({ parentId: firstPrompt.id, message: partial });
    model = replying("4");
    const followUp: UIMessage = { id: "after-abort", role: "user", parts: [{ type: "text", text: "What serving count did I give you?" }] };
    await history.append({ parentId: partial?.id ?? null, message: followUp });
    const reply = await send([firstPrompt, ...(partial ? [partial] : []), followUp]);
    await history.append({ parentId: partial?.id ?? null, message: followUp });
    expect(reply && textOf(reply)).toBe("4");
    expect(JSON.stringify(model.doStreamCalls[0]?.prompt)).not.toContain("Partial answer");
    const reloaded = await history.load();
    expect(reloaded.messages.map((entry) => entry.message.id)).toEqual([firstPrompt.id, followUp.id, reply?.id]);
    expect(reloaded.messages[1]?.parentId).toBe(firstPrompt.id);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not save a provider's failed partial answer as completed history", async () => {
    model = replying("Unfinished provider answer", true);
    await send([firstPrompt]);
    expect((await backend.query(api.history.loadEntries, scope)).map((entry) => entry.id)).toEqual(["prompt-1"]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("saves a valid prompt even when the server has no model credential", async () => {
    const run = vi.fn();
    const handle = createChatHandler({ getApiKey: () => undefined, prepare: prepareConversation, run });
    const response = await handle(new Request("http://offline.test/api/chat", { method: "POST", body: JSON.stringify({ threadId: scope.threadId, messages: [firstPrompt] }) }));
    expect(response.status).toBe(503);
    expect((await backend.query(api.history.loadEntries, scope)).map((entry) => entry.id)).toEqual(["prompt-1"]);
    expect(run).not.toHaveBeenCalled();
  });
});
