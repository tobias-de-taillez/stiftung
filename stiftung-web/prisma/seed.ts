// stiftung-web/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EINRICHTUNGEN = [
  { slug: 'tagesmutter-wirbelwind-muenchen', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, aktuellesKapital: 3000, zielKapital: 25000 },
  { slug: 'tagesvater-sonnenschein-leipzig', name: 'Tagespflege Sonnenschein', typ: 'tagespflege', ort: 'Leipzig', kinderAnzahl: 4, aktuellesKapital: 800, zielKapital: 20000 },
  { slug: 'tagesmutter-kleine-forscher-dresden', name: 'Tagespflege Kleine Forscher', typ: 'tagespflege', ort: 'Dresden', kinderAnzahl: 6, aktuellesKapital: 12000, zielKapital: 30000 },
  { slug: 'kita-wirbelwind-muenchen', name: 'Kita Wirbelwind', typ: 'kita', ort: 'München', kinderAnzahl: 60, aktuellesKapital: 15000, zielKapital: 120000 },
  { slug: 'kita-regenbogen-koeln', name: 'Kita Regenbogen', typ: 'kita', ort: 'Köln', kinderAnzahl: 45, aktuellesKapital: 5000, zielKapital: 90000 },
  { slug: 'grundschule-sonnenhuegel-berlin', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, aktuellesKapital: 50000, zielKapital: 250000 },
  { slug: 'gymnasium-neustadt-hamburg', name: 'Gymnasium Neustadt', typ: 'schule', ort: 'Hamburg', kinderAnzahl: 800, aktuellesKapital: 450000, zielKapital: 1200000 },
  { slug: 'foerderschule-pestalozzi-bremen', name: 'Förderschule Pestalozzi', typ: 'schule', ort: 'Bremen', kinderAnzahl: 90, aktuellesKapital: 80000, zielKapital: 225000 },
];

async function main() {
  for (const e of EINRICHTUNGEN) {
    await prisma.einrichtung.upsert({ where: { slug: e.slug }, update: e, create: e });
  }
  await prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });
  console.log(`Seed abgeschlossen: ${EINRICHTUNGEN.length} Einrichtungen.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
