import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  threads: defineTable({
    threadId: v.string(),
    title: v.optional(v.string()),
    status: v.union(v.literal("regular"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
    agentThreadId: v.optional(v.string()),
  }).index("by_thread", ["threadId"]).index("by_status_updatedAt", ["status", "updatedAt"]),
  // Kept for lazy migration of conversations created before the repair.
  histories: defineTable({
    threadId: v.string(),
    format: v.string(),
    blob: v.string(),
    updatedAt: v.number(),
  }).index("by_thread_format", ["threadId", "format"]),
  historyRefs: defineTable({
    threadId: v.string(), format: v.string(), messageId: v.string(),
    parentId: v.union(v.string(), v.null()), componentMessageId: v.string(),
  }).index("by_thread_format", ["threadId", "format"])
    .index("by_thread_format_message", ["threadId", "format", "messageId"]),
  historyMigrations: defineTable({ threadId: v.string(), format: v.string() })
    .index("by_thread_format", ["threadId", "format"]),
  usage: defineTable({
    requestId: v.string(), model: v.string(), inputTokens: v.number(),
    outputTokens: v.number(), totalTokens: v.number(), durationMs: v.number(),
  }).index("by_requestId", ["requestId"]),
});
