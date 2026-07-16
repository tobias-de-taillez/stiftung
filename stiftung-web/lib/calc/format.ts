export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDuration(years: number): string {
  if (!isFinite(years)) return 'nicht erreichbar';
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  const jahre = y === 1 ? 'Jahr' : 'Jahre';
  const monate = m === 1 ? 'Monat' : 'Monate';
  if (y === 0) return `${m} ${monate}`;
  if (m === 0) return `${y} ${jahre}`;
  return `${y} ${jahre} und ${m} ${monate}`;
}
