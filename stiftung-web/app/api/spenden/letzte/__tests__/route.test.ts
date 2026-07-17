import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { spenden } from '@/lib/server/einrichtungenService';
import { GET } from '../route';

beforeEach(async () => {
  // 5-Tabellen-Reset-Regel (FK-sichere Reihenfolge):
  // FondsSpende → Spende → Einrichtung → Solidaritaetsfonds → Jahresabschluss.
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'ticker-test-kita', name: 'Ticker-Test-Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
});

describe('GET /api/spenden/letzte', () => {
  it('liefert ein leeres Array ohne Spenden', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('liefert anonymisierte Spenden-Einträge', async () => {
    await spenden('ticker-test-kita', 50, 'einmalig');
    const res = await GET();
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({ betrag: 50, einrichtungName: 'Ticker-Test-Kita', quelle: 'direkt' });
    expect(typeof json[0].vorMinuten).toBe('number');
  });
});
