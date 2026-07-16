'use client';

export function ErrorState({
  error,
  reset,
  label = 'Etwas ist beim Laden schiefgelaufen.',
}: {
  error: Error;
  reset: () => void;
  label?: string;
}) {
  return (
    <div style={{ padding: '2rem 0' }} role="alert">
      <p className="negative">{label}</p>
      <p className="muted" style={{ fontSize: '0.8rem' }}>{error.message}</p>
      <button type="button" className="pill pill-secondary" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
