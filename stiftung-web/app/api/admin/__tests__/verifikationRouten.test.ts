import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, createTestTraeger, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import { erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';
import { prisma } from '@/lib/server/prismaClient';
import { POST as antragPost } from '@/app/api/traeger/[id]/verifikation/antrag/route';
import { GET as antraegeGet } from '../verifikation/antraege/route';
import { POST as entscheidePost } from '../verifikation/antraege/[id]/route';

const adminCookie = () => `${ADMIN_COOKIE}=${erstelleSessionToken()}`;
beforeEach(resetDb);

describe('POST /api/traeger/[id]/verifikation/antrag (public)', () => {
  it('legt einen Antrag an (201)', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(201);
  });

  it('409 bei bereits verifiziertem Träger', async () => {
    const t = await createTestTraeger({ verifiziert: true });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('bereits_verifiziert');
  });

  it('400 bei ungültiger Rechtsform', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'quatsch', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(400);
  });

  it('404 traeger_nicht_gefunden', async () => {
    const req = new Request('http://x/api/traeger/nonexistent/verifikation/antrag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: 'nonexistent' } });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('traeger_nicht_gefunden');
  });

  it('409 antrag_offen', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req1 = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res1 = await antragPost(req1, { params: { id: t.id } });
    expect(res1.status).toBe(201);

    const req2 = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res2 = await antragPost(req2, { params: { id: t.id } });
    expect(res2.status).toBe(409);
    expect((await res2.json()).error).toBe('antrag_offen');
  });

  it('400 invalid_gemeinnuetzig', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: 'ja' }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_gemeinnuetzig');
  });
});

describe('Admin-Verifikations-Routen: Guard + Fluss', () => {
  it('GET antraege: ohne Cookie 401', async () => {
    const res = await antraegeGet(new Request('http://x/api/admin/verifikation/antraege'));
    expect(res.status).toBe(401);
  });

  it('End-to-End: Antrag → Liste → Genehmigung verifiziert den Träger', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    await createTestEinrichtung({ traegerId: t.id });
    await antragPost(
      new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
      }),
      { params: { id: t.id } }
    );
    const liste = await (await antraegeGet(new Request('http://x/api/admin/verifikation/antraege', { headers: { cookie: adminCookie() } }))).json();
    expect(liste).toHaveLength(1);
    const antragId = liste[0].antragId;
    const res = await entscheidePost(
      new Request(`http://x/api/admin/verifikation/antraege/${antragId}`, {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      }),
      { params: { id: antragId } }
    );
    expect(res.status).toBe(200);
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(true);
  });

  it('POST entscheidung: ohne Cookie 401', async () => {
    const res = await entscheidePost(
      new Request('http://x/api/admin/verifikation/antraege/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entscheidung: 'genehmigt' }) }),
      { params: { id: 'x' } }
    );
    expect(res.status).toBe(401);
  });

  it('404 antrag_nicht_gefunden', async () => {
    const res = await entscheidePost(
      new Request('http://x/api/admin/verifikation/antraege/nonexistent', {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      }),
      { params: { id: 'nonexistent' } }
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('antrag_nicht_gefunden');
  });

  it('409 bereits_entschieden', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    await antragPost(
      new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
      }),
      { params: { id: t.id } }
    );
    const liste = await (await antraegeGet(new Request('http://x/api/admin/verifikation/antraege', { headers: { cookie: adminCookie() } }))).json();
    const antragId = liste[0].antragId;

    const res1 = await entscheidePost(
      new Request(`http://x/api/admin/verifikation/antraege/${antragId}`, {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      }),
      { params: { id: antragId } }
    );
    expect(res1.status).toBe(200);

    const res2 = await entscheidePost(
      new Request(`http://x/api/admin/verifikation/antraege/${antragId}`, {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      }),
      { params: { id: antragId } }
    );
    expect(res2.status).toBe(409);
    expect((await res2.json()).error).toBe('bereits_entschieden');
  });

  it('400 invalid_entscheidung', async () => {
    const res = await entscheidePost(
      new Request('http://x/api/admin/verifikation/antraege/x', {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'vielleicht' }),
      }),
      { params: { id: 'x' } }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_entscheidung');
  });
});
