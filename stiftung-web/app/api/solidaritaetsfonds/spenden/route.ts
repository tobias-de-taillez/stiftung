import { NextResponse } from 'next/server';
import { spendeAnSoli, UngueltigeZuwendungError } from '@/lib/server/spendenService';
import { leseJsonBody } from '@/lib/server/leseJsonBody';

export async function POST(request: Request) {
  const body = await leseJsonBody(request);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  const betragCent = Number(body.betragCent);
  if (!Number.isSafeInteger(betragCent) || betragCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  try {
    const ergebnis = await spendeAnSoli(BigInt(betragCent));
    return NextResponse.json(ergebnis, { status: 201 });
  } catch (err) {
    if (err instanceof UngueltigeZuwendungError) {
      return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    }
    throw err;
  }
}
