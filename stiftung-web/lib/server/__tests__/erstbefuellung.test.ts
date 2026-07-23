import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung } from './testDb';
import { spendeMitAnlage, erstbefuellungsZusageCent } from '../spendenService';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

const DATEN = { name: 'Tagespflege Pusteblume', typ: 'tagespflege', ort: 'Kiel', kinderAnzahl: 4 };

describe('spendeMitAnlage (Spec §3.0 — Stufe 2: erst die Spende persistiert)', () => {
  it('legt Träger + Einrichtung an, bucht Erstbefüllung aus dem Soli und die Spende zusammen', async () => {
    await seedKontenstand({ soliDepotCent: 990_000n, soliVerrechnungskontoCent: 10_000n }); // Soli 10.000 €
    const ergebnis = await spendeMitAnlage(DATEN, 10_000n); // Spende 100 €

    expect(ergebnis.dedup).toBe(false);
    expect(ergebnis.erstbefuellungCent).toBe(2_500); // min(25 €, 100 €, 50 €) = Basisbetrag

    const e = await prisma.einrichtung.findUniqueOrThrow({
      where: { slug: ergebnis.slug },
      include: { traeger: true },
    });
    expect(e.traeger?.verifiziert).toBe(false);
    expect(e.traeger?.rechtsform).toBe('unbekannt');
    expect(e.zielKapitalCent).toBe(800_000n); // 4 Kinder × 2.000 €

    // Topf = Spende + Erstbefüllung = 125 €
    expect(ergebnis.topfwertNachherCent).toBe(12_500);

    // Soli hat exakt E verloren (zuerst aus dem Soli-VK entnommen)
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliVerrechnungskontoCent + k.soliDepotCent).toBe(997_500n);

    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toContain('erstbefuellung');
    expect(typen).toContain('spende');
  });

  it('0,5 %-Grenze schützt einen kleinen Soli-Fonds (Spec §3.0: 1.000 € Fonds → 5 €)', async () => {
    await seedKontenstand({ soliDepotCent: 100_000n });
    const ergebnis = await spendeMitAnlage(DATEN, 10_000n);
    expect(ergebnis.erstbefuellungCent).toBe(500);
  });

  it('dedupliziert gegen bestehende Einrichtungen (Name + Ort, case-insensitiv) — keine Erstbefüllung', async () => {
    await seedKontenstand({ soliDepotCent: 1_000_000n });
    await createTestEinrichtung({ name: 'Tagespflege Pusteblume', ort: 'Kiel', topfCent: 5_000n });
    const ergebnis = await spendeMitAnlage({ ...DATEN, name: 'tagespflege pusteblume' }, 10_000n);
    expect(ergebnis.dedup).toBe(true);
    expect(ergebnis.erstbefuellungCent).toBe(0);
    expect(await prisma.einrichtung.count()).toBe(1); // kein zweiter Datensatz
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliDepotCent).toBe(1_000_000n); // Soli unangetastet
  });

  it('leerer Soli-Fonds: Anlage funktioniert, Erstbefüllung ist 0', async () => {
    await seedKontenstand();
    const ergebnis = await spendeMitAnlage(DATEN, 500n);
    expect(ergebnis.erstbefuellungCent).toBe(0);
    expect(ergebnis.topfwertNachherCent).toBe(500);
  });
});

describe('erstbefuellungsZusageCent (Stufe-1-Anzeige, live aus dem Soli-Stand)', () => {
  it('liefert die aktuelle Zusage ohne irgendetwas zu buchen', async () => {
    await seedKontenstand({ soliDepotCent: 1_000_000n });
    expect(await erstbefuellungsZusageCent(500n)).toBe(500); // Verdopplung der Kleinspende
    expect(await prisma.einrichtung.count()).toBe(0);
    expect(await prisma.buchung.count()).toBe(0);
  });
});
