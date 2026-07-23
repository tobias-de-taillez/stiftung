// Spendeneingang (Spec §3.1): zwei Merkmale — Empfänger (Einrichtung | Soli)
// und Verwendungsart (A Vermögenszuführung | B Direktausschüttung).
// Dieser Service bucht; die Projektion (6 %-Prognose) lebt in lib/calc/.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, anteileGesamt, poolwertCent, offeneDirektausschuettungenCent, soliFondsCentAktuell, type Tx } from './kontenService';
import { kaufeAnteile, topfwertCent } from '@/lib/verrechnung/anteile';
import { sweepBetrag } from '@/lib/verrechnung/sweep';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { erreichteMeilensteine } from '@/lib/data/levels';
import { erstbefuellungCent } from '@/lib/verrechnung/erstbefuellung';

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

export interface NeueEinrichtungDaten {
  name: string;
  typ: string;
  ort: string;
  kinderAnzahl: number;
}

export interface AnlageErgebnis extends SpendeErgebnis {
  dedup: boolean;
  erstbefuellungCent: number;
  slug: string;
}

function pruefeBetrag(betragCent: bigint): void {
  if (betragCent <= 0n) {
    throw new UngueltigeZuwendungError('Betrag muss größer als 0 sein');
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalisiert(text: string): string {
  return text.trim().toLowerCase();
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

export async function spendeDirekt(
  slug: string,
  betragCent: bigint
): Promise<{ zuwendungId: string; offeneDirektausschuettungenCent: number }> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const einrichtung = await ladeOffeneEinrichtung(tx, slug);
    if (!einrichtung.traeger?.verifiziert) {
      // Spec §3.1: ohne verifizierten Zugang kein Konto, auf das ausgezahlt
      // werden könnte — für unverifizierte gibt es nur Verwendungsart A.
      throw new DirektNichtVerfuegbarError(`Träger von ${slug} ist nicht verifiziert`);
    }
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent + betragCent },
    });
    const zuwendung = await tx.zuwendung.create({
      data: { einrichtungId: einrichtung.id, betragCent, verwendungsart: 'direkt' },
    });
    await buche(tx, { typ: 'direktausschuettung_eingang', betragCent, einrichtungId: einrichtung.id });
    return serialisiere({
      zuwendungId: zuwendung.id,
      offeneDirektausschuettungenCent: await offeneDirektausschuettungenCent(tx),
    });
  });
}

export async function aktuelleWidmung(): Promise<{ version: number; wortlaut: string }> {
  return prisma.$transaction(async (tx) => {
    const w = await ladeAktuelleWidmung(tx);
    return { version: w.version, wortlaut: w.wortlaut };
  });
}

// ponytail: Zielkapital ist Produktebene (nicht Spec) — 2.000 €/Kind als
// Platzhalter, bis das Produkt eine echte Zielgrößen-Logik beschließt.
const ZIEL_CENT_PRO_KIND = 200_000n;

/** Stufe-1-Anzeige (Spec §3.0): live aus dem Soli-Stand, bucht nichts. */
export async function erstbefuellungsZusageCent(spendeCent: bigint): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const soli = await soliFondsCentAktuell(tx);
    return Number(erstbefuellungCent(spendeCent, soli));
  });
}

export async function spendeMitAnlage(
  daten: NeueEinrichtungDaten,
  betragCent: bigint
): Promise<AnlageErgebnis> {
  pruefeBetrag(betragCent);
  if (!daten.name.trim() || !daten.ort.trim() || daten.kinderAnzahl < 1) {
    throw new UngueltigeZuwendungError('Name, Ort und Kinderzahl (>= 1) sind Pflicht');
  }

  // Dedup (Spec §3.0 "Doppelanlage"): Name + Ort, case-insensitiv. SQLite-
  // Prisma kennt kein mode:'insensitive' — bei lokaler Datenmenge ist der
  // JS-Vergleich über alle Zeilen die ehrliche, einfache Lösung. Geschlossene
  // Einrichtungen zählen nicht: ihr Name darf neu besetzt werden (§3.3).
  const alle = await prisma.einrichtung.findMany({
    where: { geschlossenAm: null },
    select: { slug: true, name: true, ort: true },
  });
  const treffer = alle.find(
    (e) => normalisiert(e.name) === normalisiert(daten.name) && normalisiert(e.ort) === normalisiert(daten.ort)
  );
  if (treffer) {
    const ergebnis = await spendeVermoegen(treffer.slug, betragCent);
    return { ...ergebnis, dedup: true, erstbefuellungCent: 0, slug: treffer.slug };
  }

  return prisma.$transaction(async (tx) => {
    const widmung = await ladeAktuelleWidmung(tx);

    // Slug mit Kollisions-Suffix
    const basis = slugify(`${daten.typ}-${daten.name}-${daten.ort}`);
    let slug = basis;
    for (let i = 2; await tx.einrichtung.findUnique({ where: { slug } }); i++) {
      slug = `${basis}-${i}`;
    }

    const traeger = await tx.traeger.create({
      data: { name: `Träger ${daten.name}`, rechtsform: 'unbekannt', gemeinnuetzig: false, verifiziert: false },
    });

    // Erstbefüllung: verbindlich ist der Stand ZUM BUCHUNGSZEITPUNKT (Spec §3.0).
    const soli = await soliFondsCentAktuell(tx);
    const e = erstbefuellungCent(betragCent, soli);

    // Anteilskauf für Spende + Erstbefüllung gemeinsam, zum Poolwert vor Zufluss.
    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const neueAnteile = kaufeAnteile(betragCent + e, pool, gesamt);

    const einrichtung = await tx.einrichtung.create({
      data: {
        slug,
        name: daten.name.trim(),
        typ: daten.typ,
        ort: daten.ort.trim(),
        kinderAnzahl: daten.kinderAnzahl,
        aktuellesKapital: Number(betragCent + e) / 100, // Legacy, fällt in Task 20
        zielKapital: Number(BigInt(daten.kinderAnzahl) * ZIEL_CENT_PRO_KIND) / 100, // Legacy
        anteile: neueAnteile,
        zielKapitalCent: BigInt(daten.kinderAnzahl) * ZIEL_CENT_PRO_KIND,
        traegerId: traeger.id,
      },
    });

    const k = await ensureKontenstand(tx);
    // Soli-Entnahme: zuerst aus dem Soli-Verrechnungskonto, Rest aus dem Depot.
    const ausVK = e < k.soliVerrechnungskontoCent ? e : k.soliVerrechnungskontoCent;
    const ausDepot = e - ausVK;
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        soliVerrechnungskontoCent: k.soliVerrechnungskontoCent - ausVK,
        soliDepotCent: k.soliDepotCent - ausDepot,
        verrechnungskontoCent: k.verrechnungskontoCent + betragCent + e,
      },
    });

    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: einrichtung.id,
        betragCent,
        verwendungsart: 'vermoegen', // Träger unverifiziert → B strukturell ausgeschlossen
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    if (e > 0n) {
      await buche(tx, { typ: 'erstbefuellung', betragCent: e, einrichtungId: einrichtung.id });
    }
    await buche(tx, { typ: 'spende', betragCent, einrichtungId: einrichtung.id });
    await sweepEinrichtungsDepot(tx);

    const topfNachher = topfwertCent(neueAnteile, pool + betragCent + e, gesamt + neueAnteile);
    return serialisiere({
      zuwendungId: zuwendung.id,
      einrichtung: { slug, name: einrichtung.name, topfwertCent: topfNachher, zielKapitalCent: einrichtung.zielKapitalCent },
      topfwertVorherCent: 0n,
      topfwertNachherCent: topfNachher,
      erreichteMeilensteine: erreichteMeilensteine(0, Number(topfNachher), Number(einrichtung.zielKapitalCent)),
      widmung: { version: widmung.version, wortlaut: widmung.wortlaut },
      dedup: false,
      erstbefuellungCent: e,
      slug,
    });
  });
}
