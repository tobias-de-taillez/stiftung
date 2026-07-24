import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { entscheideAntrag, AntragNichtGefundenError, AntragBereitsEntschiedenError } from '@/lib/server/verifikationsService';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.entscheidung !== 'genehmigt' && body.entscheidung !== 'abgelehnt') {
    return NextResponse.json({ error: 'invalid_entscheidung' }, { status: 400 });
  }
  try {
    await entscheideAntrag(params.id, body.entscheidung);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AntragNichtGefundenError) return NextResponse.json({ error: 'antrag_nicht_gefunden' }, { status: 404 });
    if (err instanceof AntragBereitsEntschiedenError) return NextResponse.json({ error: 'bereits_entschieden' }, { status: 409 });
    throw err;
  }
}
