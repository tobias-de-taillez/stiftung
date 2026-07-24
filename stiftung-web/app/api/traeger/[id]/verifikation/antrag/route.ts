// Public: Einrichtung/Träger beantragt Verifikation (Design-Spec §6).
import { NextResponse } from 'next/server';
import { stelleAntrag, TraegerNichtGefundenError, BereitsVerifiziertError, AntragOffenError } from '@/lib/server/verifikationsService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => null)) ?? {};
  if (!Object.hasOwn(RECHTSFORM_LABELS, body.rechtsform) || body.rechtsform === 'unbekannt') {
    return NextResponse.json({ error: 'invalid_rechtsform' }, { status: 400 });
  }
  if (typeof body.gemeinnuetzig !== 'boolean') {
    return NextResponse.json({ error: 'invalid_gemeinnuetzig' }, { status: 400 });
  }
  try {
    const ergebnis = await stelleAntrag(params.id, { rechtsform: body.rechtsform as Rechtsform, gemeinnuetzig: body.gemeinnuetzig });
    return NextResponse.json(ergebnis, { status: 201 });
  } catch (err) {
    if (err instanceof TraegerNichtGefundenError) return NextResponse.json({ error: 'traeger_nicht_gefunden' }, { status: 404 });
    if (err instanceof BereitsVerifiziertError) return NextResponse.json({ error: 'bereits_verifiziert' }, { status: 409 });
    if (err instanceof AntragOffenError) return NextResponse.json({ error: 'antrag_offen' }, { status: 409 });
    throw err;
  }
}
