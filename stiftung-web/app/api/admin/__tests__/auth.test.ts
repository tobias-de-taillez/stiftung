import { describe, it, expect } from 'vitest';
import { POST as login } from '../login/route';
import { POST as logout } from '../logout/route';
import { ADMIN_COOKIE, pruefeSessionToken } from '@/lib/server/adminSession';

function req(body: unknown): Request {
  return new Request('http://x/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function cookieAusResponse(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const m = setCookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

describe('POST /api/admin/login', () => {
  it('setzt bei korrektem Passwort ein gültiges Session-Cookie', async () => {
    const res = await login(req({ passwort: 'test-passwort' }));
    expect(res.status).toBe(200);
    const token = cookieAusResponse(res);
    expect(token).not.toBeNull();
    expect(pruefeSessionToken(token!)).toBe(true);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie.toUpperCase()).not.toMatch(/MAX-AGE/); // Session-Cookie
  });

  it('weist falsches Passwort mit 401 ab und setzt kein Cookie', async () => {
    const res = await login(req({ passwort: 'falsch' }));
    expect(res.status).toBe(401);
    expect(cookieAusResponse(res)).toBeNull();
  });

  it('weist fehlendes Passwort mit 401 ab', async () => {
    const res = await login(req({}));
    expect(res.status).toBe(401);
  });

  it('weist null-Body mit 401 ab (kein 500)', async () => {
    const res = await login(new Request('http://x/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null',
    }));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/logout', () => {
  it('löscht das Cookie (Max-Age=0)', async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(new RegExp(`${ADMIN_COOKIE}=`));
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
