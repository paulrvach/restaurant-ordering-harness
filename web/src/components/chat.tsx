"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadListItemPrimitive,
  ThreadListPrimitive, ThreadPrimitive, useAui, useAuiState, useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime, useAISDKError, useAISDKChat } from "@assistant-ui/ai-sdk";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useConvex, useConvexConnectionState, useQuery } from "convex/react";
import { ArrowUp, ArrowDown, Square, PanelLeft, SquarePen, Utensils, Soup, Carrot, ClipboardList, Check, AlertCircle, Trash2, X, MessageSquare } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { createConvexThreadListAdapter } from "@/lib/convex-thread-adapter";
import { hasConvex } from "@/app/convex-client-provider";

const STARTERS = [
  { label: "Build a recipe", text: "Help me build a tomato soup recipe for 4 servings.", icon: Soup },
  { label: "Scale a recipe", text: "I want to scale a recipe. What information do you need?", icon: Carrot },
  { label: "Plan an order", text: "Help me gather what I need for a vendor order draft.", icon: ClipboardList },
];

function Composer() {
  const running = useAuiState((s) => s.thread.isRunning);
  return (
    <ComposerPrimitive.Root className="chat-composer">
      <ComposerPrimitive.Input aria-label="Message the restaurant assistant" placeholder="Send a message..." className="composer-input" rows={1} autoFocus />
      <div className="composer-toolbar">
        <span className="model-label"><span className="model-dot" /> Muse Spark <span className="model-version">1.3</span></span>
        {running ? (
          <ComposerPrimitive.Cancel aria-label="Stop response" className="send-button"><Square size={13} fill="currentColor" /></ComposerPrimitive.Cancel>
        ) : (
          <ComposerPrimitive.Send aria-label="Send message" className="send-button"><ArrowUp size={17} /></ComposerPrimitive.Send>
        )}
      </div>
    </ComposerPrimitive.Root>
  );
}

function Starters() {
  const aui = useAui();
  return <div className="starter-chips">{STARTERS.map(({ label, text, icon: Icon }) => (
    <button key={label} type="button" onClick={() => aui.thread.composer().setText(text)}><Icon size={14} />{label}</button>
  ))}</div>;
}

function MarkdownText() { return <MarkdownTextPrimitive className="message-markdown" />; }

function UserMessage() {
  return <MessagePrimitive.Root className="message-row user-message"><div className="user-bubble"><MessagePrimitive.Parts /></div></MessagePrimitive.Root>;
}

function AssistantMessage() {
  const running = useAuiState((s) => s.message.status?.type === "running");
  const empty = useAuiState((s) => s.message.content.length === 0);
  return <MessagePrimitive.Root className="message-row assistant-message">
    <div className="assistant-avatar"><Utensils size={14} /></div>
    <div className="assistant-content">
      {running && empty ? <span className="thinking" role="status">Thinking<span>...</span></span> : <MessagePrimitive.Parts components={{ Text: MarkdownText }} />}
    </div>
  </MessagePrimitive.Root>;
}

function ChatError() {
  const error = useAISDKError();
  const chat = useAISDKChat();
  if (!error) return null;
  return <div role="alert" className="chat-error"><AlertCircle size={16} /><span>{error.message || "The assistant could not respond. Please try again."}</span><button type="button" onClick={() => { chat?.clearError(); void chat?.regenerate(); }}>Try again</button></div>;
}

function Thread() {
  const count = useAuiState((s) => s.thread.messages.length);
  const loading = useAuiState((s) => s.thread.isLoading);
  return (
    <ThreadPrimitive.Root className={`chat-thread ${count === 0 ? "is-empty" : ""}`}>
      {count === 0 ? (
        <div className="welcome">
          {loading ? <p className="loading-label" role="status">Loading conversation...</p> : <>
            <div className="welcome-mark"><Utensils size={22} strokeWidth={1.5} /></div>
            <h1>How can I help you today?</h1>
            <p className="welcome-description">A little less prep. A little more service.</p>
            <div className="welcome-composer"><Composer /><Starters /></div>
          </>}
        </div>
      ) : <>
        <ThreadPrimitive.Viewport className="thread-viewport">
          <div className="message-container"><ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} /></div>
          <ThreadPrimitive.ScrollToBottom aria-label="Scroll to latest message" className="scroll-bottom"><ArrowDown size={16} /></ThreadPrimitive.ScrollToBottom>
        </ThreadPrimitive.Viewport>
        <div className="composer-dock"><ChatError /><Composer /><p className="composer-note">Review recipes and source prices. Orders stay drafts.</p></div>
      </>}
    </ThreadPrimitive.Root>
  );
}

function ThreadItem() {
  return <ThreadListItemPrimitive.Root className="thread-item">
    <ThreadListItemPrimitive.Trigger className="thread-trigger"><MessageSquare size={14} /><span><ThreadListItemPrimitive.Title fallback="New chat" /></span></ThreadListItemPrimitive.Trigger>
    <ThreadListItemPrimitive.Delete aria-label="Delete conversation" title="Delete conversation" className="thread-delete"><Trash2 size={13} /></ThreadListItemPrimitive.Delete>
  </ThreadListItemPrimitive.Root>;
}

function Shell({ persistenceError }: { persistenceError: string | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => { if (window.innerWidth < 768) setSidebarOpen(false); }, []);
  const title = useAuiState((s) => s.threadListItem.title);
  const connection = useConvexConnectionState();
  const connected = mounted && connection.isWebSocketConnected;
  const threadsLoading = useAuiState((s) => s.threads.isLoading);
  const hasOlderThreads = useAuiState((s) => s.threads.hasMore);
  const loadingOlderThreads = useAuiState((s) => s.threads.isLoadingMore);
  const aui = useAui();
  const chooseNew = () => { void aui.threads.switchToNewThread(); if (window.innerWidth < 768) setSidebarOpen(false); };
  return <div className={`chat-app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
    {sidebarOpen && <button className="sidebar-overlay" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}
    <aside className="chat-sidebar" aria-label="Conversation history" aria-hidden={!sidebarOpen}>
      <div className="sidebar-brand"><span className="brand-icon"><Utensils size={17} /></span><span>prep<span className="brand-divider">/</span>order</span><button className="mobile-close icon-button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={17} /></button></div>
      <button className="new-thread" onClick={chooseNew}><SquarePen size={16} /> New chat <span>+</span></button>
      <p className="sidebar-section">Conversations</p>
      <ThreadListPrimitive.Root className="thread-list">
        {threadsLoading && <p className="history-loading" role="status">Loading history...</p>}
        <ThreadListPrimitive.Items components={{ ThreadListItem: ThreadItem }} />
        {hasOlderThreads && <ThreadListPrimitive.LoadMore className="load-older">{loadingOlderThreads ? "Loading conversations..." : "Load older conversations"}</ThreadListPrimitive.LoadMore>}
      </ThreadListPrimitive.Root>
      <div className="sidebar-footer"><span className="workspace-avatar">P</span><div><p>Restaurant workspace</p><span>Shared development workspace</span></div></div>
    </aside>
    <main className="chat-main">
      <header className="chat-header"><button className="icon-button" aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"} onClick={() => setSidebarOpen(!sidebarOpen)}><PanelLeft size={17} /></button><span className="thread-title">{title || "New chat"}</span><span className={`save-status ${connected ? "connected" : ""}`}><Check size={12} />{connected ? "Connected to Convex" : "Connecting..."}</span></header>
      {persistenceError && <div role="alert" className="persistence-error"><AlertCircle size={15} />{persistenceError}</div>}
      <Thread />
    </main>
  </div>;
}

function useThreadRuntime() {
  const aui = useAui();
  const id = useAuiState((s) => s.threadListItem.id);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: async () => ({ threadId: (await aui.threadListItem.initialize()).remoteId }),
  }), [aui]);
  const chat = useChat({ id, transport });
  return useAISDKRuntime(chat);
}

function validThreadId(value: string | null) { return value && value.length <= 200 ? value : undefined; }

function ConvexChat() {
  const convex = useConvex();
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const reportError = useCallback((message: string) => setPersistenceError(message), []);
  const adapter = useMemo(() => createConvexThreadListAdapter(convex, reportError), [convex, reportError]);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  useEffect(() => {
    const sync = () => setThreadId(validThreadId(new URLSearchParams(window.location.search).get("thread")));
    sync(); window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const selected = useQuery(api.threads.fetch, threadId ? { threadId } : "skip");
  const onThreadIdChange = useCallback((id: string | undefined) => {
    setThreadId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("thread", id); else url.searchParams.delete("thread");
    window.history.replaceState(null, "", url);
  }, []);
  useEffect(() => {
    if (threadId && selected === null) onThreadIdChange(undefined);
  }, [threadId, selected, onThreadIdChange]);
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useThreadRuntime, adapter, threadId: selected === null ? undefined : threadId, onThreadIdChange });
  return <AssistantRuntimeProvider runtime={runtime}><Shell persistenceError={persistenceError} /></AssistantRuntimeProvider>;
}

export function Chat() {
  if (!hasConvex()) return <main className="setup-message"><Utensils size={28} /><h1>Connect your workspace</h1><p>Set NEXT_PUBLIC_CONVEX_URL in web/.env.local and restart the app to save your conversations.</p></main>;
  return <Suspense fallback={<main className="setup-message" role="status">Opening your workspace...</main>}><ConvexChat /></Suspense>;
}
