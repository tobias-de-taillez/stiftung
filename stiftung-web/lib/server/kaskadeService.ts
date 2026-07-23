// Jahres-Kaskade: laden → berechneKaskade (pure) → persistieren.
// Die Kaskade rechnet in Cent auf dem Snapshot; persistiert wird über
// Anteils-Renormierung (siehe renormAnteile) — die Invariante
// Σ Topf == Poolwert gilt danach exakt auf den Cent.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, offeneDirektausschuettungenCent } from './kontenService';
import { berechneKaskade } from '@/lib/verrechnung/kaskade';
import { renormAnteile } from '@/lib/verrechnung/anteile';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { erreichteMeilensteine } from '@/lib/data/levels';

export async function fuehreKaskadeAus() {
  return prisma.$transaction(async (tx) => {
    const einrichtungen = await tx.einrichtung.findMany({
      where: { geschlossenAm: null },
      include: { traeger: true },
      // Deterministische Reihenfolge für Protokoll und Tests; cuid-Sortierung
      // wäre insertion-abhängig.
      orderBy: { slug: 'asc' },
    });
    const k = await ensureKontenstand(tx);
    const offene = await offeneDirektausschuettungenCent(tx);

    // Soli-Kassenlage konsolidieren: am Stichtag wird ohnehin gehandelt.
    if (k.soliVerrechnungskontoCent !== 0n) {
      await buche(tx, { typ: 'soli_konsolidierung', betragCent: k.soliVerrechnungskontoCent });
    }
    const soliKonsolidiert = k.soliDepotCent + k.soliVerrechnungskontoCent;

    const ergebnis = berechneKaskade({
      einrichtungen: einrichtungen.map((e) => ({
        id: e.id,
        anteile: e.anteile,
        kinder: e.kinderAnzahl,
        verifiziert: e.traeger?.verifiziert ?? false,
      })),
      etfMarktwertCent: k.etfMarktwertCent,
      verrechnungskontoCent: k.verrechnungskontoCent,
      offeneDirektausschuettungenCent: offene,
      soliFondsCent: soliKonsolidiert,
      managementKontoCent: k.managementKontoCent,
      managementCapCent: k.managementCapCent,
    });

    // Persistieren: Anteile renormieren, Konten setzen.
    for (const e of einrichtungen) {
      await tx.einrichtung.update({
        where: { id: e.id },
        data: { anteile: renormAnteile(ergebnis.endTopfCent.get(e.id)!) },
      });
    }
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: ergebnis.endEtfMarktwertCent,
        verrechnungskontoCent: ergebnis.endVerrechnungskontoCent,
        soliDepotCent: ergebnis.endSoliFondsCent,
        soliVerrechnungskontoCent: 0n,
        managementKontoCent: ergebnis.endManagementKontoCent,
      },
    });

    // Protokoll: Kaskadenlauf + Brutto-Buchungen (Spec §7).
    const nummer = (await tx.kaskadenlauf.count()) + 1;
    const summe = (liste: { cent: bigint }[]) => liste.reduce((s, x) => s + x.cent, 0n);
    const lauf = await tx.kaskadenlauf.create({
      data: {
        nummer,
        poolwertCent: ergebnis.snapshot.poolwertCent,
        soliFondsCent: ergebnis.snapshot.soliFondsCent,
        direktspendenCent: summe(ergebnis.direktspenden),
        abgabenCent: summe(ergebnis.abgaben),
        managementBewegungCent: ergebnis.managementBewegungCent,
        umverteilungCent: summe(ergebnis.umverteilung),
        keineVerteilungGrund: ergebnis.keineVerteilungGrund,
      },
    });
    const abs = (x: bigint) => (x < 0n ? -x : x);
    if (ergebnis.auffuellenCent !== 0n) {
      await buche(tx, { typ: 'kaskade_auffuellen', betragCent: abs(ergebnis.auffuellenCent), kaskadenlaufId: lauf.id });
    }
    for (const d of ergebnis.direktspenden) {
      await buche(tx, { typ: 'kaskade_direktspende', betragCent: d.cent, einrichtungId: d.id, kaskadenlaufId: lauf.id });
    }
    for (const a of ergebnis.abgaben) {
      await buche(tx, { typ: 'kaskade_abgabe', betragCent: a.cent, einrichtungId: a.id, kaskadenlaufId: lauf.id });
    }
    if (ergebnis.managementBewegungCent !== 0n) {
      await buche(tx, { typ: 'kaskade_management', betragCent: abs(ergebnis.managementBewegungCent), kaskadenlaufId: lauf.id });
    }
    for (const u of ergebnis.umverteilung) {
      await buche(tx, { typ: 'kaskade_umverteilung', betragCent: u.cent, einrichtungId: u.id, kaskadenlaufId: lauf.id });
    }

    // Anzeige-Daten: Namen + Meilensteine über die Jahresspanne.
    const nameVon = new Map(einrichtungen.map((e) => [e.id, { slug: e.slug, name: e.name }]));
    const meilensteine = einrichtungen
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        labels: erreichteMeilensteine(
          Number(ergebnis.snapshot.topfCent.get(e.id)!),
          Number(ergebnis.endTopfCent.get(e.id)!),
          Number(e.zielKapitalCent)
        ),
      }))
      .filter((m) => m.labels.length > 0);

    const mitName = <T extends { id: string; cent: bigint }>(liste: T[]) =>
      liste.map(({ id, ...rest }) => ({ ...nameVon.get(id)!, ...rest }));

    return serialisiere({
      nummer,
      poolwertCent: ergebnis.snapshot.poolwertCent,
      soliFondsCent: ergebnis.snapshot.soliFondsCent,
      direktspenden: mitName(ergebnis.direktspenden),
      abgaben: mitName(ergebnis.abgaben),
      managementBewegungCent: ergebnis.managementBewegungCent,
      umverteilung: mitName(ergebnis.umverteilung),
      keineVerteilungGrund: ergebnis.keineVerteilungGrund,
      endSoliFondsCent: ergebnis.endSoliFondsCent,
      endManagementKontoCent: ergebnis.endManagementKontoCent,
      meilensteine,
    });
  });
}

export type KaskadenlaufErgebnis = Awaited<ReturnType<typeof fuehreKaskadeAus>>;

/** Historie für die Statistik-Seite: neueste zuerst, reine Leseliste. */
export async function kaskadenlaeufe() {
  const laeufe = await prisma.kaskadenlauf.findMany({ orderBy: { nummer: 'desc' } });
  return serialisiere(laeufe);
}
