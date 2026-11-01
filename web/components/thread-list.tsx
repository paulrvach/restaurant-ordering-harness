'use client';

import { ThreadListPrimitive, ThreadListItemPrimitive } from '@assistant-ui/react';

function ThreadItem() {
  return (
    <ThreadListItemPrimitive.Root className="mt-1">
      <ThreadListItemPrimitive.Trigger className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted data-[active]:bg-muted">
        <ThreadListItemPrimitive.Title fallback="Recipe draft" />
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}

export function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadListPrimitive.New className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
        New recipe thread
      </ThreadListPrimitive.New>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ThreadListPrimitive.Items components={{ ThreadListItem: ThreadItem }} />
      </div>
    </ThreadListPrimitive.Root>
  );
}
