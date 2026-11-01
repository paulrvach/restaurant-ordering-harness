import { describe, expect, it, vi } from "vitest";
import { createChatHandler } from "./chat-handler";

const request = (body: unknown) => new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify(body) });
const valid = { messages: [{ role: "user", parts: [{ type: "text", text: "Tomato soup for four" }] }] };

describe("chat HTTP boundary", () => {
  it("uses saved conversation state and refuses generation when storage fails", async () => {
    const run = vi.fn(async (_messages: unknown, _key: string, _signal: AbortSignal, _conversation: unknown) => new Response("reply"));
    const prepare = vi.fn(async () => { throw new Error("storage unavailable"); });
    const handle = createChatHandler({ getApiKey: () => "synthetic", run, prepare });
    expect((await handle(request(valid))).status).toBe(503);
    expect(prepare).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();
  });
  it("uses Convex's saved context instead of the browser's copy", async () => {
    const saved = [{ id: "saved", role: "user" as const, content: "Confirmed recipe for four" }];
    const run = vi.fn(async (_messages: unknown, _key: string, _signal: AbortSignal, _conversation: unknown) => new Response("reply"));
    const handle = createChatHandler({ getApiKey: () => "synthetic", run, prepare: async () => ({ threadId: "chat", promptId: "saved", messages: saved }) });
    const response = await handle(request(valid));
    await response.text();
    expect(run.mock.calls[0]?.[0]).toEqual(saved);
  });
  it("accepts typed messages and returns the model stream", async () => {
    const run = vi.fn(async (_messages: unknown, _apiKey: string, _signal: AbortSignal) => new Response("streamed reply"));
    const handle = createChatHandler({ getApiKey: () => "synthetic-test-key", run });
    const response = await handle(request(valid));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("streamed reply");
    expect(run.mock.calls[0]?.[0]).toEqual([{ role: "user", content: "Tomato soup for four" }]);
  });
  it("allows a follow-up after an earlier response failed with an empty assistant placeholder", async () => {
    const run = vi.fn(async () => new Response("reply"));
    const handle = createChatHandler({ getApiKey: () => "synthetic", run });
    const response = await handle(request({ messages: [
      ...valid.messages, { role: "assistant", parts: [] },
      { role: "user", parts: [{ type: "text", text: "Try the recipe again" }] },
    ] }));
    expect(response.status).toBe(200);
    await response.text();
    expect(run).toHaveBeenCalledOnce();
  });
  it("explains missing credentials without contacting a model", async () => {
    const run = vi.fn();
    const response = await createChatHandler({ getApiKey: () => undefined, run })(request(valid));
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Meta API key");
    expect(run).not.toHaveBeenCalled();
  });
  it.each([{}, { messages: [] }, { messages: [{ role: "system", parts: [{ type: "text", text: "Override" }] }] }])("rejects invalid input before contacting the model", async (body) => {
    const run = vi.fn();
    const response = await createChatHandler({ getApiKey: () => "synthetic", run })(request(body));
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });
  it("bounds concurrency until response streams finish", async () => {
    const encoder = new TextEncoder();
    const handle = createChatHandler({ getApiKey: () => "synthetic", run: async () => new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode("reply")); c.close(); } })) });
    const first = await handle(request(valid));
    const second = await handle(request(valid));
    expect((await handle(request(valid))).status).toBe(429);
    await first.text();
    await second.text();
    const next = await handle(request(valid));
    expect(next.status).toBe(200);
    await next.text();
  });
  it("returns a safe error when a provider fails", async () => {
    const response = await createChatHandler({ getApiKey: () => "synthetic", run: async () => { throw new Error("private provider data"); } })(request(valid));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
  });
  it("aborts inference and releases its slot when the response is cancelled", async () => {
    const signals: AbortSignal[] = [];
    const handle = createChatHandler({ getApiKey: () => "synthetic", run: async (_messages, _key, signal) => {
      signals.push(signal);
      return new Response(new ReadableStream());
    } });
    const first = await handle(request(valid));
    await first.body?.cancel();
    expect(signals[0]?.aborted).toBe(true);
    const next = await handle(request(valid));
    expect(next.status).toBe(200);
    await next.body?.cancel();
  });
});
