import { randomUUID } from 'node:crypto';
import type { LanguageModel } from '@mastra/core/llm';
import type { WorksheetSession } from 'restaurant-ordering-harness/src/worksheet-agent';

type OfflineModel = Extract<LanguageModel, { specificationVersion: 'v2' }>;
type ModelPart = Awaited<ReturnType<OfflineModel['doStream']>>['stream'] extends ReadableStream<infer Part> ? Part : never;

// This explicit local demo emits synthetic data and cannot contact a provider.
export function createOfflineModel(session: WorksheetSession, plainChat: boolean): OfflineModel {
  return {
    specificationVersion: 'v2', provider: 'synthetic-offline', modelId: 'worksheet-demo-v1', supportedUrls: {},
    doGenerate: async () => { throw new Error('The offline demo supports streaming only.'); },
    doStream: async () => ({
      stream: new ReadableStream<ModelPart>({
        async start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          const state = session.prepare();
          if (plainChat || state.approved) {
            controller.enqueue({ type: 'text-start', id: 'offline-text' });
            const words = state.approved ? ['The synthetic draft is reviewed. ', 'No order was placed.'] : ['Offline synthetic chat is ready. ', 'No model API was called.'];
            for (const delta of words) {
              controller.enqueue({ type: 'text-delta', id: 'offline-text', delta });
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
            controller.enqueue({ type: 'text-end', id: 'offline-text' });
          } else {
            const calls = state.questions.length
              ? [{ name: 'proposeOrderDraft', args: state.proposal }, ...state.questions.map(args => ({ name: 'requestMissingFact', args }))]
              : state.reviewed && state.approval
                ? [{ name: 'approveOrderDraft', args: state.approval }]
                : [{ name: 'proposeOrderDraft', args: state.proposal }];
            for (const call of calls) {
              const toolCallId = randomUUID();
              controller.enqueue({ type: 'tool-input-start', id: toolCallId, toolName: call.name });
              controller.enqueue({ type: 'tool-input-delta', id: toolCallId, delta: JSON.stringify(call.args) });
              controller.enqueue({ type: 'tool-input-end', id: toolCallId });
              controller.enqueue({ type: 'tool-call', toolCallId, toolName: call.name, input: JSON.stringify(call.args) });
            }
          }
          controller.enqueue({ type: 'finish', finishReason: plainChat || state.approved ? 'stop' : 'tool-calls', usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } });
          controller.close();
        },
      }),
    }),
  };
}
