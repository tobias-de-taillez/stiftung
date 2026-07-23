import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, createTestEinrichtung, seedKontenstand } from './testDb';

beforeEach(resetDb);

describe('Schema v2', () => {
  it('legt Träger ─ Einrichtung ─ Anteile an und liest bigint zurück', async () => {
    const e = await createTestEinrichtung({ topfCent: 14_000n });
    const geladen = await prisma.einrichtung.findUniqueOrThrow({
      where: { id: e.id },
      include: { traeger: true },
    });
    expect(geladen.anteile).toBe(14_000n * 1_000_000n);
    expect(geladen.traeger?.verifiziert).toBe(true);
  });

  it('Kontenstand ist ein Singleton mit BigInt-Salden', async () => {
    await seedKontenstand({ etfMarktwertCent: 41_085n, verrechnungskontoCent: 415n });
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(41_085n);
  });

  it('Kaskadenlauf.nummer ist unique — doppelte Laufnummer wird von der DB abgewiesen', async () => {
    const daten = {
      poolwertCent: 0n,
      soliFondsCent: 0n,
      direktspendenCent: 0n,
      abgabenCent: 0n,
      managementBewegungCent: 0n,
      umverteilungCent: 0n,
    };
    await prisma.kaskadenlauf.create({ data: { nummer: 1, ...daten } });
    await expect(prisma.kaskadenlauf.create({ data: { nummer: 1, ...daten } })).rejects.toThrow();
  });

  it('Einrichtung löschen setzt Buchungs-Referenz auf null (Welten kollidieren nicht)', async () => {
    const e = await createTestEinrichtung();
    await prisma.buchung.create({ data: { typ: 'spende', einrichtungId: e.id, betragCent: 100n } });
    await prisma.zuwendung.deleteMany();
    await prisma.einrichtung.delete({ where: { id: e.id } });
    const b = await prisma.buchung.findFirstOrThrow();
    expect(b.einrichtungId).toBeNull();
  });
});
