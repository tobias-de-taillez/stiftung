import { describe, it, expect, vi, afterEach } from 'vitest';
import { erstelleSessionToken, pruefeSessionToken, pruefePasswort, pruefeAdminSession, ADMIN_COOKIE, MAX_SESSION_ALTER_MS } from '../adminSession';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('adminSession', () => {
  it('erstellt ein Token, das die eigene Prüfung besteht', () => {
    const token = erstelleSessionToken();
    expect(pruefeSessionToken(token)).toBe(true);
  });

  it('weist manipulierte, leere und fehlende Token ab', () => {
    expect(pruefeSessionToken(undefined)).toBe(false);
    expect(pruefeSessionToken('')).toBe(false);
    expect(pruefeSessionToken('admin.v1.123.gefälscht')).toBe(false);
    const echt = erstelleSessionToken();
    expect(pruefeSessionToken(echt + 'x')).toBe(false); // Signatur kippt
    expect(pruefeSessionToken('quatsch')).toBe(false);
  });

  it('Passwortänderung invalidiert ein Alt-Token (Secret aus Passwort abgeleitet)', () => {
    const alt = erstelleSessionToken();
    expect(pruefeSessionToken(alt)).toBe(true);
    vi.stubEnv('ADMIN_PASSWORT', 'neues-passwort');
    expect(pruefeSessionToken(alt)).toBe(false); // Secret kippt → Signatur kippt
  });

  it('erzwingt maxAlterMs erst, wenn gesetzt — sonst unbegrenzt gültig', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = erstelleSessionToken();
    expect(pruefeSessionToken(token, MAX_SESSION_ALTER_MS)).toBe(true); // frisch

    vi.setSystemTime(new Date('2026-03-01T00:00:00Z')); // +59 Tage > 30
    expect(pruefeSessionToken(token, MAX_SESSION_ALTER_MS)).toBe(false); // abgelaufen
    expect(pruefeSessionToken(token)).toBe(true); // ohne maxAlterMs weiterhin gültig
  });

  it('pruefePasswort ist true nur beim exakten Passwort', () => {
    expect(pruefePasswort('test-passwort')).toBe(true);
    expect(pruefePasswort('falsch')).toBe(false);
    expect(pruefePasswort('')).toBe(false);
    expect(pruefePasswort('test-passwort ')).toBe(false); // kein Trim
  });

  it('pruefeAdminSession liest das Cookie aus dem Cookie-Header', () => {
    const token = erstelleSessionToken();
    const mitCookie = new Request('http://x/api/admin/x', { headers: { cookie: `${ADMIN_COOKIE}=${token}` } });
    const ohneCookie = new Request('http://x/api/admin/x');
    const falsch = new Request('http://x/api/admin/x', { headers: { cookie: `${ADMIN_COOKIE}=kaputt` } });
    const fremdesCookie = new Request('http://x/api/admin/x', { headers: { cookie: `anderes=abc; ${ADMIN_COOKIE}=${token}` } });
    expect(pruefeAdminSession(mitCookie)).toBe(true);
    expect(pruefeAdminSession(ohneCookie)).toBe(false);
    expect(pruefeAdminSession(falsch)).toBe(false);
    expect(pruefeAdminSession(fremdesCookie)).toBe(true); // findet das richtige Cookie zwischen anderen
  });
});
