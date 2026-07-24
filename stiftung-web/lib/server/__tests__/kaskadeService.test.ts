import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestTraeger, createTestEinrichtung } from './testDb';
import { fuehreKaskadeAus } from '../kaskadeService';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('fuehreKaskadeAus — goldenes Spec-§9-Beispiel über die echte DB', () => {
  it('persistiert exakt die Endstände der Spec und protokolliert brutto', async () => {
    await seedKontenstand({
      etfMarktwertCent: 41_085n,
      verrechnungskontoCent: 415n,
      soliDepotCent: 30_000n,
      soliVerrechnungskontoCent: 0n,
      managementKontoCent: 100_000n,
      managementCapCent: 120_000n,
    });
    const t = await createTestTraeger();
    const A = await createTestEinrichtung({ slug: 'a', name: 'A', topfCent: 14_000n, kinderAnzahl: 5, traegerId: t.id });
    const B = await createTestEinrichtung({ slug: 'b', name: 'B', topfCent: 15_000n, kinderAnzahl: 4, traegerId: t.id });
    const C = await createTestEinrichtung({ slug: 'c', name: 'C', topfCent: 12_500n, kinderAnzahl: 5, traegerId: t.id });

    const ergebnis = await fuehreKaskadeAus();

    expect(ergebnis.nummer).toBe(1);
    expect(ergebnis.poolwertCent).toBe(41_500);
    expect(ergebnis.direktspenden.map((d) => d.cent)).toEqual([140, 150, 125]);
    expect(ergebnis.abgaben.find((a) => a.slug === 'a')!.cent).toBe(34);
    expect(ergebnis.abgaben.find((a) => a.slug === 'a')!.basisCent).toBe(14_000);
    expect(ergebnis.abgaben.find((a) => a.slug === 'b')!.cent).toBe(150);
    expect(ergebnis.abgaben.find((a) => a.slug === 'b')!.basisCent).toBe(15_000);
    expect(ergebnis.managementBewegungCent).toBe(302);
    // Reihenfolge folgt der Lade-Reihenfolge (orderBy slug asc).
    expect(ergebnis.umverteilung).toEqual([
      { slug: 'a', name: 'A', cent: 129 },
      { slug: 'c', name: 'C', cent: 170 },
    ]);
    expect(ergebnis.endSoliFondsCent).toBe(29_583);
    expect(ergebnis.endManagementKontoCent).toBe(100_302);

    // Renormierte Anteile == End-Töpfe zum Bootstrap-Kurs
    const a = await prisma.einrichtung.findUniqueOrThrow({ where: { id: A.id } });
    expect(a.anteile).toBe(13_955n * ANTEILS_EINHEITEN_PRO_CENT);
    const b = await prisma.einrichtung.findUniqueOrThrow({ where: { id: B.id } });
    expect(b.anteile).toBe(14_700n * ANTEILS_EINHEITEN_PRO_CENT);
    const c = await prisma.einrichtung.findUniqueOrThrow({ where: { id: C.id } });
    expect(c.anteile).toBe(12_545n * ANTEILS_EINHEITEN_PRO_CENT);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(0n);
    expect(k.etfMarktwertCent).toBe(41_200n); // 13.955 + 14.700 + 12.545
    expect(k.soliDepotCent).toBe(29_583n);
    expect(k.soliVerrechnungskontoCent).toBe(0n);
    expect(k.managementKontoCent).toBe(100_302n);

    // Brutto-Journal (Spec §7): Abgabe und Förderung als getrennte Positionen.
    const lauf = await prisma.kaskadenlauf.findFirstOrThrow({ include: { buchungen: true } });
    const typen = lauf.buchungen.map((x) => x.typ);
    expect(typen.filter((x) => x === 'kaskade_direktspende')).toHaveLength(3);
    expect(typen.filter((x) => x === 'kaskade_abgabe')).toHaveLength(2);
    expect(typen.filter((x) => x === 'kaskade_umverteilung')).toHaveLength(2);
    expect(typen).toContain('kaskade_management');
  });

  it('unverifizierte Töpfe: keine Direktspende, Abgabe ja, Umverteilung nein (Spec §3.4)', async () => {
    await seedKontenstand({
      etfMarktwertCent: 100_000n,
      soliDepotCent: 50_000n,
      managementCapCent: 100_000n,
    });
    const tv = await createTestTraeger({ verifiziert: true });
    const tu = await createTestTraeger({ verifiziert: false });
    await createTestEinrichtung({ slug: 'arm', topfCent: 10_000n, kinderAnzahl: 10, traegerId: tv.id });
    await createTestEinrichtung({ slug: 'reich', topfCent: 40_000n, kinderAnzahl: 10, traegerId: tv.id });
    await createTestEinrichtung({ slug: 'u', topfCent: 50_000n, kinderAnzahl: 10, traegerId: tu.id });

    const ergebnis = await fuehreKaskadeAus();
    expect(ergebnis.direktspenden.map((d) => d.slug).sort()).toEqual(['arm', 'reich']);
    expect(ergebnis.abgaben.find((a) => a.slug === 'u')!.cent).toBe(500);
    expect(ergebnis.umverteilung.find((u) => u.slug === 'u')).toBeUndefined();
  });

  it('konsolidiert das Soli-Verrechnungskonto vor dem Lauf und zählt Läufe hoch', async () => {
    await seedKontenstand({
      etfMarktwertCent: 20_000n,
      soliDepotCent: 9_000n,
      soliVerrechnungskontoCent: 1_000n,
    });
    const t = await createTestTraeger();
    await createTestEinrichtung({ slug: 'x', topfCent: 10_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'y', topfCent: 10_000n, kinderAnzahl: 10, traegerId: t.id });

    const erster = await fuehreKaskadeAus();
    expect(erster.soliFondsCent).toBe(10_000); // konsolidiert: 9.000 + 1.000
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliVerrechnungskontoCent).toBe(0n);

    const zweiter = await fuehreKaskadeAus();
    expect(zweiter.nummer).toBe(2);
  });

  it('geschlossene Einrichtungen nehmen nicht teil', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000n, soliDepotCent: 10_000n });
    const t = await createTestTraeger();
    await createTestEinrichtung({ slug: 'offen-1', topfCent: 10_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'offen-2', topfCent: 20_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'zu', topfCent: 0n, kinderAnzahl: 5, traegerId: t.id, geschlossenAm: new Date() });
    const ergebnis = await fuehreKaskadeAus();
    expect(ergebnis.direktspenden.map((d) => d.slug).sort()).toEqual(['offen-1', 'offen-2']);
  });
});
