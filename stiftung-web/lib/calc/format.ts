export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDuration(years: number): string {
  if (!isFinite(years)) return 'nicht erreichbar';
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} Monate`;
  if (m === 0) return `${y} Jahre`;
  return `${y} Jahre und ${m} Monate`;
}
