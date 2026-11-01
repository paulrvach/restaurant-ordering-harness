import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { ChatMessage } from "./chat-handler";

export const HISTORY_FORMAT = "ai-sdk/v6";
type SavedEntry = { id: string; parentId: string | null; blob: string };

export function savedBranch(entries: SavedEntry[], headId: string): ChatMessage[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const visited = new Set<string>();
  const branch: ChatMessage[] = [];
  let id: string | null = headId;
  while (id) {
    if (visited.has(id) || visited.size >= 80) throw new Error("Conversation requires review or a new chat.");
    visited.add(id);
    const entry = byId.get(id);
    if (!entry) throw new Error("Conversation has a missing parent message.");
    const raw = JSON.parse(entry.blob) as { role: unknown; parts: { type: string; text?: string }[] };
    if (raw.role !== "user" && raw.role !== "assistant") throw new Error("Invalid message role.");
    const content = raw.parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
    if (content.trim()) branch.push({ id: entry.id, role: raw.role, content });
    id = entry.parentId;
  }
  return branch.reverse();
}

export function conversationClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Convex is not configured.");
  return new ConvexHttpClient(url);
}

export async function prepareConversation(messages: ChatMessage[], threadId: string | undefined) {
  const prompt = messages.at(-1);
  if (!threadId || !prompt?.id || prompt.role !== "user") throw new Error("A saved conversation and user prompt are required.");
  const client = conversationClient();
  const scope = { threadId, format: HISTORY_FORMAT };
  const entries = await client.query(api.history.loadEntries, scope);
  const parentId = messages.at(-2)?.id ?? null;
  if (parentId && !entries.some((entry) => entry.id === parentId)) throw new Error("The previous message has not been saved.");
  const blob = JSON.stringify({ role: "user", parts: [{ type: "text", text: prompt.content }] });
  await client.mutation(api.history.upsert, { ...scope, id: prompt.id, parentId, blob });
  const saved = await client.query(api.history.loadEntries, scope);
  return { threadId, promptId: prompt.id, messages: savedBranch(saved, prompt.id) };
}
