'use client';

import { useRef, useState } from 'react';

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
  return <p role="status">{status === 'incomplete' ? `The ${label} was interrupted. Request a new revision.` : `Preparing ${label}...`}</p>;
}

export function money(cents: number | null, currency: string | null) {
  return cents === null || currency === null ? 'Blocked' : `${currency} ${(cents / 100).toFixed(2)}`;
}
