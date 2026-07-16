// stiftung-web/lib/calc/solidaritaet.ts
export interface BedarfsEintrag {
  slug: string;
  bedarf: number;
}

export function bedarfProKind(e: { aktuellesKapital: number; zielKapital: number; kinderAnzahl: number }): number {
  if (e.kinderAnzahl <= 0) return 0;
  const luecke = (e.zielKapital - e.aktuellesKapital) / e.kinderAnzahl;
  return Math.max(0, luecke);
}

// Cent-genaue Floor-Verteilung: nie negative Anteile, Summe == Pool.
// Nicht-finite oder negative Bedarfe zählen als 0; die Rundungsdifferenz
// geht an den letzten Eintrag mit Bedarf > 0 (nie an bedarfslose).
export function verteilePool(pool: number, eintraege: BedarfsEintrag[]): { slug: string; anteil: number }[] {
  const bedarfe = eintraege.map((e) => (Number.isFinite(e.bedarf) && e.bedarf > 0 ? e.bedarf : 0));
  const gesamtBedarf = bedarfe.reduce((sum, b) => sum + b, 0);
  if (pool <= 0 || gesamtBedarf <= 0) {
    return eintraege.map((e) => ({ slug: e.slug, anteil: 0 }));
  }

  const poolCents = Math.round(pool * 100);
  let lastPositive = -1;
  for (let i = 0; i < bedarfe.length; i++) {
    if (bedarfe[i] > 0) lastPositive = i;
  }

  let restCents = poolCents;
  const anteileCents = bedarfe.map((b, i) => {
    if (i === lastPositive) return 0;
    const cents = Math.floor((poolCents * b) / gesamtBedarf);
    restCents -= cents;
    return cents;
  });
  anteileCents[lastPositive] = restCents;

  return eintraege.map((e, i) => ({ slug: e.slug, anteil: anteileCents[i] / 100 }));
}
