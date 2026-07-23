// Lese-Schicht der neuen Welt: Topfwerte entstehen beim Lesen aus Anteilen
// (Spec §2). Liefert ausschließlich serialisierte Cent-number-Objekte.
import { prisma } from './prismaClient';
import { anteileGesamt, poolwertCent, type Tx } from './kontenService';
import { topfwertCent } from '@/lib/verrechnung/anteile';
import { divRound } from '@/lib/verrechnung/geld';
import { auszahlungspfad, RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

const ZUFLUSS_TYPEN = ['spende', 'erstbefuellung', 'kaskade_umverteilung'];

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

export async function einrichtungDetail(slug: string) {
  return prisma.$transaction(async (tx) => {
    const e = await tx.einrichtung.findUnique({ where: { slug }, include: { traeger: true } });
    if (!e || e.geschlossenAm) return null;
    const [pool, gesamt] = [await poolwertCent(tx), await anteileGesamt(tx)];
    const [buchungen, anzahlUnterstuetzungen] = await Promise.all([
      tx.buchung.findMany({
        where: { einrichtungId: e.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id-Tiebreaker wie bisher (ms-Kollisionen)
        take: 10,
      }),
      tx.buchung.count({ where: { einrichtungId: e.id, typ: { in: ZUFLUSS_TYPEN } } }),
    ]);
    return serialisiere({
      ...mitTopf(e, pool, gesamt),
      anzahlUnterstuetzungen,
      buchungen: buchungen.map((b) => ({ id: b.id, typ: b.typ, betragCent: b.betragCent, createdAt: b.createdAt })),
    });
  });
}
export type EinrichtungDetail = NonNullable<Awaited<ReturnType<typeof einrichtungDetail>>>;
