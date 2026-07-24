import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { auszahlungslauf } from '@/lib/server/auszahlungsService';

export async function POST(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  const ergebnis = await auszahlungslauf();
  // Leerer Lauf legt nichts an — 200, nicht 201.
  return NextResponse.json(ergebnis, { status: ergebnis.laufId ? 201 : 200 });
}
