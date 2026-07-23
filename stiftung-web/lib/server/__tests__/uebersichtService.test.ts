import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung, createTestTraeger, pruefeInvarianten } from './testDb';
import { listEinrichtungenMitTopf, einrichtungDetail, poolStatistik, buchungsTicker } from '../uebersichtService';
import { buche } from '../kontenService';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';

// DB-Invarianten (P9): kein Konto negativ, Σ Topfwerte == Poolwert.
afterEach(pruefeInvarianten);

beforeEach(async () => {
  await resetDb();
});

describe('listEinrichtungenMitTopf', () => {
  it('liefert nur offene Einrichtungen, sortiert nach Namen', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000n });
    await createTestEinrichtung({ name: 'Zebra-Kita', slug: 'zebra', topfCent: 10_000n });
    await createTestEinrichtung({ name: 'Ameisen-Kita', slug: 'ameise', topfCent: 20_000n });
    const geschlossen = await createTestEinrichtung({
      name: 'Geschlossene Kita',
      slug: 'geschlossen',
      topfCent: 0n,
      geschlossenAm: new Date(),
    });

    const liste = await listEinrichtungenMitTopf();
    expect(liste.map((e) => e.slug)).toEqual(['ameise', 'zebra']);
    expect(liste.find((e) => e.slug === geschlossen.slug)).toBeUndefined();
  });

  it('berechnet den Topfwert aus Anteil × Poolwert / Gesamtanteile, nicht aus einer gespeicherten Zahl', async () => {
    await seedKontenstand({ etfMarktwertCent: 40_000n });
    const a = await createTestEinrichtung({ slug: 'a', topfCent: 30_000n });
    await createTestEinrichtung({ slug: 'b', topfCent: 10_000n });

    const vor = await listEinrichtungenMitTopf();
    const topfA = vor.find((e) => e.slug === 'a')!;
    expect(topfA.topfwertCent).toBe(30_000);

    // Kursbewegung: Poolwert wächst um 7 % (Anlage-Prognose), OHNE dass die
    // Anteile-Spalte angefasst wird — der Euro-Wert entsteht beim Lesen.
    const kVorher = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    await prisma.kontenstand.update({
      where: { id: 'main' },
      data: { etfMarktwertCent: (kVorher.etfMarktwertCent * 107n) / 100n },
    });

    const zeileVorher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: a.id } });

    const nach = await listEinrichtungenMitTopf();
    const topfANach = nach.find((e) => e.slug === 'a')!;
    expect(topfANach.topfwertCent).toBe(32_100); // 30_000 * 1,07

    const zeileNachher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: a.id } });
    expect(zeileNachher.anteile).toBe(zeileVorher.anteile); // kein Schreibvorgang auf Anteile
  });

  it('berechnet foerderungProKindCent kaufmännisch gerundet', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    await createTestEinrichtung({ slug: 'a', topfCent: 1_000n, kinderAnzahl: 3 });

    const liste = await listEinrichtungenMitTopf();
    const e = liste.find((x) => x.slug === 'a')!;
    expect(e.foerderungProKindCent).toBe(333); // 1000/3 = 333.33... -> 333
  });

  it('liefert Auszahlungspfad und Rechtsform-Label aus dem Träger', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const traeger = await createTestTraeger({ rechtsform: 'ggmbh', gemeinnuetzig: true, verifiziert: true });
    await createTestEinrichtung({ slug: 'a', topfCent: 1_000n, traegerId: traeger.id });

    const liste = await listEinrichtungenMitTopf();
    const e = liste.find((x) => x.slug === 'a')!;
    expect(e.auszahlungspfad).toBe('mittelweitergabe');
    expect(e.rechtsformLabel).toBe('gGmbH');
    expect(e.verifiziert).toBe(true);
    expect(e.traegerName).toBe(traeger.name);
    expect(e.traegerId).toBe(traeger.id);
  });

  it('markiert nicht-gemeinnützige Träger mit dem Förderguthaben-Pfad', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const traeger = await createTestTraeger({ rechtsform: 'gewerblich', gemeinnuetzig: false, verifiziert: false });
    await createTestEinrichtung({ slug: 'a', topfCent: 1_000n, traegerId: traeger.id });

    const liste = await listEinrichtungenMitTopf();
    const e = liste.find((x) => x.slug === 'a')!;
    expect(e.auszahlungspfad).toBe('foerderguthaben');
    expect(e.verifiziert).toBe(false);
  });
});

describe('einrichtungDetail', () => {
  it('liefert null für einen unbekannten Slug', async () => {
    expect(await einrichtungDetail('nix')).toBeNull();
  });

  it('liefert null für eine geschlossene Einrichtung', async () => {
    const e = await createTestEinrichtung({ slug: 'zu', geschlossenAm: new Date() });
    expect(await einrichtungDetail(e.slug)).toBeNull();
  });

  it('zählt nur Zufluss-Buchungen als Unterstützungen und liefert die letzten 10 Buchungen neueste zuerst', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 1_000n });

    await buche(prisma, { typ: 'spende', betragCent: 100n, einrichtungId: e.id });
    await buche(prisma, { typ: 'erstbefuellung', betragCent: 50n, einrichtungId: e.id });
    await buche(prisma, { typ: 'kaskade_umverteilung', betragCent: 20n, einrichtungId: e.id });
    // Kein Zufluss: zählt nicht mit.
    await buche(prisma, { typ: 'kaskade_abgabe', betragCent: 10n, einrichtungId: e.id });

    const detail = await einrichtungDetail(e.slug);
    expect(detail).not.toBeNull();
    expect(detail!.anzahlUnterstuetzungen).toBe(3);
    expect(detail!.buchungen.length).toBe(4);
    expect(detail!.buchungen[0].typ).toBe('kaskade_abgabe'); // neueste zuerst
  });

  it('begrenzt Buchungen auf die letzten 10', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 1_000n });
    for (let i = 0; i < 15; i++) {
      await buche(prisma, { typ: 'spende', betragCent: BigInt(i + 1), einrichtungId: e.id });
    }
    const detail = await einrichtungDetail(e.slug);
    expect(detail!.buchungen.length).toBe(10);
  });

  it('enthält dieselben Topf-Felder wie listEinrichtungenMitTopf', async () => {
    await seedKontenstand({ etfMarktwertCent: 5_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 5_000n, kinderAnzahl: 5 });
    const detail = await einrichtungDetail(e.slug);
    expect(detail!.topfwertCent).toBe(5_000);
    expect(detail!.foerderungProKindCent).toBe(1_000);
    expect(detail!.slug).toBe('a');
  });
});

describe('poolStatistik', () => {
  it('liefert Poolwert, Soli-Fonds, Anzahl Einrichtungen/Kinder und Gesamtzielkapital', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000n, soliDepotCent: 5_000n });
    await createTestEinrichtung({ slug: 'a', topfCent: 20_000n, kinderAnzahl: 4, zielKapitalCent: 100_000n });
    await createTestEinrichtung({ slug: 'b', topfCent: 10_000n, kinderAnzahl: 6, zielKapitalCent: 50_000n });
    // Geschlossene Einrichtungen zählen nirgends mit.
    await createTestEinrichtung({ slug: 'zu', geschlossenAm: new Date(), kinderAnzahl: 99 });

    const stats = await poolStatistik();
    expect(stats.anzahlEinrichtungen).toBe(2);
    expect(stats.poolwertCent).toBe(30_000);
    expect(stats.soliFondsCent).toBe(5_000);
    expect(stats.gesamtKinder).toBe(10);
    expect(stats.gesamtZielKapitalCent).toBe(150_000);
  });

  it('sortiert top5 absteigend und bottom5 aufsteigend nach Förderung pro Kind', async () => {
    await seedKontenstand({ etfMarktwertCent: 100_000n });
    // Fünf Einrichtungen mit eindeutig unterschiedlicher Förderung/Kind,
    // damit die Sortierung ohne Gleichstand-Mehrdeutigkeit prüfbar ist.
    await createTestEinrichtung({ slug: 'e1', topfCent: 50_000n, kinderAnzahl: 1 }); // 50.000/Kind
    await createTestEinrichtung({ slug: 'e2', topfCent: 20_000n, kinderAnzahl: 1 }); // 20.000/Kind
    await createTestEinrichtung({ slug: 'e3', topfCent: 15_000n, kinderAnzahl: 1 }); // 15.000/Kind
    await createTestEinrichtung({ slug: 'e4', topfCent: 10_000n, kinderAnzahl: 1 }); // 10.000/Kind
    await createTestEinrichtung({ slug: 'e5', topfCent: 5_000n, kinderAnzahl: 1 });  // 5.000/Kind

    const stats = await poolStatistik();
    expect(stats.top5.map((e) => e.slug)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(stats.bottom5.map((e) => e.slug)).toEqual(['e5', 'e4', 'e3', 'e2', 'e1']);
  });

  it('zählt Zuflüsse nur innerhalb der letzten 365 Tage, anzahlZuwendungen zählt alle', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 1_000n });
    const jetzt = new Date();
    const vorZweiJahren = new Date(jetzt.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 10_000n, verwendungsart: 'vermoegen', createdAt: jetzt },
    });
    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 99_999n, verwendungsart: 'vermoegen', createdAt: vorZweiJahren },
    });

    const stats = await poolStatistik();
    expect(stats.zuflussLetztesJahrCent).toBe(10_000);
    expect(stats.anzahlZuwendungen).toBe(2);
  });

  it('berechnet simulierterJahresertragCent als gerundete Projektion auf dem Poolwert', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000_000n });
    const stats = await poolStatistik();
    expect(stats.simulierterJahresertragCent).toBe(Math.round(1_000_000 * NET_GROWTH_RATE));
  });
});

describe('buchungsTicker', () => {
  it('liefert ein leeres Array ohne Buchungen', async () => {
    expect(await buchungsTicker()).toEqual([]);
  });

  it('filtert auf die Ticker-Typen und lässt interne Buchungstypen weg', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 1_000n });
    await buche(prisma, { typ: 'spende', betragCent: 100n, einrichtungId: e.id });
    await buche(prisma, { typ: 'soli_spende', betragCent: 50n });
    await buche(prisma, { typ: 'erstbefuellung', betragCent: 20n, einrichtungId: e.id });
    await buche(prisma, { typ: 'kaskade_umverteilung', betragCent: 10n, einrichtungId: e.id });
    await buche(prisma, { typ: 'direktausschuettung_eingang', betragCent: 5n, einrichtungId: e.id });
    // Interne Buchungstypen — dürfen NICHT im Ticker auftauchen.
    await buche(prisma, { typ: 'kaskade_abgabe', betragCent: 1n, einrichtungId: e.id });
    await buche(prisma, { typ: 'sweep', betragCent: 1n });

    const ticker = await buchungsTicker();
    expect(ticker).toHaveLength(5);
    expect(ticker.map((t) => t.typ).sort()).toEqual(
      ['direktausschuettung_eingang', 'erstbefuellung', 'kaskade_umverteilung', 'soli_spende', 'spende'].sort()
    );
  });

  it('fällt für Buchungen ohne Einrichtung (Soli-Fonds) auf einen festen Namen zurück', async () => {
    await buche(prisma, { typ: 'soli_spende', betragCent: 500n });

    const ticker = await buchungsTicker();
    expect(ticker).toHaveLength(1);
    expect(ticker[0]).toMatchObject({ betragCent: 500, typ: 'soli_spende', einrichtungName: 'Solidaritätsfonds' });
    expect(typeof ticker[0].vorMinuten).toBe('number');
    expect(typeof ticker[0].zeitpunkt).toBe('number');
  });

  it('begrenzt auf `limit` und sortiert neueste zuerst', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'a', topfCent: 1_000n });
    for (let i = 0; i < 3; i++) {
      await buche(prisma, { typ: 'spende', betragCent: BigInt(i + 1), einrichtungId: e.id });
    }
    const ticker = await buchungsTicker(2);
    expect(ticker).toHaveLength(2);
    // orderBy id desc als Tiebreaker bei gleichem createdAt (ms-Kollisionen) —
    // die zuletzt erzeugte Buchung (höchster betragCent) kommt zuerst.
    expect(ticker[0].betragCent).toBe(3);
  });
});
