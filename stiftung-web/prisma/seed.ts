// stiftung-web/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Anteils-Feinheit: Bootstrap-Kurs 1 Cent == 1e6 Einheiten (siehe lib/verrechnung/konstanten.ts —
// hier dupliziert, weil seed.ts über tsx außerhalb des Next-Alias läuft).
const ANTEILE = 1_000_000n;

const TRAEGER = [
  { key: 'winter', name: 'Maria Winter', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: true },
  { key: 'krause', name: 'Familie Krause', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: false },
  { key: 'forscher', name: 'Jan Litke', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: true },
  { key: 'kinderland', name: 'Kinderland gGmbH', rechtsform: 'ggmbh', gemeinnuetzig: true, verifiziert: true },
  { key: 'berlin', name: 'Land Berlin', rechtsform: 'kommune', gemeinnuetzig: false, verifiziert: true },
  { key: 'hamburg', name: 'Freie und Hansestadt Hamburg', rechtsform: 'kommune', gemeinnuetzig: false, verifiziert: false },
  { key: 'pestalozzi', name: 'Pestalozzi-Stiftung Bremen', rechtsform: 'stiftung', gemeinnuetzig: true, verifiziert: true },
] as const;

// topfCent == bisheriges aktuellesKapital in Cent; Kinderland betreibt zwei
// Einrichtungen (Träger 1 ── n Einrichtung, Spec §1).
const EINRICHTUNGEN = [
  { slug: 'tagesmutter-wirbelwind-muenchen', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, topfCent: 300_000n, zielKapitalCent: 2_500_000n, traeger: 'winter' },
  { slug: 'tagesvater-sonnenschein-leipzig', name: 'Tagespflege Sonnenschein', typ: 'tagespflege', ort: 'Leipzig', kinderAnzahl: 4, topfCent: 80_000n, zielKapitalCent: 2_000_000n, traeger: 'krause' },
  { slug: 'tagesmutter-kleine-forscher-dresden', name: 'Tagespflege Kleine Forscher', typ: 'tagespflege', ort: 'Dresden', kinderAnzahl: 6, topfCent: 1_200_000n, zielKapitalCent: 3_000_000n, traeger: 'forscher' },
  { slug: 'kita-wirbelwind-muenchen', name: 'Kita Wirbelwind', typ: 'kita', ort: 'München', kinderAnzahl: 60, topfCent: 1_500_000n, zielKapitalCent: 12_000_000n, traeger: 'kinderland' },
  { slug: 'kita-regenbogen-koeln', name: 'Kita Regenbogen', typ: 'kita', ort: 'Köln', kinderAnzahl: 45, topfCent: 500_000n, zielKapitalCent: 9_000_000n, traeger: 'kinderland' },
  { slug: 'grundschule-sonnenhuegel-berlin', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, topfCent: 5_000_000n, zielKapitalCent: 25_000_000n, traeger: 'berlin' },
  { slug: 'gymnasium-neustadt-hamburg', name: 'Gymnasium Neustadt', typ: 'schule', ort: 'Hamburg', kinderAnzahl: 800, topfCent: 45_000_000n, zielKapitalCent: 120_000_000n, traeger: 'hamburg' },
  { slug: 'foerderschule-pestalozzi-bremen', name: 'Förderschule Pestalozzi', typ: 'schule', ort: 'Bremen', kinderAnzahl: 90, topfCent: 8_000_000n, zielKapitalCent: 22_500_000n, traeger: 'pestalozzi' },
] as const;

async function main() {
  const traegerIds = new Map<string, string>();
  for (const t of TRAEGER) {
    const vorhanden = await prisma.traeger.findFirst({ where: { name: t.name } });
    const zeile =
      vorhanden ??
      (await prisma.traeger.create({
        data: { name: t.name, rechtsform: t.rechtsform, gemeinnuetzig: t.gemeinnuetzig, verifiziert: t.verifiziert },
      }));
    traegerIds.set(t.key, zeile.id);
  }

  for (const e of EINRICHTUNGEN) {
    const data = {
      slug: e.slug,
      name: e.name,
      typ: e.typ,
      ort: e.ort,
      kinderAnzahl: e.kinderAnzahl,
      aktuellesKapital: Number(e.topfCent) / 100, // Legacy, fällt in Task 20
      zielKapital: Number(e.zielKapitalCent) / 100, // Legacy, fällt in Task 20
      anteile: e.topfCent * ANTEILE,
      zielKapitalCent: e.zielKapitalCent,
      traegerId: traegerIds.get(e.traeger)!,
    };
    await prisma.einrichtung.upsert({ where: { slug: e.slug }, update: data, create: data });
  }

  // Kontenstände: Poolwert == Σ Töpfe; Verrechnungskonto sauber auf dem
  // 1-%-Sweep-Ziel, Rest im ETF. Soli-Fonds 5.000 € (Depot 4.950 € + VK 50 €).
  const poolwert = EINRICHTUNGEN.reduce((s, e) => s + e.topfCent, 0n); // 61.580.000 Cent
  const vk = poolwert / 100n; // 1 % Ziel
  await prisma.kontenstand.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      etfMarktwertCent: poolwert - vk,
      verrechnungskontoCent: vk,
      soliDepotCent: 495_000n,
      soliVerrechnungskontoCent: 5_000n,
      managementKontoCent: 0n,
      managementCapCent: 1_000_000n, // Cap 10.000 € (Spec §8: von der Mitgliederversammlung; hier Demo-Wert)
    },
  });

  await prisma.widmungsText.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      wortlaut:
        'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.',
    },
  });

  // Legacy-Fonds-Zeile, bis das alte Panel fällt (Task 20).
  await prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });

  console.log(`Seed abgeschlossen: ${TRAEGER.length} Träger, ${EINRICHTUNGEN.length} Einrichtungen, Kontenstand, Widmung v1.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
