'use client';

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import { Check, Copy } from 'lucide-react';

/** Chat thread built from assistant-ui primitives with shadcn styling. */
export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ThreadPrimitive.Empty>
          <div className="max-w-md text-sm">
            <p className="font-medium">Describe a recipe to draft an order.</p>
            <p className="text-muted-foreground">
              Synthetic recipes only. The assistant asks about missing units and yields before showing a priced draft.
            </p>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: () => (
              <div className="ml-auto my-2 w-fit max-w-full rounded-lg bg-muted px-3 py-2 text-sm">
                <MessagePrimitive.Content />
              </div>
            ),
            AssistantMessage: () => (
              <MessagePrimitive.Root className="group my-2 min-w-0">
                <MessagePrimitive.Parts />
                <ActionBarPrimitive.Root
                  hideWhenRunning
                  autohide="never"
                  className="mt-1 flex gap-1"
                >
                  <ActionBarPrimitive.Copy
                    aria-label="Copy message"
                    className="group/copy inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Copy className="size-4 group-data-[copied]/copy:hidden" />
                    <Check className="hidden size-4 group-data-[copied]/copy:block" />
                  </ActionBarPrimitive.Copy>
                </ActionBarPrimitive.Root>
                <MessagePrimitive.Error>
                  <p role="alert" className="text-sm text-destructive">
                    Reply unavailable. Check the server connection or start a new recipe thread.
                  </p>
                </MessagePrimitive.Error>
              </MessagePrimitive.Root>
            ),
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className="border-t p-3">
        <ComposerPrimitive.Root className="flex gap-2">
          <ComposerPrimitive.Input
            placeholder="e.g. Synthetic bistro stew, 4 servings…"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ComposerPrimitive.Send className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50">
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}
