export function BarChart({
  data,
  xAxisLabel,
  yAxisLabel,
}: {
  data: { label: string; value: number }[];
  xAxisLabel: string;
  yAxisLabel: string;
}) {
  const width = 640;
  const height = 320;
  const padding = { top: 16, right: 16, bottom: 56, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 8;
  const barWidth = data.length > 0 ? Math.max(4, plotWidth / data.length - barGap) : plotWidth;

  return (
    <div>
      <svg role="img" aria-label={`${yAxisLabel} nach ${xAxisLabel}`} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * plotHeight;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + (plotHeight - barHeight);
          return (
            <g key={d.label}>
              <rect className="bar" x={x} y={y} width={barWidth} height={barHeight} fill="var(--sun)" rx={4} />
              <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }} className="muted">
        <span>{yAxisLabel}</span>
        <span>{xAxisLabel}</span>
      </div>
    </div>
  );
}
