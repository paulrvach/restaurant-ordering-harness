import { randomUUID } from 'node:crypto';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse, type UIMessage, type UIMessageChunk } from 'ai';
import type { WorksheetSession } from 'restaurant-ordering-harness/src/worksheet-agent';
import { createMastra, seedWorksheet } from '../../../mastra';

export const maxDuration = 30;
type IssuedGate = { name: string; args: unknown; consumed: boolean; result?: unknown };
type Conversation = { session: WorksheetSession; issued: Map<string, IssuedGate>; touched: number; demoStarted: boolean };
const conversations = new Map<string, Conversation>();
const gateNames = new Set(['proposeOrderDraft', 'requestMissingFact', 'approveOrderDraft']);
let active = false;

export async function GET() {
  const offline = process.env.WORKSHEET_OFFLINE_DEMO === '1';
  return Response.json({ status: 'ok', mode: offline ? 'offline-synthetic' : 'meta', configured: offline || Boolean(process.env.META_MODEL_API_KEY?.trim()) });
}

export async function POST(request: Request) {
  if (active) return Response.json({ error: 'One reply is already running. Try again after it finishes.' }, { status: 429 });
  let body: { id: string; messages: UIMessage[] };
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 100_000) return Response.json({ error: 'Chat input is too large.' }, { status: 413 });
    const text = await request.text();
    if (text.length > 100_000) return Response.json({ error: 'Chat input is too large.' }, { status: 413 });
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error();
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.id !== 'string' || candidate.id.length === 0 || candidate.id.length > 200 || !Array.isArray(candidate.messages) || candidate.messages.length === 0 || candidate.messages.length > 100) throw new Error();
    if (!candidate.messages.every((message: unknown) => {
      if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string' || !message.id || message.id.length > 200 || !('role' in message) || !['user', 'assistant'].includes(String(message.role)) || !('parts' in message) || !Array.isArray(message.parts) || message.parts.length > 1000) return false;
      return message.parts.every((part: unknown) => part && typeof part === 'object' && 'type' in part && typeof part.type === 'string' && part.type.length > 0 && part.type.length <= 200 && (part.type !== 'text' || ('text' in part && typeof part.text === 'string')));
    })) throw new Error();
    body = { id: candidate.id, messages: candidate.messages };
  } catch {
    return Response.json({ error: 'Send a thread id and bounded messages array.' }, { status: 400 });
  }
  if (process.env.WORKSHEET_OFFLINE_DEMO !== '1' && !process.env.META_MODEL_API_KEY?.trim()) return Response.json({ error: 'Chat is not configured. Set META_MODEL_API_KEY on the server or explicitly enable WORKSHEET_OFFLINE_DEMO=1.' }, { status: 503 });
  if (active) return Response.json({ error: 'One reply is already running. Try again after it finishes.' }, { status: 429 });
  active = true;
  try {
    const cookie = /(?:^|;\s*)worksheet_session=([a-f0-9-]{36})(?:;|$)/.exec(request.headers.get('cookie') ?? '')?.[1] ?? randomUUID();
    const key = `${cookie}:${body.id}`;
    for (const [id, entry] of conversations) if (Date.now() - entry.touched > 3_600_000) conversations.delete(id);
    let entry = conversations.get(key);
    const userText = body.messages.filter(message => message.role === 'user').flatMap(message => message.parts.filter(part => part.type === 'text').map(part => part.text)).join('\n');
    if (!entry) {
      if (conversations.size >= 100) { active = false; return Response.json({ error: 'Local demo session limit reached. Restart the server.' }, { status: 503 }); }
      entry = { session: seedWorksheet(userText), issued: new Map(), touched: Date.now(), demoStarted: false };
      conversations.set(key, entry);
    }
    entry.touched = Date.now();
    if (!entry.demoStarted && /bistro|stew|tomato soup|recipe|servings/i.test(userText)) {
      if (process.env.WORKSHEET_OFFLINE_DEMO === '1' && !/bistro stew|tomato soup/i.test(userText)) {
        active = false;
        return Response.json({ error: 'The offline demo supports synthetic bistro stew and tomato soup. Select one by name.' }, { status: 400 });
      }
      entry.session = seedWorksheet(userText);
      entry.demoStarted = true;
    }
    try {
      const batch: { gate: IssuedGate; output: unknown }[] = [];
      for (const message of body.messages) for (const part of message.parts) {
        if (!part.type.startsWith('tool-') || !('toolCallId' in part) || !('state' in part) || part.state !== 'output-available') continue;
        const gate = entry.issued.get(part.toolCallId);
        if (!gate) {
          if (gateNames.has(part.type.slice(5))) throw new Error();
          continue;
        }
        if (!('input' in part) || !('output' in part) || part.type !== `tool-${gate.name}` || JSON.stringify(part.input) !== JSON.stringify(gate.args)) throw new Error();
        if (gate.consumed) { if (JSON.stringify(part.output) !== JSON.stringify(gate.result)) throw new Error(); continue; }
        const repeat = batch.find(item => item.gate === gate);
        if (repeat) {
          if (JSON.stringify(part.output) !== JSON.stringify(repeat.output)) throw new Error();
          continue;
        }
        batch.push({ gate, output: part.output });
      }
      // Validate the whole batch against the pre-batch worksheet before mutating it.
      for (const { gate } of batch) {
        if (!entry.session.validateGate(gate.name, gate.args)) throw new Error();
      }
      // Apply proposals before questions: answering a question recomputes the
      // draft, which would otherwise invalidate an issued proposal below.
      const gateOrder = (name: string) => name === 'proposeOrderDraft' ? 0 : name === 'requestMissingFact' ? 1 : 2;
      batch.sort((left, right) => gateOrder(left.gate.name) - gateOrder(right.gate.name));
      for (const { gate, output } of batch) {
        entry.session.ingestResult(gate.name, gate.args, output);
        gate.result = structuredClone(output);
        gate.consumed = true;
      }
    } catch {
      active = false;
      return Response.json({ error: 'This answer does not match the current worksheet. Start a new recipe thread.' }, { status: 409 });
    }
    try {
      const stream = await handleChatStream({
        mastra: createMastra(entry.session, !entry.demoStarted), agentId: 'order-worksheet', version: 'v7',
        params: { messages: body.messages, maxSteps: 3, maxProcessorRetries: 0, modelSettings: { maxOutputTokens: 1024, maxRetries: 0 }, abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        onError: () => 'Chat failed. Please retry the request.',
      });
      const reader = stream.getReader();
      const conversation = entry;
      const guarded = new ReadableStream<UIMessageChunk>({
        async pull(controller) {
          try {
            while (true) {
              const next = await reader.read();
              if (next.done) { active = false; controller.close(); return; }
              const part = next.value;
              if (part.type === 'tool-input-delta') continue;
              if (part.type === 'tool-input-available' && gateNames.has(part.toolName)) {
                if (!conversation.session.validateGate(part.toolName, part.input)) {
                  controller.enqueue({ type: 'tool-output-error', toolCallId: part.toolCallId, errorText: 'The proposed tool does not match the server worksheet. Retry the recipe.' });
                  return;
                }
                conversation.issued.set(part.toolCallId, { name: part.toolName, args: part.input, consumed: false });
              }
              controller.enqueue(part);
              return;
            }
          } catch { active = false; await reader.cancel().catch(() => {}); controller.enqueue({ type: 'error', errorText: 'Chat stream failed. Please retry.' }); controller.close(); }
        },
        async cancel() { active = false; await reader.cancel(); },
      });
      return createUIMessageStreamResponse({ stream: guarded, headers: { 'set-cookie': `worksheet_session=${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` } });
    } catch {
      active = false;
      return Response.json({ error: 'Chat unavailable. Check server configuration.' }, { status: 500 });
    }
  } catch {
    active = false;
    return Response.json({ error: 'Chat unavailable. Start a new recipe thread.' }, { status: 500 });
  }
}
