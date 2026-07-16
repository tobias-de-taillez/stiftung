export function LoadingState({ label = 'Lädt …' }: { label?: string }) {
  return (
    <p role="status" className="muted" style={{ padding: '2rem 0' }}>
      {label}
    </p>
  );
}
