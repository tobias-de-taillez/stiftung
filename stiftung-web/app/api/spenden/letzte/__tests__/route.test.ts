import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import { buche } from '@/lib/server/kontenService';
import { GET } from '../route';

beforeEach(async () => {
  await resetDb();
});

// Dünner Route-Smoke-Test — die Typ-Filter-/Soli-Fallback-Deckung liegt in
// buchungsTicker() selbst (lib/server/__tests__/uebersichtService.test.ts).
describe('GET /api/spenden/letzte', () => {
  it('liefert ein leeres Array ohne Buchungen', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('liefert die neuesten Buchungen im neuen Format (betragCent/typ)', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'ticker-test-kita', name: 'Ticker-Test-Kita', topfCent: 1_000n });
    await buche(prisma, { typ: 'spende', betragCent: 5_000n, einrichtungId: e.id });

    const res = await GET();
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({ betragCent: 5_000, typ: 'spende', einrichtungName: 'Ticker-Test-Kita' });
    expect(typeof json[0].vorMinuten).toBe('number');
    expect(typeof json[0].zeitpunkt).toBe('number');
  });
});
