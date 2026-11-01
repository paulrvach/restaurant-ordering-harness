import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { checkThreadId, findThread } from "./threadStore";

const threadMetadata = v.object({
  threadId: v.string(),
  title: v.optional(v.string()),
  status: v.union(v.literal("regular"), v.literal("archived")),
  updatedAt: v.number(),
});

/** Sidebar list, newest first. */
export const list = query({
  args: {},
  returns: v.array(threadMetadata),
  handler: async (ctx) => {
    const rows = await ctx.db.query("threads").withIndex("by_status_updatedAt", (q) => q.eq("status", "regular")).order("desc").take(100);
    return rows.map((row) => ({
      threadId: row.threadId,
      status: row.status,
      updatedAt: row.updatedAt,
      ...(row.title === undefined ? {} : { title: row.title }),
    }));
  },
});

export const fetch = query({
  args: { threadId: v.string() },
  returns: v.union(threadMetadata, v.null()),
  handler: async (ctx, { threadId }) => {
    checkThreadId(threadId);
    const row = await findThread(ctx, threadId);
    return row
      ? {
          threadId: row.threadId,
          status: row.status,
          updatedAt: row.updatedAt,
          ...(row.title === undefined ? {} : { title: row.title }),
        }
      : null;
  },
});

/** Create the thread row if missing; the client thread id stays canonical. */
export const initialize = mutation({
  args: { threadId: v.string() },
  returns: v.object({ remoteId: v.string() }),
  handler: async (ctx, { threadId }) => {
    checkThreadId(threadId);
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique();
    if (!existing) {
      const now = Date.now();
      await ctx.db.insert("threads", { threadId, status: "regular", createdAt: now, updatedAt: now });
    }
    return { remoteId: threadId };
  },
});

export const rename = mutation({
  args: { threadId: v.string(), title: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId, title }) => {
    checkThreadId(threadId);
    if (!title || title.length > 200) throw new Error("Title must be 1-200 characters.");
    const row = await ctx.db
      .query("threads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique();
    if (row) await ctx.db.patch(row._id, { title, updatedAt: Date.now() });
    if (row?.agentThreadId) await ctx.runMutation(components.agent.threads.updateThread, { threadId: row.agentThreadId, patch: { title } });
  },
});

export const setStatus = mutation({
  args: { threadId: v.string(), status: v.union(v.literal("regular"), v.literal("archived")) },
  returns: v.null(),
  handler: async (ctx, { threadId, status }) => {
    checkThreadId(threadId);
    const row = await ctx.db
      .query("threads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique();
    if (row) await ctx.db.patch(row._id, { status, updatedAt: Date.now() });
    if (row?.agentThreadId) await ctx.runMutation(components.agent.threads.updateThread, { threadId: row.agentThreadId, patch: { status: status === "regular" ? "active" : "archived" } });
  },
});

/** Delete a thread and its history. */
export const removeThread = mutation({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    checkThreadId(threadId);
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .unique();
    if (thread?.agentThreadId) await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId: thread.agentThreadId });
    if (thread) await ctx.db.delete(thread._id);
    const histories = await ctx.db
      .query("histories")
      .withIndex("by_thread_format", (q) => q.eq("threadId", threadId))
      .take(20);
    for (const row of histories) await ctx.db.delete(row._id);
    const refs = await ctx.db.query("historyRefs").withIndex("by_thread_format", (q) => q.eq("threadId", threadId)).take(1001);
    if (refs.length > 1000) throw new Error("Conversation requires batched deletion.");
    for (const row of refs) await ctx.db.delete(row._id);
    const migrations = await ctx.db.query("historyMigrations").withIndex("by_thread_format", (q) => q.eq("threadId", threadId)).take(20);
    for (const row of migrations) await ctx.db.delete(row._id);
  },
});
