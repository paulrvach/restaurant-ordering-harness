'use client';

import { useState } from 'react';
import { makeAssistantToolUI } from '@assistant-ui/react';
import type {
  RequestMissingFactInput,
  RequestMissingFactOutput,
} from 'restaurant-ordering-harness/src/worksheet-tools.js';

/** One focused review question per call. Unknown units never resolve silently. */
export const RequestMissingFactUI = makeAssistantToolUI<RequestMissingFactInput, RequestMissingFactOutput>({
  toolName: 'requestMissingFact',
  render: ({ args, addResult }) => {
    const [value, setValue] = useState('');
    return (
      <div style={{ border: '1px solid #999', padding: 12, margin: '8px 0', maxWidth: 640 }}>
        <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{args.label}</p>
        <p style={{ fontSize: 13, margin: '0 0 8px', color: '#444' }}>
          {args.ingredient} · {args.sku} · {args.topic} — {args.reason}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={value}
            placeholder={args.placeholder}
            onChange={(event) => setValue(event.target.value)}
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc' }}
          />
          <button
            type="button"
            disabled={value.trim().length === 0}
            onClick={() => addResult({ ingredient: args.ingredient, sku: args.sku, topic: args.topic, value: value.trim() })}
          >
            Answer
          </button>
        </div>
      </div>
    );
  },
});
