// Schließung (Spec §3.3): Fondsvolumen fließt an den Soli-Fonds zurück.
import { NextResponse } from 'next/server';
import { schliesseEinrichtung } from '@/lib/server/lebenszyklusService';
import { EinrichtungGeschlossenError, EinrichtungNichtGefundenError } from '@/lib/server/spendenService';

export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const ergebnis = await schliesseEinrichtung(params.slug);
    return NextResponse.json(ergebnis);
  } catch (err) {
    if (err instanceof EinrichtungNichtGefundenError) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (err instanceof EinrichtungGeschlossenError) {
      return NextResponse.json({ error: 'already_closed' }, { status: 409 });
    }
    throw err;
  }
}
