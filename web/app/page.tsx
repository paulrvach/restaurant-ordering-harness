'use client';

import { useMemo } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { Thread } from '../components/thread';
import { ProposeOrderDraftUI } from '../components/tools/propose-order-draft';
import { RequestMissingFactUI } from '../components/tools/request-missing-fact';
import { ApproveOrderDraftUI } from '../components/tools/approve-order-draft';

function Chat() {
  const transport = useMemo(() => new AssistantChatTransport({ api: '/api/chat' }), []);
  const runtime = useChatRuntime({ transport });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 760, margin: '0 auto' }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
          <strong>Order worksheet</strong>
          <span style={{ color: '#555', fontSize: 13 }}> · synthetic demo · drafts never place orders</span>
        </header>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Thread />
        </div>
        <ProposeOrderDraftUI />
        <RequestMissingFactUI />
        <ApproveOrderDraftUI />
      </main>
    </AssistantRuntimeProvider>
  );
}

export default function Page() {
  return <Chat />;
}
