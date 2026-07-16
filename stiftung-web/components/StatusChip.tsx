export function StatusChip({ tone, children }: { tone: 'positive' | 'negative' | 'forecast' | 'muted'; children: React.ReactNode }) {
  return <span className={`status ${tone}`}>{children}</span>;
}
