import { prisma } from './prismaClient';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';
import { erreichteMeilensteine } from '@/lib/data/levels';

export type Frequenz = 'einmalig' | 'jaehrlich';

export class EinrichtungNotFoundError extends Error {}
export class UngueltigerBetragError extends Error {}

export async function listEinrichtungen() {
  return prisma.einrichtung.findMany({ orderBy: { name: 'asc' } });
}

export async function getEinrichtungBySlug(slug: string) {
  return prisma.einrichtung.findUnique({ where: { slug } });
}

export async function spenden(slug: string, betrag: number, frequenz: Frequenz) {
  if (!Number.isFinite(betrag) || betrag <= 0) {
    throw new UngueltigerBetragError('Betrag muss größer als 0 sein');
  }
  const einrichtung = await getEinrichtungBySlug(slug);
  if (!einrichtung) {
    throw new EinrichtungNotFoundError(`Keine Einrichtung mit slug ${slug}`);
  }
  const [aktualisiert, spende] = await prisma.$transaction([
    prisma.einrichtung.update({
      where: { slug },
      data: { aktuellesKapital: einrichtung.aktuellesKapital + betrag },
    }),
    prisma.spende.create({
      data: { einrichtungId: einrichtung.id, betrag, frequenz, quelle: 'direkt' },
    }),
  ]);
  // Meilenstein-Erkennung (Task 31): welche Einrichtungs-Level/Prozent-Marken
  // hat diese eine Spende übersprungen? Derselbe Helper wie in
  // simulationService.ts (kein Duplikat der Schwellenlogik).
  const erreichteMeilensteineFuerSpende = erreichteMeilensteine(
    einrichtung.aktuellesKapital,
    aktualisiert.aktuellesKapital,
    einrichtung.zielKapital
  );
  return { einrichtung: aktualisiert, spende, erreichteMeilensteine: erreichteMeilensteineFuerSpende };
}

export function foerderungProKind(e: { aktuellesKapital: number; kinderAnzahl: number }): number {
  if (e.kinderAnzahl <= 0) return 0;
  return e.aktuellesKapital / e.kinderAnzahl;
}

export async function statistik() {
  const alle = await listEinrichtungen();
  const mitFoerderung = alle.map((e) => ({ ...e, foerderungProKind: foerderungProKind(e) }));
  const ranked = [...mitFoerderung].sort((a, b) => b.foerderungProKind - a.foerderungProKind);

  const gesamtKapital = alle.reduce((sum, e) => sum + e.aktuellesKapital, 0);
  const anzahlEinrichtungen = alle.length;

  const einJahrVorHeute = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const [direktSumme, fondsSumme] = await Promise.all([
    prisma.spende.aggregate({ _sum: { betrag: true }, where: { createdAt: { gte: einJahrVorHeute }, quelle: { not: 'solidaritaet' } } }),
    prisma.fondsSpende.aggregate({ _sum: { betrag: true }, where: { createdAt: { gte: einJahrVorHeute } } }),
  ]);
  const zuflussLetztesJahr = (direktSumme._sum.betrag ?? 0) + (fondsSumme._sum.betrag ?? 0);

  // Spenderzähler (Task 33): "echte Spender-Akte" — direkte Spenden
  // (quelle != 'solidaritaet') plus Fonds-Einzahlungen (FondsSpende).
  // Solidaritätsfonds-Verteilungen sind interne Umbuchungen, keine neue
  // Spende, und zählen daher nicht mit.
  const [anzahlDirekteSpenden, anzahlFondsSpenden] = await Promise.all([
    prisma.spende.count({ where: { quelle: { not: 'solidaritaet' } } }),
    prisma.fondsSpende.count(),
  ]);
  const anzahlSpenden = anzahlDirekteSpenden + anzahlFondsSpenden;

  return {
    anzahlEinrichtungen,
    gesamtKapital,
    gesamtKinder: alle.reduce((sum, e) => sum + e.kinderAnzahl, 0),
    durchschnittlichesVolumen: anzahlEinrichtungen > 0 ? gesamtKapital / anzahlEinrichtungen : 0,
    zuflussLetztesJahr,
    simulierterJahresertrag: gesamtKapital * NET_GROWTH_RATE,
    anzahlSpenden,
    top5: ranked.slice(0, 5),
    bottom5: ranked.slice(-5).reverse(),
  };
}

/**
 * Letzte Spenden für den Live-Ticker (Task 33): anonymisiert (keine
 * personenbezogenen Daten — existieren im Modell ohnehin nicht), `quelle`
 * wird unverändert durchgereicht (Labeling von 'solidaritaet' als
 * "Solidaritätsfonds-Verteilung" ist Sache der UI-Komponente).
 */
export async function letzteSpenden(limit = 10) {
  const spenden = await prisma.spende.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { einrichtung: true },
  });
  const jetzt = Date.now();
  return spenden.map((s) => ({
    betrag: s.betrag,
    einrichtungName: s.einrichtung.name,
    quelle: s.quelle,
    vorMinuten: Math.floor((jetzt - s.createdAt.getTime()) / 60000),
  }));
}
