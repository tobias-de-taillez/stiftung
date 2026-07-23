import { NextResponse } from 'next/server';
import { spenden, EinrichtungNotFoundError, UngueltigerBetragError } from '@/lib/server/einrichtungenService';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const body = await request.json();
  const betrag = Number(body.betrag);
  const frequenz = body.frequenz === 'jaehrlich' ? 'jaehrlich' : 'einmalig';

  try {
    const result = await spenden(params.slug, betrag, frequenz);
    return NextResponse.json(serialisiere(result), { status: 201 });
  } catch (err) {
    if (err instanceof EinrichtungNotFoundError) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (err instanceof UngueltigerBetragError) {
      return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    }
    throw err;
  }
}
