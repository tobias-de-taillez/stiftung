import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, pruefeInvarianten } from './testDb';
import {
  spendeVermoegen,
  spendeAnSoli,
  spendeMitAnlage,
  UngueltigeZuwendungError,
  EinrichtungGeschlossenError,
} from '../spendenService';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

// DB-Invarianten (P9): kein Konto negativ, Σ Topfwerte == Poolwert.
afterEach(pruefeInvarianten);

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('spendeVermoegen (Verwendungsart A, Spec §3.1)', () => {
  it('kauft Anteile zum Poolwert vor Zufluss, bucht aufs Verrechnungskonto und dokumentiert die Widmung', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n, verrechnungskontoCent: 0n });
    const e = await createTestEinrichtung({ topfCent: 10_000n, zielKapitalCent: 2_500_000n });
    // Einzige Einrichtung: ihre 10.000-Cent-Anteile tragen den GANZEN Pool von
    // 37.500 Cent → Kurs 3,75 pro Bootstrap-Einheit. 40 € kaufen daher
    // divRound(4.000 × 10^10, 37.500) = 1.066.666.667 Einheiten (~10,67 € nominal).
    const ergebnis = await spendeVermoegen(e.slug, 4_000n);

    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(zeile.anteile).toBe(10_000n * ANTEILS_EINHEITEN_PRO_CENT + 1_066_666_667n); // divRound(4000×1e10, 37500)

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    // Sweep: investierbar 4.000 bei Poolwert 41.500 → Schwelle 498 überschritten → Kauf 3.585
    expect(k.verrechnungskontoCent).toBe(415n);
    expect(k.etfMarktwertCent).toBe(41_085n);

    const zuwendung = await prisma.zuwendung.findUniqueOrThrow({ where: { id: ergebnis.zuwendungId } });
    expect(zuwendung.verwendungsart).toBe('vermoegen');
    expect(zuwendung.widmungVersion).toBe(1);
    expect(zuwendung.widmungZeitpunkt).not.toBeNull();

    const buchungen = await prisma.buchung.findMany({ orderBy: { createdAt: 'asc' } });
    expect(buchungen.map((b) => b.typ)).toEqual(['spende', 'sweep']);
    expect(ergebnis.widmung?.version).toBe(1);
  });

  it('Poolwert-Invariante: Topfwert-Zuwachs entspricht dem Spendenbetrag (±1 Cent Anzeige-Rundung)', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    const ergebnis = await spendeVermoegen(e.slug, 4_000n);
    const zuwachs = ergebnis.topfwertNachherCent - ergebnis.topfwertVorherCent;
    expect(Math.abs(zuwachs - 4_000)).toBeLessThanOrEqual(1);
  });

  it('erste Spende in leeren Pool nutzt den Bootstrap-Kurs', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung({ topfCent: 0n });
    await spendeVermoegen(e.slug, 500n);
    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(zeile.anteile).toBe(500n * ANTEILS_EINHEITEN_PRO_CENT);
  });

  it('meldet Meilensteine über den Topfwert-Sprung', async () => {
    await seedKontenstand({ etfMarktwertCent: 900n });
    const e = await createTestEinrichtung({ topfCent: 900n, zielKapitalCent: 10_000n }); // 9 % vom Ziel
    const ergebnis = await spendeVermoegen(e.slug, 200n); // → 11 %: Bronze (10 %)
    expect(ergebnis.erreichteMeilensteine).toContain('Bronze erreicht');
  });

  it('lehnt Betrag <= 0, unbekannten Slug und geschlossene Einrichtungen ab', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung({ geschlossenAm: new Date() });
    await expect(spendeVermoegen(e.slug, 100n)).rejects.toThrow(EinrichtungGeschlossenError);
    await expect(spendeVermoegen('gibt-es-nicht', 100n)).rejects.toThrow();
    const offen = await createTestEinrichtung();
    await expect(spendeVermoegen(offen.slug, 0n)).rejects.toThrow(UngueltigeZuwendungError);
  });
});

describe('spendeMitAnlage (Anlage bei Erstspende, Spec §3.0)', () => {
  it('vollständig nicht-lateinischer Name/Typ/Ort fällt auf den Slug "einrichtung" zurück statt auf ""', async () => {
    await seedKontenstand();
    const ergebnis = await spendeMitAnlage(
      { name: '子供の家', typ: '幼稚園', ort: '東京', kinderAnzahl: 5 },
      10_000n
    );
    expect(ergebnis.slug).toBe('einrichtung');
  });

  it('Slug-Kollision ohne Dedup-Treffer bekommt das Suffix -2', async () => {
    await seedKontenstand();
    // "Kita Nord" und "Kita. Nord" normalisieren unterschiedlich (kein Dedup),
    // slugifyen aber identisch → der Kollisions-Loop muss -2 anhängen.
    const erste = await spendeMitAnlage({ name: 'Kita Nord', typ: 'kita', ort: 'Berlin', kinderAnzahl: 5 }, 10_000n);
    const zweite = await spendeMitAnlage({ name: 'Kita. Nord', typ: 'kita', ort: 'Berlin', kinderAnzahl: 5 }, 10_000n);
    expect(zweite.dedup).toBe(false);
    expect(zweite.slug).toBe(`${erste.slug}-2`);
    expect(await prisma.einrichtung.count()).toBe(2);
  });

  it('lehnt leeren Namen, leeren Ort, Kinderzahl < 1 und Betrag <= 0 ab', async () => {
    await seedKontenstand();
    const ok = { name: 'Kita', typ: 'kita', ort: 'Stadt', kinderAnzahl: 5 };
    await expect(spendeMitAnlage({ ...ok, name: '   ' }, 1_000n)).rejects.toThrow(UngueltigeZuwendungError);
    await expect(spendeMitAnlage({ ...ok, ort: '' }, 1_000n)).rejects.toThrow(UngueltigeZuwendungError);
    await expect(spendeMitAnlage({ ...ok, kinderAnzahl: 0 }, 1_000n)).rejects.toThrow(UngueltigeZuwendungError);
    await expect(spendeMitAnlage(ok, 0n)).rejects.toThrow(UngueltigeZuwendungError);
    expect(await prisma.einrichtung.count()).toBe(0);
  });
});

describe('fehlender Widmungstext (Doku-Pflicht, Spec §3.1)', () => {
  it('Verwendungsart A ist ohne hinterlegten Wortlaut nicht buchbar', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung();
    await prisma.widmungsText.deleteMany();
    await expect(spendeVermoegen(e.slug, 1_000n)).rejects.toThrow(UngueltigeZuwendungError);
    await expect(spendeAnSoli(1_000n)).rejects.toThrow(UngueltigeZuwendungError);
    await expect(
      spendeMitAnlage({ name: 'Neue Kita', typ: 'kita', ort: 'Stadt', kinderAnzahl: 3 }, 1_000n)
    ).rejects.toThrow(UngueltigeZuwendungError);
    // Nichts halb gebucht: keine Zuwendung, keine neue Einrichtung.
    expect(await prisma.zuwendung.count()).toBe(0);
    expect(await prisma.einrichtung.count()).toBe(1);
  });
});

describe('spendeAnSoli', () => {
  it('bucht auf das Soli-Verrechnungskonto, dokumentiert Widmung, sweept gegen den Soli-Fonds', async () => {
    await seedKontenstand({ soliDepotCent: 100_000n });
    const ergebnis = await spendeAnSoli(10_000n);
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    // Soli-Fonds 110.000; Ziel 1.100, Schwelle 1.320: investierbar 10.000 > 1.320 → Kauf 8.900
    expect(k.soliVerrechnungskontoCent).toBe(1_100n);
    expect(k.soliDepotCent).toBe(108_900n);
    expect(ergebnis.soliFondsCent).toBe(110_000);
    const z = await prisma.zuwendung.findFirstOrThrow();
    expect(z.einrichtungId).toBeNull();
    expect(z.verwendungsart).toBe('vermoegen'); // Soli kennt keine Direktausschüttung
    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toEqual(['soli_spende', 'soli_sweep']);
  });
});
