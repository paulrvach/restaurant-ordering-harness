import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { createMastra } from '../../../mastra';

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: never[] };
    const stream = await handleChatStream({
      mastra: createMastra(),
      agentId: 'worksheet',
      params: { messages },
      version: 'v7',
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat route failed:', error instanceof Error ? error.message : 'unknown error');
    return new Response('Chat unavailable. Check server configuration.', { status: 500 });
  }
}
