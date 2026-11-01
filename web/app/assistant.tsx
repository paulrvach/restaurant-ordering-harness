'use client';

import { useMemo } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/ai-sdk';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { Thread } from '../components/thread';
import { ThreadList } from '../components/thread-list';
import { ProposeOrderDraftUI } from '../components/tools/propose-order-draft';
import { RequestMissingFactUI } from '../components/tools/request-missing-fact';
import { ApproveOrderDraftUI } from '../components/tools/approve-order-draft';

export function Assistant() {
  const transport = useMemo(() => new AssistantChatTransport({ api: '/api/chat' }), []);
  const runtime = useChatRuntime({ transport, sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main style={{ display: 'flex', height: '100vh', maxWidth: 1200, margin: '0 auto' }}>
        <aside aria-label="Recipe threads" style={{ width: 220, padding: 16, borderRight: '1px solid #ddd' }}><ThreadList /></aside>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
            <strong>Order worksheet</strong>
            <span style={{ color: '#555', fontSize: 13 }}> · synthetic demo · drafts never place orders</span>
          </header>
          <div style={{ flex: 1, minHeight: 0 }}><Thread /></div>
        </div>
        <ProposeOrderDraftUI /><RequestMissingFactUI /><ApproveOrderDraftUI />
      </main>
    </AssistantRuntimeProvider>
  );
}
