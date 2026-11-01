// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllEnvs());
function setup() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  return t;
}

describe("durable chat history", () => {
  it("keeps both messages when two clients append at the same time", async () => {
    const t = setup();
    await t.mutation(api.threads.initialize, { threadId: "concurrent-chat" });
    const entry = (id: string, text: string) => ({
      threadId: "concurrent-chat", format: "ai-sdk", id, parentId: null,
      blob: JSON.stringify({ id, role: "user", parts: [{ type: "text", text }] }),
    });
    await Promise.all([
      t.mutation(api.history.upsert, entry("first", "Tomato soup for four")),
      t.mutation(api.history.upsert, entry("second", "We have 200 g of tomatoes")),
    ]);
    const saved = await t.query(api.history.loadEntries, { threadId: "concurrent-chat", format: "ai-sdk" });
    expect(saved.map((item) => item.id).sort()).toEqual(["first", "second"]);
  });

  it("migrates a legacy conversation without dropping its first message", async () => {
    const t = setup();
    await t.mutation(api.threads.initialize, { threadId: "legacy" });
    await t.run(async (ctx) => {
      await ctx.db.insert("histories", {
        threadId: "legacy", format: "ai-sdk", updatedAt: 1,
        blob: JSON.stringify([{ id: "old", parent_id: null, format: "ai-sdk", content: { role: "user", parts: [{ type: "text", text: "Original recipe" }] } }]),
      });
    });
    const args = { threadId: "legacy", format: "ai-sdk" };
    expect((await t.query(api.history.loadEntries, args)).map((item) => item.id)).toEqual(["old"]);
    await t.mutation(api.history.upsert, { ...args, id: "new", parentId: "old", blob: JSON.stringify({ role: "assistant", parts: [{ type: "text", text: "What is the base yield?" }] }) });
    expect((await t.query(api.history.loadEntries, args)).map((item) => item.id)).toEqual(["old", "new"]);
  });

  it("updates a message in place and reparents children when deleting", async () => {
    const t = setup();
    await t.mutation(api.threads.initialize, { threadId: "edited" });
    const args = { threadId: "edited", format: "ai-sdk" };
    const put = (id: string, parentId: string | null, text: string) => t.mutation(api.history.upsert, { ...args, id, parentId, blob: JSON.stringify({ role: "user", parts: [{ type: "text", text }] }) });
    await put("a", null, "Four servings");
    await put("b", "a", "Eight servings");
    await put("b", "a", "Twelve servings");
    expect((await t.query(api.history.loadEntries, args)).length).toBe(2);
    await t.mutation(api.history.remove, { ...args, ids: ["a"] });
    const [remaining] = await t.query(api.history.loadEntries, args);
    expect(remaining?.parentId).toBe(null);
    expect(remaining?.blob).toContain("Twelve servings");
    await t.mutation(api.history.remove, { ...args, ids: ["b"] });
    expect(await t.query(api.history.loadEntries, args)).toEqual([]);
  });

  it("refuses orphan writes after a conversation is deleted", async () => {
    const t = setup();
    await t.mutation(api.threads.initialize, { threadId: "deleted" });
    await t.mutation(api.threads.removeThread, { threadId: "deleted" });
    await expect(t.mutation(api.history.upsert, { threadId: "deleted", format: "ai-sdk", id: "late", parentId: null, blob: JSON.stringify({ role: "user", parts: [] }) })).rejects.toThrow("no longer exists");
  });

  it("hides archived threads and retains their history", async () => {
    const t = setup();
    await t.mutation(api.threads.initialize, { threadId: "archive" });
    await t.mutation(api.history.upsert, { threadId: "archive", format: "ai-sdk", id: "a", parentId: null, blob: JSON.stringify({ role: "user", parts: [{ type: "text", text: "Recipe" }] }) });
    await t.mutation(api.threads.setStatus, { threadId: "archive", status: "archived" });
    expect(await t.query(api.threads.list, {})).toEqual([]);
    expect((await t.query(api.history.loadEntries, { threadId: "archive", format: "ai-sdk" })).length).toBe(1);
  });

  it("rejects usage writes without a server credential", async () => {
    const t = setup();
    await expect(t.mutation(api.usage.record, { serverToken: "untrusted", requestId: "usage-test", model: "muse-spark-1.3", inputTokens: 1, outputTokens: 2, totalTokens: 3, durationMs: 1 })).rejects.toThrow("Server authentication required");
  });
  it("records usage once with a server credential supplied through stdin", async () => {
    vi.stubEnv("CHAT_SERVER_TOKEN", "synthetic-reporting-token\r\n");
    const t = setup();
    const usage = { serverToken: "synthetic-reporting-token", requestId: "usage-test", model: "muse-spark-1.3", inputTokens: 10, outputTokens: 4, totalTokens: 14, durationMs: 20 };
    await t.mutation(api.usage.record, usage);
    await t.mutation(api.usage.record, usage);
    const rows = await t.run(async (ctx) => ctx.db.query("usage").withIndex("by_requestId", (q) => q.eq("requestId", "usage-test")).take(2));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalTokens).toBe(14);
    expect(rows[0]).not.toHaveProperty("serverToken");
  });
});
