// Lese-Schicht der neuen Welt: Topfwerte entstehen beim Lesen aus Anteilen
// (Spec §2). Liefert ausschließlich serialisierte Cent-number-Objekte.
import { prisma } from './prismaClient';
import { anteileGesamt, poolwertCent, soliFondsCentAktuell, type Tx } from './kontenService';
import { topfwertCent } from '@/lib/verrechnung/anteile';
import { divRound } from '@/lib/verrechnung/geld';
import { auszahlungspfad, RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';

const ZUFLUSS_TYPEN = ['spende', 'erstbefuellung', 'kaskade_umverteilung'];
const TICKER_TYPEN = ['spende', 'soli_spende', 'erstbefuellung', 'kaskade_umverteilung', 'direktausschuettung_eingang'];

type EinrichtungMitTraeger = Awaited<ReturnType<typeof ladeOffene>>[number];

async function ladeOffene(tx: Tx) {
  return tx.einrichtung.findMany({
    where: { geschlossenAm: null },
    include: { traeger: true },
    orderBy: { name: 'asc' },
  });
}

function mitTopf(e: EinrichtungMitTraeger, pool: bigint, gesamt: bigint) {
  const topf = topfwertCent(e.anteile, pool, gesamt);
  const rechtsform = (e.traeger?.rechtsform ?? 'unbekannt') as Rechtsform;
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    typ: e.typ,
    ort: e.ort,
    kinderAnzahl: e.kinderAnzahl,
    topfwertCent: topf,
    zielKapitalCent: e.zielKapitalCent,
    foerderungProKindCent: e.kinderAnzahl > 0 ? divRound(topf, BigInt(e.kinderAnzahl)) : 0n,
    verifiziert: e.traeger?.verifiziert ?? false,
    auszahlungspfad: auszahlungspfad({ rechtsform, gemeinnuetzig: e.traeger?.gemeinnuetzig ?? false }),
    rechtsformLabel: RECHTSFORM_LABELS[rechtsform],
    traegerName: e.traeger?.name ?? null,
    traegerId: e.traeger?.id ?? null,
  };
}

export async function listEinrichtungenMitTopf() {
  return prisma.$transaction(async (tx) => {
    const [alle, pool, gesamt] = [await ladeOffene(tx), await poolwertCent(tx), await anteileGesamt(tx)];
    return serialisiere(alle.map((e) => mitTopf(e, pool, gesamt)));
  });
}
export type EinrichtungMitTopf = Awaited<ReturnType<typeof listEinrichtungenMitTopf>>[number];

/**
 * Geschlossene Einrichtungen für die Admin-Ansicht (Design-Spec §7: Liste inkl.
 * geschlossener, markiert). Read-only, ohne Topf-Projektion — die Anteile sind
 * beim Schließen in den Solidaritätsfonds übergegangen, ein Topfwert wäre ~0.
 * geschlossenAm als ISO-Datum (UTC, YYYY-MM-DD) — deterministisch, kein TZ-Drift.
 */
export async function listGeschlosseneEinrichtungen() {
  const zeilen = await prisma.einrichtung.findMany({
    where: { geschlossenAm: { not: null } },
    orderBy: { geschlossenAm: 'desc' },
    select: { id: true, name: true, ort: true, geschlossenAm: true },
  });
  return zeilen.map((e) => ({
    id: e.id,
    name: e.name,
    ort: e.ort,
    geschlossenAm: e.geschlossenAm!.toISOString().slice(0, 10),
  }));
}
export type GeschlosseneEinrichtung = Awaited<ReturnType<typeof listGeschlosseneEinrichtungen>>[number];

export async function einrichtungDetail(slug: string) {
  return prisma.$transaction(async (tx) => {
    const e = await tx.einrichtung.findUnique({ where: { slug }, include: { traeger: true } });
    if (!e || e.geschlossenAm) return null;
    const [pool, gesamt] = [await poolwertCent(tx), await anteileGesamt(tx)];
    const [buchungen, anzahlUnterstuetzungen, offenerAntragCount] = await Promise.all([
      tx.buchung.findMany({
        where: { einrichtungId: e.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id-Tiebreaker wie bisher (ms-Kollisionen)
        take: 10,
      }),
      tx.buchung.count({ where: { einrichtungId: e.id, typ: { in: ZUFLUSS_TYPEN } } }),
      // Legacy-Zeilen ohne Träger (traegerId null) können strukturell keinen
      // Antrag haben — Guard statt Query (Task 8).
      e.traegerId ? tx.verifikationsAntrag.count({ where: { traegerId: e.traegerId, status: 'offen' } }) : 0,
    ]);
    return serialisiere({
      ...mitTopf(e, pool, gesamt),
      anzahlUnterstuetzungen,
      offenerAntrag: offenerAntragCount > 0,
      buchungen: buchungen.map((b) => ({ id: b.id, typ: b.typ, betragCent: b.betragCent, createdAt: b.createdAt })),
    });
  });
}
export type EinrichtungDetail = NonNullable<Awaited<ReturnType<typeof einrichtungDetail>>>;

/**
 * Aggregat-Kennzahlen für Landing + Statistik-Seite (Task 19): ein Read über
 * dieselbe mitTopf()-Projektion wie listEinrichtungenMitTopf(), plus
 * Zufluss-/Ertrags-Kennzahlen. simulierterJahresertragCent ist eine
 * Projektion auf der kanonischen Anlage-Annahme (NET_GROWTH_RATE) — kein
 * Buchungswert, number-Mathe ist hier bewusst erlaubt (siehe CLAUDE.md).
 */
export async function poolStatistik() {
  return prisma.$transaction(async (tx) => {
    const [alle, pool, gesamt, soli] = [
      await ladeOffene(tx),
      await poolwertCent(tx),
      await anteileGesamt(tx),
      await soliFondsCentAktuell(tx),
    ];
    const mit = alle.map((e) => mitTopf(e, pool, gesamt));
    const ranked = [...mit].sort((a, b) => (b.foerderungProKindCent < a.foerderungProKindCent ? -1 : 1));
    const einJahrVorHeute = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const [zufluss, anzahlZuwendungen] = await Promise.all([
      tx.zuwendung.aggregate({ _sum: { betragCent: true }, where: { createdAt: { gte: einJahrVorHeute } } }),
      tx.zuwendung.count(),
    ]);
    return serialisiere({
      anzahlEinrichtungen: alle.length,
      poolwertCent: pool,
      soliFondsCent: soli,
      gesamtZielKapitalCent: alle.reduce((s, e) => s + e.zielKapitalCent, 0n),
      gesamtKinder: alle.reduce((s, e) => s + e.kinderAnzahl, 0),
      zuflussLetztesJahrCent: zufluss._sum.betragCent ?? 0n,
      anzahlZuwendungen,
      // Projektion (kanonische Annahme), kein Buchungswert: number-Mathe erlaubt.
      simulierterJahresertragCent: Math.round(Number(pool) * NET_GROWTH_RATE),
      top5: ranked.slice(0, 5),
      bottom5: ranked.slice(-5).reverse(),
    });
  });
}
export type PoolStatistik = Awaited<ReturnType<typeof poolStatistik>>;

/**
 * Live-Ticker der letzten Buchungen (Task 19, ersetzt letzteSpenden()):
 * gefiltert auf die für Spender:innen sichtbaren Zufluss-Typen. `zeitpunkt`
 * bleibt der Epoch-Millisekunden-Wert für stabile React-Keys (bewährtes
 * Muster aus letzteSpenden()); einrichtungId null (Solidaritätsfonds als
 * Buchungsempfänger) fällt auf den Fonds-Namen zurück.
 */
export async function buchungsTicker(limit = 10) {
  const buchungen = await prisma.buchung.findMany({
    where: { typ: { in: TICKER_TYPEN } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { einrichtung: { select: { name: true } } },
  });
  const jetzt = Date.now();
  return serialisiere(
    buchungen.map((b) => ({
      betragCent: b.betragCent,
      typ: b.typ,
      einrichtungName: b.einrichtung?.name ?? 'Solidaritätsfonds',
      vorMinuten: Math.floor((jetzt - b.createdAt.getTime()) / 60000),
      zeitpunkt: b.createdAt.getTime(), // Epoch-ms als stabiler React-Key (bewährtes Muster)
    }))
  );
}
export type BuchungsTickerEintrag = Awaited<ReturnType<typeof buchungsTicker>>[number];

/**
 * Vollständiges Buchungsjournal für die Admin-Ansicht (alle Typen, nicht nur
 * die Ticker-sichtbaren). Neueste zuerst, id-Tiebreaker gegen ms-Kollisionen.
 */
export async function buchungsJournal(limit = 100) {
  const buchungen = await prisma.buchung.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { einrichtung: { select: { name: true, slug: true } } },
  });
  return serialisiere(
    buchungen.map((b) => ({
      id: b.id,
      typ: b.typ,
      betragCent: b.betragCent,
      einrichtungName: b.einrichtung?.name ?? null,
      einrichtungSlug: b.einrichtung?.slug ?? null,
      createdAt: b.createdAt,
    }))
  );
}
export type JournalEintrag = Awaited<ReturnType<typeof buchungsJournal>>[number];
