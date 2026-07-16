export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(Math.min(max, Math.max(0, value)))}
        style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '14px', overflow: 'hidden' }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sun)', borderRadius: '999px' }} />
      </div>
      <p className="muted" style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>{label}</p>
    </div>
  );
}
