import { Mastra } from '@mastra/core/mastra';
import { createWorksheetAgent } from 'restaurant-ordering-harness/src/worksheet-agent';

/**
 * In-process Mastra instance for the worksheet chat route. The model key
 * stays server-side; the browser never sees it.
 */
export function createMastra() {
  const apiKey = process.env.META_MODEL_API_KEY?.trim();
  if (!apiKey) throw new Error('Set META_MODEL_API_KEY in web/.env before starting the chat.');
  return new Mastra({ agents: { worksheet: createWorksheetAgent(apiKey) } });
}
