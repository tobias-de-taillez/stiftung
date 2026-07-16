export interface BedarfsEintrag {
  slug: string;
  bedarf: number;
}

export function bedarfProKind(e: { aktuellesKapital: number; zielKapital: number; kinderAnzahl: number }): number {
  const luecke = e.zielKapital / e.kinderAnzahl - e.aktuellesKapital / e.kinderAnzahl;
  return Math.max(0, luecke);
}

export function verteilePool(pool: number, eintraege: BedarfsEintrag[]): { slug: string; anteil: number }[] {
  const gesamtBedarf = eintraege.reduce((sum, e) => sum + e.bedarf, 0);
  if (pool <= 0 || gesamtBedarf <= 0) {
    return eintraege.map((e) => ({ slug: e.slug, anteil: 0 }));
  }
  let rest = Math.round(pool * 100) / 100;
  return eintraege.map((e, i) => {
    const isLast = i === eintraege.length - 1;
    const rohAnteil = (pool * e.bedarf) / gesamtBedarf;
    const anteil = isLast ? rest : Math.round(rohAnteil * 100) / 100;
    rest = Math.round((rest - anteil) * 100) / 100;
    return { slug: e.slug, anteil };
  });
}
