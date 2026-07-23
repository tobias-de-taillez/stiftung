// Spendeneingang (Spec §3.1): zwei Merkmale — Empfänger (Einrichtung | Soli)
// und Verwendungsart (A Vermögenszuführung | B Direktausschüttung).
// Dieser Service bucht; die Projektion (6 %-Prognose) lebt in lib/calc/.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, anteileGesamt, poolwertCent, offeneDirektausschuettungenCent, soliFondsCentAktuell, type Tx } from './kontenService';
import { kaufeAnteile, topfwertCent } from '@/lib/verrechnung/anteile';
import { sweepBetrag } from '@/lib/verrechnung/sweep';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { erreichteMeilensteine } from '@/lib/data/levels';

export class UngueltigeZuwendungError extends Error {}
export class EinrichtungGeschlossenError extends Error {}
export class DirektNichtVerfuegbarError extends Error {}
export class EinrichtungNichtGefundenError extends Error {}

export interface SpendeErgebnis {
  zuwendungId: string;
  einrichtung: { slug: string; name: string; topfwertCent: number; zielKapitalCent: number };
  topfwertVorherCent: number;
  topfwertNachherCent: number;
  erreichteMeilensteine: string[];
  widmung: { version: number; wortlaut: string } | null;
}

function pruefeBetrag(betragCent: bigint): void {
  if (betragCent <= 0n) {
    throw new UngueltigeZuwendungError('Betrag muss größer als 0 sein');
  }
}

async function ladeOffeneEinrichtung(tx: Tx, slug: string) {
  const einrichtung = await tx.einrichtung.findUnique({ where: { slug }, include: { traeger: true } });
  if (!einrichtung) throw new EinrichtungNichtGefundenError(`Keine Einrichtung mit slug ${slug}`);
  if (einrichtung.geschlossenAm) throw new EinrichtungGeschlossenError(`${slug} ist geschlossen`);
  return einrichtung;
}

async function ladeAktuelleWidmung(tx: Tx) {
  const widmung = await tx.widmungsText.findFirst({ orderBy: { version: 'desc' } });
  if (!widmung) {
    // Doku-Pflicht (Spec §3.1): ohne nachweisbaren Wortlaut keine Vermögenszuführung.
    throw new UngueltigeZuwendungError('Kein Widmungstext hinterlegt — Verwendungsart A nicht buchbar');
  }
  return widmung;
}

/** Sweep-Check fürs Einrichtungs-Depot; bucht bei Bedarf (Spec §3.2). */
async function sweepEinrichtungsDepot(tx: Tx): Promise<void> {
  const k = await ensureKontenstand(tx);
  const betrag = sweepBetrag({
    verrechnungskontoCent: k.verrechnungskontoCent,
    offeneDirektausschuettungenCent: await offeneDirektausschuettungenCent(tx),
    etfMarktwertCent: k.etfMarktwertCent,
  });
  if (betrag > 0n) {
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        verrechnungskontoCent: k.verrechnungskontoCent - betrag,
        etfMarktwertCent: k.etfMarktwertCent + betrag,
      },
    });
    await buche(tx, { typ: 'sweep', betragCent: betrag });
  }
}

/** Analoger Sweep fürs Soli-Depot (Spec §3.2 letzter Satz). */
async function sweepSoliDepot(tx: Tx): Promise<void> {
  const k = await ensureKontenstand(tx);
  const betrag = sweepBetrag({
    verrechnungskontoCent: k.soliVerrechnungskontoCent,
    offeneDirektausschuettungenCent: 0n, // durchlaufende Posten gibt es nur im Einrichtungs-Pool
    etfMarktwertCent: k.soliDepotCent,
  });
  if (betrag > 0n) {
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        soliVerrechnungskontoCent: k.soliVerrechnungskontoCent - betrag,
        soliDepotCent: k.soliDepotCent + betrag,
      },
    });
    await buche(tx, { typ: 'soli_sweep', betragCent: betrag });
  }
}

export async function spendeVermoegen(slug: string, betragCent: bigint): Promise<SpendeErgebnis> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const einrichtung = await ladeOffeneEinrichtung(tx, slug);
    const widmung = await ladeAktuelleWidmung(tx);

    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const topfVorher = topfwertCent(einrichtung.anteile, pool, gesamt);

    const neueAnteile = kaufeAnteile(betragCent, pool, gesamt);
    await tx.einrichtung.update({
      where: { id: einrichtung.id },
      data: { anteile: einrichtung.anteile + neueAnteile },
    });
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent + betragCent },
    });

    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: einrichtung.id,
        betragCent,
        verwendungsart: 'vermoegen',
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    await buche(tx, { typ: 'spende', betragCent, einrichtungId: einrichtung.id });
    await sweepEinrichtungsDepot(tx);

    const topfNachher = topfwertCent(
      einrichtung.anteile + neueAnteile,
      pool + betragCent,
      gesamt + neueAnteile
    );

    return serialisiere({
      zuwendungId: zuwendung.id,
      einrichtung: {
        slug: einrichtung.slug,
        name: einrichtung.name,
        topfwertCent: topfNachher,
        zielKapitalCent: einrichtung.zielKapitalCent,
      },
      topfwertVorherCent: topfVorher,
      topfwertNachherCent: topfNachher,
      erreichteMeilensteine: erreichteMeilensteine(
        Number(topfVorher),
        Number(topfNachher),
        Number(einrichtung.zielKapitalCent)
      ),
      widmung: { version: widmung.version, wortlaut: widmung.wortlaut },
    });
  });
}

export async function spendeAnSoli(betragCent: bigint): Promise<{ zuwendungId: string; soliFondsCent: number }> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const widmung = await ladeAktuelleWidmung(tx);
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { soliVerrechnungskontoCent: k.soliVerrechnungskontoCent + betragCent },
    });
    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: null,
        betragCent,
        verwendungsart: 'vermoegen', // Soli-Spenden sind immer Verwendungsart A (Spec §3.1)
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    await buche(tx, { typ: 'soli_spende', betragCent });
    await sweepSoliDepot(tx);
    return serialisiere({
      zuwendungId: zuwendung.id,
      soliFondsCent: await soliFondsCentAktuell(tx),
    });
  });
}

export async function aktuelleWidmung(): Promise<{ version: number; wortlaut: string }> {
  return prisma.$transaction(async (tx) => {
    const w = await ladeAktuelleWidmung(tx);
    return { version: w.version, wortlaut: w.wortlaut };
  });
}
