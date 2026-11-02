import { v } from "convex/values";
import { env, mutation } from "./_generated/server";

export const record = mutation({
  args: {
    serverToken: v.string(), requestId: v.string(), model: v.string(),
    inputTokens: v.number(), outputTokens: v.number(), totalTokens: v.number(), durationMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { serverToken, ...usage }) => {
    const expected = env.CHAT_SERVER_TOKEN?.trim();
    if (!expected || serverToken !== expected) throw new Error("Server authentication required.");
    if (usage.requestId.length > 100 || usage.model !== "muse-spark-1.3" || [usage.inputTokens, usage.outputTokens, usage.totalTokens, usage.durationMs].some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Invalid usage report.");
    const existing = await ctx.db.query("usage").withIndex("by_requestId", (q) => q.eq("requestId", usage.requestId)).unique();
    if (!existing) await ctx.db.insert("usage", usage);
    return null;
  },
});
