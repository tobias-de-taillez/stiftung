// Admin-Session (Design-Spec §1): signiertes httpOnly-Cookie, rein node:crypto,
// keine Dependency. Das Cookie ist Session-Scope (kein maxAge) → stirbt mit dem
// Browserfenster; zwei private Fenster ergeben zwei unabhängige Rollen.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'admin_session';
const PRAEFIX = 'admin.v1.';

function env(name: string): string {
  const wert = process.env[name];
  if (!wert) {
    // Kein stilles Leer-Secret: ein leeres Secret würde jeden Token akzeptieren.
    throw new Error(`${name} ist nicht gesetzt — Admin-Session nicht nutzbar.`);
  }
  return wert;
}

// Secret aus Session-Secret UND Passwort: eine Passwortänderung invalidiert
// automatisch alle bestehenden Sessions.
function secret(): string {
  return createHmac('sha256', env('ADMIN_SESSION_SECRET')).update(env('ADMIN_PASSWORT')).digest('hex');
}

function signiere(nutzlast: string): string {
  return createHmac('sha256', secret()).update(nutzlast).digest('base64url');
}

function sicherGleich(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function erstelleSessionToken(): string {
  const nutzlast = `${PRAEFIX}${Date.now()}`;
  return `${nutzlast}.${signiere(nutzlast)}`;
}

export function pruefeSessionToken(token: string | undefined): boolean {
  if (!token || !token.startsWith(PRAEFIX)) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= PRAEFIX.length - 1) return false;
  const nutzlast = token.slice(0, idx);
  const signatur = token.slice(idx + 1);
  if (!nutzlast.startsWith(PRAEFIX) || signatur.length === 0) return false;
  return sicherGleich(signatur, signiere(nutzlast));
}

export function pruefePasswort(eingabe: string): boolean {
  return sicherGleich(eingabe, env('ADMIN_PASSWORT'));
}

export function pruefeAdminSession(request: Request): boolean {
  const header = request.headers.get('cookie');
  if (!header) return false;
  const treffer = header
    .split(';')
    .map((teil) => teil.trim())
    .find((teil) => teil.startsWith(`${ADMIN_COOKIE}=`));
  if (!treffer) return false;
  return pruefeSessionToken(treffer.slice(ADMIN_COOKIE.length + 1));
}
