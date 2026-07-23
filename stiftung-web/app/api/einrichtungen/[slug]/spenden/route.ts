// Spendeneingang (Spec §3.1): Verwendungsart A (Vermögen) ist die
// Voreinstellung, B (Direkt) nur bei verifiziertem Träger buchbar.
import { NextResponse } from 'next/server';
import {
  spendeVermoegen,
  spendeDirekt,
  UngueltigeZuwendungError,
  EinrichtungNichtGefundenError,
  EinrichtungGeschlossenError,
  DirektNichtVerfuegbarError,
} from '@/lib/server/spendenService';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const body = await request.json();
  const betragCent = Number(body.betragCent);
  const verwendungsart = body.verwendungsart === 'direkt' ? 'direkt' : 'vermoegen';
  if (!Number.isSafeInteger(betragCent) || betragCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  try {
    const ergebnis =
      verwendungsart === 'direkt'
        ? await spendeDirekt(params.slug, BigInt(betragCent))
        : await spendeVermoegen(params.slug, BigInt(betragCent));
    return NextResponse.json({ verwendungsart, ...ergebnis }, { status: 201 });
  } catch (err) {
    if (err instanceof EinrichtungNichtGefundenError) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (err instanceof EinrichtungGeschlossenError) return NextResponse.json({ error: 'geschlossen' }, { status: 409 });
    if (err instanceof DirektNichtVerfuegbarError) return NextResponse.json({ error: 'direkt_nicht_verfuegbar' }, { status: 409 });
    if (err instanceof UngueltigeZuwendungError) return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    throw err;
  }
}
