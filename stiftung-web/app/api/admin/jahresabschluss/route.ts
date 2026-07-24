import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { fuehreKaskadeAus } from '@/lib/server/kaskadeService';

export async function POST(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  return NextResponse.json(await fuehreKaskadeAus(), { status: 201 });
}
