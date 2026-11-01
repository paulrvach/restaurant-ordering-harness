import { saveMessage, type Message } from "@convex-dev/agent";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";
import { ensureAgentThread, requireThread } from "./threadStore";

const scope = { threadId: v.string(), format: v.string() };
const entry = v.object({ id: v.string(), parentId: v.union(v.string(), v.null()), blob: v.string() });
const LIMIT = 500;
type Entry = { id: string; parentId: string | null; blob: string };

function checkEntry(item: Entry) {
  if (!item.id || item.id.length > 200 || item.blob.length > 100_000) throw new Error("Message is too large.");
  const message: unknown = JSON.parse(item.blob);
  if (!message || typeof message !== "object") throw new Error("Invalid stored message.");
}

function componentMessage(blob: string) {
  const raw = JSON.parse(blob) as { role?: string; parts?: { type: string; text?: string }[]; content?: unknown };
  const parts: { type: string; text?: string }[] = raw.parts ?? (Array.isArray(raw.content) ? raw.content : []);
  const text = parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
  return {
    role: raw.role === "user" ? "user" as const : "assistant" as const, content: text,
    providerOptions: { assistantUi: { blob } },
  } satisfies Message;
}

async function refs(ctx: QueryCtx, threadId: string, format: string) {
  const rows = await ctx.db.query("historyRefs").withIndex("by_thread_format", (q) => q.eq("threadId", threadId).eq("format", format)).take(LIMIT + 1);
  if (rows.length > LIMIT) throw new Error("Conversation exceeds the 500-message development limit.");
  return rows;
}

async function legacyEntries(ctx: QueryCtx, threadId: string, format: string): Promise<Entry[]> {
  const row = await ctx.db.query("histories").withIndex("by_thread_format", (q) => q.eq("threadId", threadId).eq("format", format)).unique();
  if (!row) return [];
  const parsed: unknown = JSON.parse(row.blob);
  if (!Array.isArray(parsed) || parsed.length > LIMIT) throw new Error("Stored history needs review before migration.");
  return parsed.map((raw: { id: string; parent_id: string | null; content: unknown }) => {
    const item = { id: raw.id, parentId: raw.parent_id, blob: JSON.stringify(raw.content) };
    checkEntry(item);
    return item;
  });
}

async function migrate(ctx: MutationCtx, threadId: string, format: string) {
  if (!format || format.length > 200) throw new Error("Invalid history format.");
  const agentThreadId = await ensureAgentThread(ctx, threadId);
  const done = await ctx.db.query("historyMigrations").withIndex("by_thread_format", (q) => q.eq("threadId", threadId).eq("format", format)).unique();
  if (!done) {
    for (const item of await legacyEntries(ctx, threadId, format)) {
      const { messageId } = await saveMessage(ctx, components.agent, { threadId: agentThreadId, message: componentMessage(item.blob) });
      await ctx.db.insert("historyRefs", { threadId, format, messageId: item.id, parentId: item.parentId, componentMessageId: messageId });
    }
    await ctx.db.insert("historyMigrations", { threadId, format });
  }
  return agentThreadId;
}

export const loadEntries = query({
  args: scope, returns: v.array(entry),
  handler: async (ctx, { threadId, format }) => {
    await requireThread(ctx, threadId);
    const done = await ctx.db.query("historyMigrations").withIndex("by_thread_format", (q) => q.eq("threadId", threadId).eq("format", format)).unique();
    if (!done) return legacyEntries(ctx, threadId, format);
    const rows = await refs(ctx, threadId, format);
    const messages = await ctx.runQuery(components.agent.messages.getMessagesByIds, { messageIds: rows.map((row) => row.componentMessageId) });
    return rows.map((row, index) => {
      const blob: unknown = messages[index]?.message?.providerOptions?.assistantUi?.blob;
      if (typeof blob !== "string") throw new Error("Stored message could not be loaded.");
      return { id: row.messageId, parentId: row.parentId, blob };
    });
  },
});

export const upsert = mutation({
  args: { ...scope, ...entry.fields }, returns: v.null(),
  handler: async (ctx, { threadId, format, ...item }) => {
    checkEntry(item);
    const agentThreadId = await migrate(ctx, threadId, format);
    const existing = await ctx.db.query("historyRefs").withIndex("by_thread_format_message", (q) => q.eq("threadId", threadId).eq("format", format).eq("messageId", item.id)).unique();
    const message = componentMessage(item.blob);
    if (existing) {
      await ctx.runMutation(components.agent.messages.updateMessage, { messageId: existing.componentMessageId, patch: { message } });
      await ctx.db.patch(existing._id, { parentId: item.parentId });
    } else {
      if ((await refs(ctx, threadId, format)).length >= LIMIT) throw new Error("This chat has reached 500 messages. Start a new chat.");
      const { messageId } = await saveMessage(ctx, components.agent, { threadId: agentThreadId, message });
      await ctx.db.insert("historyRefs", { threadId, format, messageId: item.id, parentId: item.parentId, componentMessageId: messageId });
    }
    const thread = await requireThread(ctx, threadId);
    await ctx.db.patch(thread._id, { updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { ...scope, ids: v.array(v.string()) }, returns: v.null(),
  handler: async (ctx, { threadId, format, ids }) => {
    if (ids.length > LIMIT) throw new Error("Too many messages to delete.");
    await migrate(ctx, threadId, format);
    const rows = await refs(ctx, threadId, format);
    const deleted = new Set(ids);
    const parents = new Map(rows.map((row) => [row.messageId, row.parentId]));
    for (const row of rows) {
      if (deleted.has(row.messageId)) {
        await ctx.runMutation(components.agent.messages.deleteByIds, { messageIds: [row.componentMessageId] });
        await ctx.db.delete(row._id);
      } else {
        let parentId = row.parentId;
        const visited = new Set<string>();
        while (parentId && deleted.has(parentId)) {
          if (visited.has(parentId)) throw new Error("Stored message tree contains a cycle.");
          visited.add(parentId);
          parentId = parents.get(parentId) ?? null;
        }
        if (parentId !== row.parentId) await ctx.db.patch(row._id, { parentId });
      }
    }
    return null;
  },
});
