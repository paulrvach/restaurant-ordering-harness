'use client';

import { useRef, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

export function useCardSubmission<T>(addResult: (result: T) => void, recordedResult: T | undefined) {
  const sent = useRef(false);
  const [submitted, setSubmitted] = useState<T>();
  const [error, setError] = useState('');
  return {
    result: recordedResult ?? submitted,
    error,
    submit(result: T) {
      if (sent.current || recordedResult !== undefined) return;
      sent.current = true;
      try {
        addResult(result);
        setSubmitted(result);
        setError('');
      } catch {
        sent.current = false;
        setError('Could not record the response. Try again.');
      }
    },
  };
}

export function CardNotice({ status, label }: { status: string; label: string }) {
  if (status === 'running') {
    return (
      <div role="status" aria-label={`Preparing ${label}`} className="my-3 space-y-2 rounded-xl border p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <p className="text-sm text-muted-foreground">Preparing {label}...</p>
      </div>
    );
  }
  return <p role="status">The {label} was interrupted. Request a new revision.</p>;
}

export function money(cents: number | null, currency: string | null) {
  return cents === null || currency === null ? 'Blocked' : `${currency} ${(cents / 100).toFixed(2)}`;
}
