import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung } from './testDb';
import {
  ensureKontenstand,
  offeneDirektausschuettungenCent,
  poolwertCent,
  soliFondsCentAktuell,
  kontenLage,
  setManagementCap,
} from '../kontenService';

beforeEach(resetDb);

describe('kontenService', () => {
  it('ensureKontenstand legt das Singleton bei Bedarf an', async () => {
    const k = await prisma.$transaction((tx) => ensureKontenstand(tx));
    expect(k.id).toBe('main');
    expect(k.etfMarktwertCent).toBe(0n);
  });

  it('poolwertCent zieht offene Direktausschüttungen ab (Spec §3.1: B geht nicht in den Poolwert ein)', async () => {
    await seedKontenstand({ etfMarktwertCent: 39_000n, verrechnungskontoCent: 3_000n });
    const e = await createTestEinrichtung();
    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 2_000n, verwendungsart: 'direkt' },
    });
    await prisma.$transaction(async (tx) => {
      expect(await offeneDirektausschuettungenCent(tx)).toBe(2_000n);
      expect(await poolwertCent(tx)).toBe(40_000n);
    });
  });

  it('bereits ausgezahlte Direktausschüttungen zählen nicht mehr als offen', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const e = await createTestEinrichtung();
    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 500n, verwendungsart: 'direkt', ausgezahltAm: new Date() },
    });
    await prisma.$transaction(async (tx) => {
      expect(await offeneDirektausschuettungenCent(tx)).toBe(0n);
    });
  });

  it('soliFondsCentAktuell summiert Depot + Verrechnungskonto', async () => {
    await seedKontenstand({ soliDepotCent: 495_000n, soliVerrechnungskontoCent: 5_000n });
    await prisma.$transaction(async (tx) => {
      expect(await soliFondsCentAktuell(tx)).toBe(500_000n);
    });
  });

  it('kontenLage liefert serialisierte number-Werte', async () => {
    await seedKontenstand({ etfMarktwertCent: 41_085n, verrechnungskontoCent: 415n, soliDepotCent: 30_000n });
    const lage = await kontenLage();
    expect(lage.poolwertCent).toBe(41_500);
    expect(lage.soliFondsCent).toBe(30_000);
    expect(typeof lage.etfMarktwertCent).toBe('number');
  });

  it('setManagementCap schreibt den Cap (Spec §8: muss vor dem Stichtagslauf feststehen)', async () => {
    await setManagementCap(120_000n);
    const lage = await kontenLage();
    expect(lage.managementCapCent).toBe(120_000);
  });
});
