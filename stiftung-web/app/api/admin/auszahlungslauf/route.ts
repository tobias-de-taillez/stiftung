import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { auszahlungslauf } from '@/lib/server/auszahlungsService';

export async function POST(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  return NextResponse.json(await auszahlungslauf(), { status: 201 });
}
