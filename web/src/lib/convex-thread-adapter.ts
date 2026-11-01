"use client";

import { useMemo } from "react";
import {
  useAui, type GenericThreadHistoryAdapter, type MessageFormatAdapter,
  type MessageFormatItem, type RemoteThreadListAdapter, type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { ConvexReactClient } from "convex/react";
import { createAssistantStream } from "assistant-stream";
import { api } from "../../convex/_generated/api";

type Client = Pick<ConvexReactClient, "query" | "mutation">;
type Remote = { current(): string | undefined; initialize(): Promise<string> };
type ReportError = (message: string) => void;

export function createConvexHistoryStore(client: Client, remote: Remote, reportError: ReportError) {
  const guard = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try { return await operation(); }
    catch (error) {
      reportError("Your chat could not be saved or loaded. Check the connection and reload before continuing.");
      throw error;
    }
  };
  return {
    withFormat<TMessage, TStorage extends Record<string, unknown>>(codec: MessageFormatAdapter<TMessage, TStorage>): GenericThreadHistoryAdapter<TMessage> {
      const upsert = async (item: MessageFormatItem<TMessage>) => guard(async () => {
        const threadId = await remote.initialize();
        await client.mutation(api.history.upsert, {
          threadId, format: codec.format, id: codec.getId(item.message),
          parentId: item.parentId, blob: JSON.stringify(codec.encode(item)),
        });
      });
      return {
        load: () => guard(async () => {
          const threadId = remote.current();
          if (!threadId) return { messages: [] };
          const rows = await client.query(api.history.loadEntries, { threadId, format: codec.format });
          return {
            headId: rows.at(-1)?.id ?? null,
            messages: rows.map((row) => codec.decode({ id: row.id, parent_id: row.parentId, format: codec.format, content: JSON.parse(row.blob) as TStorage })),
          };
        }),
        append: upsert,
        update: upsert,
        delete: (items) => guard(async () => {
          const threadId = remote.current();
          if (threadId) await client.mutation(api.history.remove, { threadId, format: codec.format, ids: items.map((item) => codec.getId(item.message)) });
        }),
      };
    },
  };
}

const repositoryCodec: MessageFormatAdapter<ThreadMessage, Record<string, unknown>> = {
  format: "repository", getId: (message) => message.id,
  encode: ({ message }) => JSON.parse(JSON.stringify(message)) as Record<string, unknown>,
  decode: ({ content, parent_id }) => ({ parentId: parent_id, message: { ...content, createdAt: new Date(content.createdAt as string) } as ThreadMessage }),
};

export function createConvexThreadListAdapter(client: Client, reportError: ReportError): RemoteThreadListAdapter {
  return {
    unstable_useAdapters: function useConvexAdapters() {
      const aui = useAui();
      return useMemo(() => {
        const store = createConvexHistoryStore(client, {
          current: () => aui.threadListItem.getState().remoteId ?? undefined,
          initialize: async () => (await aui.threadListItem.initialize()).remoteId,
        }, reportError);
        const repository = store.withFormat(repositoryCodec);
        const history: ThreadHistoryAdapter = {
          load: () => repository.load(), append: (item) => repository.append(item),
          update: (item) => repository.append(item), withFormat: store.withFormat,
        };
        return { history };
      }, [aui]);
    },
    async list() {
      const rows = await client.query(api.threads.list, {});
      return { threads: rows.map((row) => ({ remoteId: row.threadId, status: row.status, ...(row.title ? { title: row.title } : {}) })) };
    },
    async initialize(threadId) { return client.mutation(api.threads.initialize, { threadId }); },
    async rename(threadId, title) { await client.mutation(api.threads.rename, { threadId, title }); },
    async archive(threadId) { await client.mutation(api.threads.setStatus, { threadId, status: "archived" }); },
    async unarchive(threadId) { await client.mutation(api.threads.setStatus, { threadId, status: "regular" }); },
    async delete(threadId) { await client.mutation(api.threads.removeThread, { threadId }); },
    async fetch(threadId) {
      const row = await client.query(api.threads.fetch, { threadId });
      if (!row) throw new Error("This conversation no longer exists.");
      return { remoteId: row.threadId, status: row.status, ...(row.title ? { title: row.title } : {}) };
    },
    async generateTitle(threadId, messages) {
      const title = messages.find((m) => m.role === "user")?.content
        .filter((part) => part.type === "text").map((part) => part.text).join(" ").trim().slice(0, 60);
      if (title) await client.mutation(api.threads.rename, { threadId, title });
      return createAssistantStream((controller) => { if (title) controller.appendText(title); });
    },
  };
}
