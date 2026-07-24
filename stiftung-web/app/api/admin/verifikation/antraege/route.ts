import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { offeneAntraege } from '@/lib/server/verifikationsService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  return NextResponse.json(await offeneAntraege());
}
