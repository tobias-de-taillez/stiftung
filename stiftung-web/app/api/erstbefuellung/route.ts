// Stufe-1-Zusage (Spec §3.0): live aus dem Soli-Stand, bucht nichts.
import { NextResponse } from 'next/server';
import { erstbefuellungsZusageCent } from '@/lib/server/spendenService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const spendeCent = Number(new URL(request.url).searchParams.get('spendeCent'));
  if (!Number.isSafeInteger(spendeCent) || spendeCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  return NextResponse.json({ zusageCent: await erstbefuellungsZusageCent(BigInt(spendeCent)) });
}
