export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const isComplete = pct >= 100;
  const percentText = `${Math.round(pct)} %`;

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(Math.min(max, Math.max(0, value)))}
        style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '14px', overflow: 'hidden' }}
      >
        <div
          className={`progress-bar-fill${isComplete ? ' is-complete' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.4rem' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{label}</p>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {percentText}
          {isComplete ? ' · Ziel erreicht' : ''}
        </p>
      </div>
    </div>
  );
}
