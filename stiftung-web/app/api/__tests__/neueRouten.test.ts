import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedWidmung, seedKontenstand, createTestEinrichtung, createTestTraeger } from '@/lib/server/__tests__/testDb';

import { GET as getEinrichtungen, POST as postEinrichtungen } from '../einrichtungen/route';
import { GET as getEinrichtungDetail } from '../einrichtungen/[slug]/route';
import { POST as postSchliessen } from '../einrichtungen/[slug]/schliessen/route';
import { GET as getErstbefuellung } from '../erstbefuellung/route';
import { PUT as putCap } from '../management/cap/route';
import { POST as postVerifikation } from '../traeger/[id]/verifikation/route';
import { POST as postMarktjahr } from '../simulation/marktjahr/route';
import { POST as postJahresabschluss } from '../simulation/jahresabschluss/route';
import { POST as postAuszahlungenLauf } from '../auszahlungen/lauf/route';

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

describe('PUT /api/management/cap', () => {
  it('setzt den Cap und liefert die aktuelle Kontenlage', async () => {
    const res = await putCap(
      new Request('http://localhost/api/management/cap', { method: 'PUT', body: JSON.stringify({ capCent: 50_000 }) })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.managementCapCent).toBe(50_000);
  });

  it('gibt 400 bei negativem Cap', async () => {
    const res = await putCap(
      new Request('http://localhost/api/management/cap', { method: 'PUT', body: JSON.stringify({ capCent: -1 }) })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_cap');
  });
});

describe('POST /api/einrichtungen/[slug]/schliessen', () => {
  it('schließt eine offene Einrichtung', async () => {
    await seedKontenstand({ etfMarktwertCent: 5_000n });
    const e = await createTestEinrichtung({ slug: 'schliess-mich', topfCent: 5_000n });

    const res = await postSchliessen(new Request('http://localhost', { method: 'POST' }), { params: { slug: e.slug } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uebertragCent).toBe(5_000);
  });

  it('gibt 404 bei unbekannter Einrichtung', async () => {
    const res = await postSchliessen(new Request('http://localhost', { method: 'POST' }), { params: { slug: 'nix' } });
    expect(res.status).toBe(404);
  });

  it('gibt 409 bei doppelter Schließung', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    const e = await createTestEinrichtung({ slug: 'doppelt-zu', topfCent: 1_000n });
    await postSchliessen(new Request('http://localhost', { method: 'POST' }), { params: { slug: e.slug } });

    const res = await postSchliessen(new Request('http://localhost', { method: 'POST' }), { params: { slug: e.slug } });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/traeger/[id]/verifikation', () => {
  it('setzt Verifikation, Rechtsform und Gemeinnützigkeit', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });

    const res = await postVerifikation(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ verifiziert: true, gemeinnuetzig: true, rechtsform: 'ggmbh' }),
      }),
      { params: { id: t.id } }
    );
    expect(res.status).toBe(200);

    const zeile = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(zeile.verifiziert).toBe(true);
    expect(zeile.rechtsform).toBe('ggmbh');
    expect(zeile.gemeinnuetzig).toBe(true);
  });

  it('gibt 400 bei unbekannter Rechtsform', async () => {
    const t = await createTestTraeger();
    const res = await postVerifikation(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ verifiziert: true, rechtsform: 'quatsch' }) }),
      { params: { id: t.id } }
    );
    expect(res.status).toBe(400);
  });

  it('gibt 400 bei geerbten Objekt-Eigenschaften statt eigener Keys (Object.hasOwn, nicht `in`)', async () => {
    const t = await createTestTraeger();
    const res = await postVerifikation(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ verifiziert: true, rechtsform: 'constructor' }),
      }),
      { params: { id: t.id } }
    );
    expect(res.status).toBe(400);
  });

  // Review-Finding aus Task 14 (jetzt in Task 16 nachgezogen): unbekannte
  // traegerId ließ Prisma mit P2025 unbehandelt durchknallen → 500.
  it('gibt 404 bei unbekannter traegerId statt eines unbehandelten 500ers', async () => {
    const res = await postVerifikation(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ verifiziert: true }),
      }),
      { params: { id: 'gibt-es-nicht' } }
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });

  // Review-Finding aus Task 14: Boolean(body.verifiziert) coerced ein
  // fehlendes/falsch typisiertes Feld stillschweigend zu false statt zu validieren.
  it('gibt 400 bei nicht-boolschem verifiziert', async () => {
    const t = await createTestTraeger();
    const res = await postVerifikation(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ verifiziert: 'ja' }),
      }),
      { params: { id: t.id } }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_verifiziert');
  });

  it('gibt 400 bei fehlendem verifiziert-Feld', async () => {
    const t = await createTestTraeger();
    const res = await postVerifikation(
      new Request('http://localhost', { method: 'POST', body: JSON.stringify({ rechtsform: 'ggmbh' }) }),
      { params: { id: t.id } }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_verifiziert');
  });
});

describe('POST-ohne-Body-Wrapper (Spec §4/§6): Marktjahr, Jahresabschluss, Auszahlungslauf', () => {
  it('POST /api/simulation/marktjahr liefert 201 mit Kurs-Deltas', async () => {
    await seedKontenstand({ etfMarktwertCent: 100_000n, soliDepotCent: 10_000n });
    const res = await postMarktjahr();
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('einrichtungsDepotDeltaCent');
    expect(json).toHaveProperty('poolwertCent');
  });

  it('POST /api/simulation/jahresabschluss liefert 201 mit Kaskaden-Ergebnis', async () => {
    await seedKontenstand({ etfMarktwertCent: 100_000n });
    const res = await postJahresabschluss();
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('nummer');
    expect(json).toHaveProperty('umverteilung');
  });

  it('POST /api/auszahlungen/lauf liefert 201, auch ohne offene Direktausschüttungen', async () => {
    const res = await postAuszahlungenLauf();
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ laufId: null, summeCent: 0, anzahl: 0 });
  });
});
