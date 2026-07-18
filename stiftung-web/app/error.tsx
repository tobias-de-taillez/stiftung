'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} label="Startseite konnte nicht geladen werden." />;
}
