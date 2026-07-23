import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung, createTestTraeger } from './testDb';
import { listEinrichtungenMitTopf, einrichtungDetail } from '../uebersichtService';
import { buche } from '../kontenService';

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
