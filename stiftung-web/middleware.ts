// Redirect-Komfort für /admin/* (verhindert das Aufblitzen einer Admin-Seite).
// Prüft NUR die Präsenz des Cookies, NICHT die Signatur — node:crypto ist im
// Edge-Runtime eingeschränkt; die maßgebliche Signaturprüfung leisten die
// Handler-Guards (pruefeAdminSession) und die RSC der Admin-Seiten.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cookie-Name inline setzen, um node:crypto-Import zu vermeiden
// (würde ansonsten in das Edge-Runtime-Bundle gezogen).
// MUSS identisch mit ADMIN_COOKIE in lib/server/adminSession.ts bleiben!
const ADMIN_COOKIE = 'admin_session';

export function middleware(request: NextRequest) {
  const hatCookie = request.cookies.has(ADMIN_COOKIE);
  if (!hatCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // /admin/* schützen, aber die Login-Seite selbst ausnehmen.
  matcher: ['/admin/((?!login).*)'],
};
