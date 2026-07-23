import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung, pruefeInvarianten } from './testDb';
import { simuliereMarktjahr } from '../marktService';

// DB-Invarianten (P9): kein Konto negativ, Σ Topfwerte == Poolwert.
afterEach(pruefeInvarianten);

beforeEach(resetDb);

describe('simuliereMarktjahr', () => {
  it('hebt beide Depots um 7 % brutto, lässt Cash und Anteile unangetastet', async () => {
    await seedKontenstand({
      etfMarktwertCent: 100_000n,
      verrechnungskontoCent: 1_000n,
      soliDepotCent: 50_000n,
      soliVerrechnungskontoCent: 500n,
    });
    const e = await createTestEinrichtung({ topfCent: 100_000n });
    const anteileVorher = (await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } })).anteile;

    const ergebnis = await simuliereMarktjahr();
    expect(ergebnis.einrichtungsDepotDeltaCent).toBe(7_000);
    expect(ergebnis.soliDepotDeltaCent).toBe(3_500);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(107_000n);
    expect(k.soliDepotCent).toBe(53_500n);
    expect(k.verrechnungskontoCent).toBe(1_000n); // Cash verzinst nicht
    expect(k.soliVerrechnungskontoCent).toBe(500n);

    // Kursbewegung == null Schreibvorgänge auf Töpfen (Spec §2).
    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(nachher.anteile).toBe(anteileVorher);

    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toEqual(['kurs_einrichtungsdepot', 'kurs_soli']);
  });

  it('rundet kaufmännisch (10,01 € × 7 % = 70,07 Cent → 70 Cent)', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_001n });
    const ergebnis = await simuliereMarktjahr();
    expect(ergebnis.einrichtungsDepotDeltaCent).toBe(70);
  });
});
