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

  it('Einrichtung löschen setzt Buchungs-Referenz auf null (Welten kollidieren nicht)', async () => {
    const e = await createTestEinrichtung();
    await prisma.buchung.create({ data: { typ: 'spende', einrichtungId: e.id, betragCent: 100n } });
    await prisma.zuwendung.deleteMany();
    await prisma.einrichtung.delete({ where: { id: e.id } });
    const b = await prisma.buchung.findFirstOrThrow();
    expect(b.einrichtungId).toBeNull();
  });
});
