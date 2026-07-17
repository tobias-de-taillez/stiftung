import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import {
  listEinrichtungen,
  getEinrichtungBySlug,
  spenden,
  statistik,
  EinrichtungNotFoundError,
  UngueltigerBetragError,
} from '../einrichtungenService';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'test-kita-a', name: 'Test-Kita A', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'test-kita-b', name: 'Test-Kita B', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 5, aktuellesKapital: 5000, zielKapital: 20000 },
  });
});

describe('listEinrichtungen', () => {
  it('liest echte Zeilen aus der Test-DB', async () => {
    const alle = await listEinrichtungen();
    expect(alle.map((e) => e.slug).sort()).toEqual(['test-kita-a', 'test-kita-b']);
  });
});

describe('spenden', () => {
  it('erhöht aktuellesKapital in der DB dauerhaft und gibt Einrichtung + Spende zurück', async () => {
    const result = await spenden('test-kita-a', 50, 'einmalig');
    expect(result.einrichtung.aktuellesKapital).toBe(1050);
    expect(result.spende.betrag).toBe(50);
    expect(result.spende.quelle).toBe('direkt');
    const nachher = await getEinrichtungBySlug('test-kita-a');
    expect(nachher?.aktuellesKapital).toBe(1050);
  });

  it('speichert die Frequenz korrekt', async () => {
    const result = await spenden('test-kita-a', 200, 'jaehrlich');
    expect(result.spende.frequenz).toBe('jaehrlich');
  });

  it('wirft EinrichtungNotFoundError bei unbekanntem slug', async () => {
    await expect(spenden('gibt-es-nicht', 10, 'einmalig')).rejects.toThrow(EinrichtungNotFoundError);
  });

  it('wirft UngueltigerBetragError bei Betrag <= 0', async () => {
    await expect(spenden('test-kita-a', 0, 'einmalig')).rejects.toThrow(UngueltigerBetragError);
    await expect(spenden('test-kita-a', -5, 'einmalig')).rejects.toThrow(UngueltigerBetragError);
  });

  // Meilenstein-Erkennung (Task 31): test-kita-a hat aktuellesKapital 1000 bei
  // zielKapital 50000 (2 %). Bronze (Einrichtungs-Level) liegt bei 10 % = 5000 €.
  describe('Meilenstein-Erkennung', () => {
    it('liefert erreichteMeilensteine, wenn die Spende eine Schwelle überschreitet', async () => {
      const result = await spenden('test-kita-a', 4000, 'einmalig'); // 1000 → 5000 = genau 10 %
      expect(result.erreichteMeilensteine).toEqual(['Bronze erreicht']);
    });

    it('liefert ein leeres Array, wenn die Spende keine Schwelle überschreitet', async () => {
      const result = await spenden('test-kita-a', 50, 'einmalig'); // 1000 → 1050, bleibt unter 10 %
      expect(result.erreichteMeilensteine).toEqual([]);
    });
  });
});

describe('statistik', () => {
  it('berechnet Gesamtwerte und Ranking aus echten DB-Zeilen', async () => {
    const stats = await statistik();
    expect(stats.anzahlEinrichtungen).toBe(2);
    expect(stats.gesamtKapital).toBe(6000);
    expect(stats.gesamtKinder).toBe(15);
    expect(stats.top5[0].slug).toBe('test-kita-b');
    expect(stats.top5[0].foerderungProKind).toBe(1000);
    expect(stats.bottom5[0].slug).toBe('test-kita-a');
  });

  it('berechnet Durchschnittsvolumen und simulierten Jahresertrag', async () => {
    const stats = await statistik();
    expect(stats.durchschnittlichesVolumen).toBe(3000);
    expect(stats.simulierterJahresertrag).toBeCloseTo(6000 * 0.06, 5);
  });

  it('meldet 0 Zufluss, wenn im letzten Jahr nichts gespendet wurde', async () => {
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(0);
  });

  it('zählt frische Spenden zum Jahres-Zufluss', async () => {
    await spenden('test-kita-a', 100, 'einmalig');
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(100);
  });
});
