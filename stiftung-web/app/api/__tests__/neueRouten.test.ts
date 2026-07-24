import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedWidmung, seedKontenstand, createTestEinrichtung } from '@/lib/server/__tests__/testDb';

import { GET as getEinrichtungen, POST as postEinrichtungen } from '../einrichtungen/route';
import { GET as getEinrichtungDetail } from '../einrichtungen/[slug]/route';
import { GET as getErstbefuellung } from '../erstbefuellung/route';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('GET /api/einrichtungen', () => {
  it('liefert die Liste im neuen Topf-Format, geschlossene fehlen', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    await createTestEinrichtung({ slug: 'offen', topfCent: 10_000n });
    await createTestEinrichtung({ slug: 'zu', geschlossenAm: new Date() });

    const res = await getEinrichtungen();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.map((e: { slug: string }) => e.slug)).toEqual(['offen']);
    expect(json[0]).toHaveProperty('topfwertCent');
    expect(json[0]).toHaveProperty('auszahlungspfad');
  });
});

describe('POST /api/einrichtungen (Anlage bei Erstspende)', () => {
  it('legt eine neue Einrichtung an und gibt 201', async () => {
    const res = await postEinrichtungen(
      new Request('http://localhost/api/einrichtungen', {
        method: 'POST',
        body: JSON.stringify({ name: 'Neue Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 5, betragCent: 10_000 }),
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.dedup).toBe(false);
    expect(json.slug).toBeTruthy();

    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: json.slug } });
    expect(zeile.name).toBe('Neue Kita');
  });

  it('dedupliziert Name+Ort (case-insensitiv) und bucht als Spende auf die bestehende Einrichtung', async () => {
    const erste = await postEinrichtungen(
      new Request('http://localhost/api/einrichtungen', {
        method: 'POST',
        body: JSON.stringify({ name: 'Doppel-Kita', typ: 'kita', ort: 'Stadt', kinderAnzahl: 5, betragCent: 10_000 }),
      })
    );
    const ersteJson = await erste.json();

    const zweite = await postEinrichtungen(
      new Request('http://localhost/api/einrichtungen', {
        method: 'POST',
        body: JSON.stringify({ name: 'doppel-kita', typ: 'kita', ort: 'STADT', kinderAnzahl: 5, betragCent: 5_000 }),
      })
    );
    expect(zweite.status).toBe(201);
    const zweiteJson = await zweite.json();
    expect(zweiteJson.dedup).toBe(true);
    expect(zweiteJson.slug).toBe(ersteJson.slug);

    const anzahl = await prisma.einrichtung.count();
    expect(anzahl).toBe(1);
  });

  it('gibt 400 bei ungültigem Betrag', async () => {
    const res = await postEinrichtungen(
      new Request('http://localhost/api/einrichtungen', {
        method: 'POST',
        body: JSON.stringify({ name: 'X', typ: 'kita', ort: 'Y', kinderAnzahl: 1, betragCent: -5 }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_betrag');
  });

  it('gibt 400 bei ungültiger Kinderanzahl', async () => {
    const res = await postEinrichtungen(
      new Request('http://localhost/api/einrichtungen', {
        method: 'POST',
        body: JSON.stringify({ name: 'X', typ: 'kita', ort: 'Y', kinderAnzahl: 0, betragCent: 1_000 }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_kinderanzahl');
  });
});

describe('GET /api/einrichtungen/[slug]', () => {
  it('liefert das Detail-Objekt mit Buchungshistorie', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'detail-test', topfCent: 1_000n });

    const res = await getEinrichtungDetail(new Request('http://localhost/api/einrichtungen/detail-test'), {
      params: { slug: e.slug },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe('detail-test');
    expect(json).toHaveProperty('anzahlUnterstuetzungen');
    expect(json).toHaveProperty('buchungen');
  });

  it('gibt 404 bei unbekanntem Slug', async () => {
    const res = await getEinrichtungDetail(new Request('http://localhost/api/einrichtungen/nix'), {
      params: { slug: 'nix' },
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/erstbefuellung', () => {
  it('liefert die live berechnete Zusage', async () => {
    await seedKontenstand({ soliDepotCent: 100_000n });
    const res = await getErstbefuellung(new Request('http://localhost/api/erstbefuellung?spendeCent=10000'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.zusageCent).toBe(500); // min(2500, 10000, 0.5%*100000=500)
  });

  it('gibt 400 bei fehlendem/ungültigem spendeCent', async () => {
    const res = await getErstbefuellung(new Request('http://localhost/api/erstbefuellung'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_betrag');
  });
});

