import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import {
  listEinrichtungen,
  getEinrichtungBySlug,
  spenden,
  statistik,
  letzteSpenden,
  einrichtungsTransparenz,
  EinrichtungNotFoundError,
  UngueltigerBetragError,
} from '../einrichtungenService';

beforeEach(async () => {
  // 5-Tabellen-Reset-Regel (FK-sichere Reihenfolge):
  // FondsSpende → Spende → Einrichtung → Solidaritaetsfonds → Jahresabschluss.
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
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

  // Spenderzähler (Task 33): "echte Spender-Akte" sind direkte Spenden
  // (quelle 'direkt') und Fonds-Einzahlungen (FondsSpende) — beides sind
  // tatsächliche Handlungen von Spendenden. Solidaritätsfonds-Verteilungen
  // (quelle 'solidaritaet') sind interne Umbuchungen, keine neue Spende, und
  // zählen daher nicht mit.
  describe('anzahlSpenden (Spenderzähler)', () => {
    it('meldet 0 ohne jegliche Spenden', async () => {
      const stats = await statistik();
      expect(stats.anzahlSpenden).toBe(0);
    });

    it('zählt direkte Spenden mit', async () => {
      await spenden('test-kita-a', 50, 'einmalig');
      await spenden('test-kita-b', 20, 'einmalig');
      const stats = await statistik();
      expect(stats.anzahlSpenden).toBe(2);
    });

    it('zählt Fonds-Einzahlungen (FondsSpende) mit', async () => {
      await prisma.fondsSpende.create({ data: { betrag: 30 } });
      const stats = await statistik();
      expect(stats.anzahlSpenden).toBe(1);
    });

    it('zählt Solidaritätsfonds-Verteilungen (quelle solidaritaet) NICHT mit', async () => {
      await spenden('test-kita-a', 50, 'einmalig');
      await prisma.spende.create({
        data: { einrichtungId: (await getEinrichtungBySlug('test-kita-b'))!.id, betrag: 40, frequenz: 'einmalig', quelle: 'solidaritaet' },
      });
      const stats = await statistik();
      expect(stats.anzahlSpenden).toBe(1);
    });
  });
});

describe('letzteSpenden', () => {
  it('liefert ein leeres Array ohne Spenden', async () => {
    expect(await letzteSpenden()).toEqual([]);
  });

  it('liefert anonymisierte Spenden-Einträge (betrag, einrichtungName, quelle, vorMinuten, zeitpunkt)', async () => {
    const beforeTime = Date.now();
    await spenden('test-kita-a', 50, 'einmalig');
    const afterTime = Date.now();
    const eintraege = await letzteSpenden();
    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].betrag).toBe(50);
    expect(eintraege[0].einrichtungName).toBe('Test-Kita A');
    expect(eintraege[0].quelle).toBe('direkt');
    expect(typeof eintraege[0].vorMinuten).toBe('number');
    expect(eintraege[0].vorMinuten).toBeGreaterThanOrEqual(0);
    // zeitpunkt ist die Epoch-Millisekunde des createdAt-Zeitstempels.
    expect(typeof eintraege[0].zeitpunkt).toBe('number');
    expect(eintraege[0].zeitpunkt).toBeGreaterThanOrEqual(beforeTime);
    expect(eintraege[0].zeitpunkt).toBeLessThanOrEqual(afterTime);
    // Keine personenbezogenen Daten in der Antwort.
    expect(eintraege[0]).not.toHaveProperty('id');
    expect(eintraege[0]).not.toHaveProperty('einrichtungId');
  });

  it('gibt quelle solidaritaet unverändert durch (Labeling ist Sache der UI)', async () => {
    const kitaB = await getEinrichtungBySlug('test-kita-b');
    await prisma.spende.create({
      data: { einrichtungId: kitaB!.id, betrag: 40, frequenz: 'einmalig', quelle: 'solidaritaet' },
    });
    const eintraege = await letzteSpenden();
    expect(eintraege[0].quelle).toBe('solidaritaet');
    expect(eintraege[0].einrichtungName).toBe('Test-Kita B');
  });

  it('sortiert neueste zuerst und begrenzt auf das limit', async () => {
    await spenden('test-kita-a', 10, 'einmalig');
    await spenden('test-kita-a', 20, 'einmalig');
    await spenden('test-kita-a', 30, 'einmalig');
    const eintraege = await letzteSpenden(2);
    expect(eintraege).toHaveLength(2);
    expect(eintraege[0].betrag).toBe(30);
    expect(eintraege[1].betrag).toBe(20);
  });

  it('begrenzt standardmäßig auf die letzten 10 Spenden', async () => {
    for (let i = 0; i < 12; i++) {
      await spenden('test-kita-a', 1, 'einmalig');
    }
    const eintraege = await letzteSpenden();
    expect(eintraege).toHaveLength(10);
  });
});

// Transparenz auf der Detailseite (Task 34): Förderung pro Kind, Spendenhistorie
// (letzte 10) und Anzahl Unterstützungen gesamt — alles für EINE Einrichtung.
describe('einrichtungsTransparenz', () => {
  it('liefert null für unbekannten slug (kein Wurf — die Seite entscheidet über notFound())', async () => {
    expect(await einrichtungsTransparenz('gibt-es-nicht')).toBeNull();
  });

  it('liefert Einrichtung, Förderung pro Kind und leere Historie ohne Spenden', async () => {
    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.einrichtung.slug).toBe('test-kita-a');
    expect(t?.foerderungProKind).toBe(100); // 1000 € / 10 Kinder
    expect(t?.anzahlUnterstuetzungen).toBe(0);
    expect(t?.spendenHistorie).toEqual([]);
  });

  it('liefert die Historie neueste zuerst, inkl. Quelle', async () => {
    await spenden('test-kita-a', 50, 'einmalig');
    const kitaA = await getEinrichtungBySlug('test-kita-a');
    await prisma.spende.create({
      data: { einrichtungId: kitaA!.id, betrag: 30, frequenz: 'einmalig', quelle: 'solidaritaet' },
    });

    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.spendenHistorie).toHaveLength(2);
    expect(t?.spendenHistorie[0].quelle).toBe('solidaritaet');
    expect(t?.spendenHistorie[0].betrag).toBe(30);
    expect(t?.spendenHistorie[1].quelle).toBe('direkt');
    expect(t?.spendenHistorie[1].betrag).toBe(50);
  });

  it('begrenzt die Historie auf die letzten 10 Spenden', async () => {
    for (let i = 0; i < 12; i++) {
      await spenden('test-kita-a', 1, 'einmalig');
    }
    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.spendenHistorie).toHaveLength(10);
  });

  // Bewusst anders als statistik().anzahlSpenden (der sitesweite Spenderzähler):
  // dort zählen Solidaritätsfonds-Verteilungen NICHT mit, weil sie aus Sicht
  // der Gesamt-Site interne Umbuchungen sind, keine neue Spende von außen.
  // Aus Sicht EINER Einrichtung ist jede Zubuchung — egal ob Direktspende oder
  // Solidaritäts-Verteilung — eine reale Unterstützung, die gezählt wird.
  it('zählt Solidaritätsfonds-Verteilungen bei der Einrichtung mit (anders als der sitesweite Spenderzähler)', async () => {
    const kitaA = await getEinrichtungBySlug('test-kita-a');
    await prisma.spende.create({
      data: { einrichtungId: kitaA!.id, betrag: 40, frequenz: 'einmalig', quelle: 'solidaritaet' },
    });
    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.anzahlUnterstuetzungen).toBe(1);
  });

  it('zählt Direktspenden und Solidaritäts-Verteilungen zusammen', async () => {
    await spenden('test-kita-a', 10, 'einmalig');
    await spenden('test-kita-a', 20, 'einmalig');
    const kitaA = await getEinrichtungBySlug('test-kita-a');
    await prisma.spende.create({
      data: { einrichtungId: kitaA!.id, betrag: 40, frequenz: 'einmalig', quelle: 'solidaritaet' },
    });
    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.anzahlUnterstuetzungen).toBe(3);
  });

  it('zählt nur Spenden der angefragten Einrichtung, nicht anderer', async () => {
    await spenden('test-kita-a', 10, 'einmalig');
    await spenden('test-kita-b', 999, 'einmalig');
    const t = await einrichtungsTransparenz('test-kita-a');
    expect(t?.anzahlUnterstuetzungen).toBe(1);
    expect(t?.spendenHistorie).toHaveLength(1);
    expect(t?.spendenHistorie[0].betrag).toBe(10);
  });
});
