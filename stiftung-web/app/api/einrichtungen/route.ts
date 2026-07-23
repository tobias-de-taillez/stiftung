import { NextResponse } from 'next/server';
import { listEinrichtungenMitTopf } from '@/lib/server/uebersichtService';
import { spendeMitAnlage, UngueltigeZuwendungError } from '@/lib/server/spendenService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await listEinrichtungenMitTopf());
}

// Anlage bei Erstspende (Spec §3.0, Stufe 2): erst die Spende persistiert.
export async function POST(request: Request) {
  const body = await request.json();
  const betragCent = Number(body.betragCent);
  const kinderAnzahl = Number(body.kinderAnzahl);
  if (!Number.isSafeInteger(betragCent) || betragCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  if (!Number.isSafeInteger(kinderAnzahl) || kinderAnzahl < 1) {
    return NextResponse.json({ error: 'invalid_kinderanzahl' }, { status: 400 });
  }
  try {
    const ergebnis = await spendeMitAnlage(
      { name: String(body.name ?? ''), typ: String(body.typ ?? 'kita'), ort: String(body.ort ?? ''), kinderAnzahl },
      BigInt(betragCent)
    );
    return NextResponse.json(ergebnis, { status: 201 });
  } catch (err) {
    if (err instanceof UngueltigeZuwendungError) {
      return NextResponse.json({ error: 'invalid_anlage' }, { status: 400 });
    }
    throw err;
  }
}
