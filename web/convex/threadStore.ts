import { createThread } from "@convex-dev/agent";
import { components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export function checkThreadId(threadId: string) {
  if (!threadId || threadId.length > 200) throw new Error("Thread id must be 1-200 characters.");
}

export async function findThread(ctx: QueryCtx, threadId: string) {
  checkThreadId(threadId);
  return ctx.db.query("threads").withIndex("by_thread", (q) => q.eq("threadId", threadId)).unique();
}

export async function requireThread(ctx: QueryCtx, threadId: string) {
  const thread = await findThread(ctx, threadId);
  if (!thread) throw new Error("This conversation no longer exists. Start a new chat.");
  return thread;
}

export async function ensureAgentThread(ctx: MutationCtx, threadId: string) {
  const thread = await requireThread(ctx, threadId);
  if (thread.agentThreadId) return thread.agentThreadId;
  const agentThreadId = await createThread(ctx, components.agent, { title: thread.title ?? "New chat" });
  await ctx.db.patch(thread._id, { agentThreadId });
  return agentThreadId;
}
