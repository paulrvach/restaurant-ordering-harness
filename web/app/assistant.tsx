'use client';

import { useMemo } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/ai-sdk';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { Thread } from '../components/thread';
import { WorksheetShell } from '../components/worksheet-shell';
import { ProposeOrderDraftUI } from '../components/tools/propose-order-draft';
import { RequestMissingFactUI } from '../components/tools/request-missing-fact';
import { ApproveOrderDraftUI } from '../components/tools/approve-order-draft';

export function Assistant() {
  const transport = useMemo(() => new AssistantChatTransport({ api: '/api/chat' }), []);
  const runtime = useChatRuntime({ transport, sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WorksheetShell><Thread /></WorksheetShell>
      <ProposeOrderDraftUI /><RequestMissingFactUI /><ApproveOrderDraftUI />
    </AssistantRuntimeProvider>
  );
}
