import { NextResponse } from 'next/server';
import { pruefePasswort, erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) ?? {};
  if (typeof body.passwort !== 'string' || !pruefePasswort(body.passwort)) {
    return NextResponse.json({ error: 'falsches_passwort' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, erstelleSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    // kein maxAge → Session-Cookie, stirbt mit dem Browserfenster
  });
  return res;
}
