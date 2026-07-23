// Zentraler Reset, den jede DB-Suite verwendet: ALLE Tabellen, FK-sichere
// Reihenfolge (Kinder vor Eltern). Seit Task 20 der einzige Buchungspfad —
// keine Alt-Welt-Tabellen mehr, die eine eigene Reset-Logik bräuchten.
import { prisma } from '../prismaClient';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';
import { topfwertCent } from '@/lib/verrechnung/anteile';

export async function resetDb() {
  await prisma.buchung.deleteMany();
  await prisma.zuwendung.deleteMany();
  await prisma.auszahlungsLauf.deleteMany();
  await prisma.kaskadenlauf.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.traeger.deleteMany();
  await prisma.widmungsText.deleteMany();
  await prisma.kontenstand.deleteMany();
}

/**
 * DB-Invarianten nach jedem Service-Test (`afterEach(pruefeInvarianten)`):
 * kein Konto negativ, Σ Topfwerte == Poolwert (± 1 Cent je Einrichtung
 * Anzeige-Rundung). Der Σ-Check ist bei anteiliger Topfwert-Formel vor allem
 * ein Regressionsschutz für topfwertCent/divRound selbst.
 */
export async function pruefeInvarianten() {
  const k = await prisma.kontenstand.findUnique({ where: { id: 'main' } });
  if (!k) return; // Suite ohne Kontenstand — nichts zu prüfen
  const konten = {
    etfMarktwertCent: k.etfMarktwertCent,
    verrechnungskontoCent: k.verrechnungskontoCent,
    soliDepotCent: k.soliDepotCent,
    soliVerrechnungskontoCent: k.soliVerrechnungskontoCent,
    managementKontoCent: k.managementKontoCent,
  };
  for (const [feld, wert] of Object.entries(konten)) {
    if (wert < 0n) throw new Error(`Invariante verletzt: ${feld} ist negativ (${wert})`);
  }
  const offeneDirekt =
    (
      await prisma.zuwendung.aggregate({
        _sum: { betragCent: true },
        where: { verwendungsart: 'direkt', ausgezahltAm: null },
      })
    )._sum.betragCent ?? 0n;
  const pool = k.etfMarktwertCent + k.verrechnungskontoCent - offeneDirekt;
  const offene = await prisma.einrichtung.findMany({ where: { geschlossenAm: null }, select: { anteile: true } });
  const gesamt = offene.reduce((s, e) => s + e.anteile, 0n);
  if (gesamt === 0n) return; // leerer Pool — kein Topf zu vergleichen
  const summeToepfe = offene.reduce((s, e) => s + topfwertCent(e.anteile, pool, gesamt), 0n);
  const diff = summeToepfe >= pool ? summeToepfe - pool : pool - summeToepfe;
  if (diff > BigInt(offene.length)) {
    throw new Error(`Invariante verletzt: Σ Topfwerte ${summeToepfe} weicht vom Poolwert ${pool} ab`);
  }
}

export async function seedWidmung() {
  return prisma.widmungsText.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      wortlaut:
        'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.',
    },
  });
}

export async function seedKontenstand(
  overrides: Partial<{
    etfMarktwertCent: bigint;
    verrechnungskontoCent: bigint;
    soliDepotCent: bigint;
    soliVerrechnungskontoCent: bigint;
    managementKontoCent: bigint;
    managementCapCent: bigint;
  }> = {}
) {
  return prisma.kontenstand.create({ data: { id: 'main', ...overrides } });
}

let laufNr = 0;

export async function createTestTraeger(
  overrides: Partial<{ name: string; rechtsform: string; gemeinnuetzig: boolean; verifiziert: boolean }> = {}
) {
  laufNr += 1;
  return prisma.traeger.create({
    data: {
      name: `Testträger ${laufNr}`,
      rechtsform: 'ggmbh',
      gemeinnuetzig: true,
      verifiziert: true,
      ...overrides,
    },
  });
}

export async function createTestEinrichtung(
  overrides: Partial<{
    slug: string;
    name: string;
    typ: string;
    ort: string;
    kinderAnzahl: number;
    topfCent: bigint; // Komfort: wird zum Bootstrap-Kurs in anteile übersetzt
    zielKapitalCent: bigint;
    traegerId: string;
    geschlossenAm: Date | null;
  }> = {}
) {
  laufNr += 1;
  const traegerId = overrides.traegerId ?? (await createTestTraeger()).id;
  const topfCent = overrides.topfCent ?? 0n;
  return prisma.einrichtung.create({
    data: {
      slug: overrides.slug ?? `test-einrichtung-${laufNr}`,
      name: overrides.name ?? `Test-Einrichtung ${laufNr}`,
      typ: overrides.typ ?? 'kita',
      ort: overrides.ort ?? 'Teststadt',
      kinderAnzahl: overrides.kinderAnzahl ?? 10,
      anteile: topfCent * ANTEILS_EINHEITEN_PRO_CENT,
      zielKapitalCent: overrides.zielKapitalCent ?? 1_000_000n,
      traegerId,
      geschlossenAm: overrides.geschlossenAm ?? null,
    },
  });
}
