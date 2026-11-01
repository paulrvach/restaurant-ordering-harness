'use client';

import { ThreadListPrimitive, ThreadListItemPrimitive } from '@assistant-ui/react';

function ThreadItem() {
  return <ThreadListItemPrimitive.Root style={{ marginTop: 12 }}>
    <ThreadListItemPrimitive.Trigger style={{ width: '100%', textAlign: 'left', padding: 8 }}>
      <ThreadListItemPrimitive.Title fallback="Recipe draft" />
    </ThreadListItemPrimitive.Trigger>
  </ThreadListItemPrimitive.Root>;
}

export function ThreadList() {
  return <ThreadListPrimitive.Root>
    <ThreadListPrimitive.New style={{ width: '100%', padding: 8 }}>New recipe thread</ThreadListPrimitive.New>
    <ThreadListPrimitive.Items components={{ ThreadListItem: ThreadItem }} />
  </ThreadListPrimitive.Root>;
}
