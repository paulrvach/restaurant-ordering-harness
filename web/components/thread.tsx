'use client';

import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react';

/** Minimal chat thread built from assistant-ui primitives. */
export function Thread() {
  return (
    <ThreadPrimitive.Root style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ThreadPrimitive.Viewport style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <ThreadPrimitive.Empty>
          <div style={{ color: '#555', maxWidth: 560 }}>
            <p style={{ fontWeight: 600 }}>Describe a recipe to draft an order.</p>
            <p>
              Synthetic recipes only. The assistant asks about missing units and yields before showing a priced draft.
            </p>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: () => (
              <div style={{ margin: '8px 0 8px auto', maxWidth: 560, background: '#f0f0f0', padding: '8px 12px' }}>
                <MessagePrimitive.Content />
              </div>
            ),
            AssistantMessage: () => (
              <div style={{ margin: '8px auto 8px 0', width: '100%', minWidth: 0 }}>
                <MessagePrimitive.Parts />
                <MessagePrimitive.Error><p role="alert">Reply unavailable. Check the server connection or start a new recipe thread.</p></MessagePrimitive.Error>
              </div>
            ),
          }}
        />
      </ThreadPrimitive.Viewport>
      <div style={{ borderTop: '1px solid #ddd', padding: '12px 16px' }}>
        <ComposerPrimitive.Root style={{ display: 'flex', gap: 8 }}>
          <ComposerPrimitive.Input
            placeholder="e.g. Synthetic bistro stew, 4 servings…"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc' }}
          />
          <ComposerPrimitive.Send style={{ padding: '8px 16px' }}>Send</ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}
