export type ChatMessage = { id?: string; role: "user" | "assistant"; content: string };
export type Conversation = { threadId: string; promptId: string };
type Dependencies = {
  getApiKey(): string | undefined;
  prepare?(messages: ChatMessage[], threadId: string | undefined): Promise<Conversation & { messages: ChatMessage[] }>;
  run(messages: ChatMessage[], apiKey: string, signal: AbortSignal, conversation?: Conversation): Promise<Response>;
};

export function providerErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    if ("statusCode" in error && (error.statusCode === 401 || error.statusCode === 403)) return "Meta rejected the server API key. Update it and try again.";
    if ("statusCode" in error && error.statusCode === 429) return "Meta's request limit was reached. Wait a moment, then try again.";
  }
  return "The model could not finish this response. Please try again.";
}

const MAX_BODY_BYTES = 64_000;
const TOO_LARGE = "Message history is too large. Start a new chat.";
class BodyTooLarge extends Error {}

function discardBody(request: Request) {
  void request.body?.cancel().catch(() => {});
}

async function readBody(request: Request, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) return text + decoder.decode();
      bytes += next.value.byteLength;
      if (bytes > MAX_BODY_BYTES) { cancel(); throw new BodyTooLarge(); }
      text += decoder.decode(next.value, { stream: true });
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export function createChatHandler({ getApiKey, prepare, run }: Dependencies) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const length = request.headers.get("content-length");
    if (length !== null && Number(length) > MAX_BODY_BYTES) {
      discardBody(request);
      return new Response(TOO_LARGE, { status: 413 });
    }
    if (active >= 2) {
      discardBody(request);
      return new Response("The assistant is busy. Try again when the current responses finish.", { status: 429 });
    }
    active++;
    const controller = new AbortController();
    const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(45_000)]);
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    signal.addEventListener("abort", release, { once: true });
    let messages: ChatMessage[];
    let threadId: string | undefined;
    try {
      const text = await readBody(request, signal);
      const body: unknown = JSON.parse(text);
      if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 80) throw new Error();
      if ("threadId" in body) {
        if (typeof body.threadId !== "string" || !body.threadId || body.threadId.length > 200) throw new Error();
        threadId = body.threadId;
      }
      messages = body.messages.flatMap<ChatMessage>((message: unknown) => {
        if (!message || typeof message !== "object" || !("role" in message) || (message.role !== "user" && message.role !== "assistant") || !("parts" in message) || !Array.isArray(message.parts)) throw new Error();
        const content = message.parts.map((part: unknown) => {
          if (!part || typeof part !== "object" || !("type" in part)) throw new Error();
          if (part.type === "step-start" || part.type === "reasoning") return "";
          if (part.type !== "text" || !("text" in part) || typeof part.text !== "string") throw new Error();
          return part.text;
        }).join("\n");
        if (!content.trim()) {
          if (message.role === "assistant") return [];
          throw new Error();
        }
        const id = "id" in message && typeof message.id === "string" && message.id.length <= 200 ? message.id : undefined;
        return [{ role: message.role, content, ...(id ? { id } : {}) }];
      });
      if (!messages.length || messages.at(-1)?.role !== "user") throw new Error();
    } catch (error) {
      release();
      if (error instanceof BodyTooLarge) return new Response(TOO_LARGE, { status: 413 });
      if (signal.aborted) return new Response("The request stopped. You can send your message again.", { status: 408 });
      return new Response("Send a text message to continue.", { status: 400 });
    }
    const apiKey = getApiKey()?.trim();
    try {
      let conversation: Conversation | undefined;
      if (prepare) {
        try {
          const prepared = await prepare(messages, threadId);
          messages = prepared.messages;
          conversation = prepared;
        } catch {
          release();
          return new Response("This conversation could not be saved or loaded. Check the connection, then reload before continuing.", { status: 503 });
        }
      }
      if (!apiKey) {
        release();
        return new Response("Chat is not configured. Add the Meta API key to the server environment, then restart the app.", { status: 503 });
      }
      const response = await run(messages, apiKey, signal, conversation);
      if (!response.body) { release(); return response; }
      const reader = response.body.getReader();
      const stream = new ReadableStream<Uint8Array>({
        async pull(target) {
          try {
            const next = await reader.read();
            if (next.done) { release(); target.close(); }
            else target.enqueue(next.value);
          } catch (error) { release(); target.error(error); }
        },
        async cancel(reason) { controller.abort(); release(); await reader.cancel(reason); },
      });
      return new Response(stream, { status: response.status, headers: response.headers });
    } catch {
      release();
      return new Response(signal.aborted ? "The response stopped. You can send your message again." : "The model could not respond. Please try again.", { status: signal.aborted ? 408 : 502 });
    }
  };
}
