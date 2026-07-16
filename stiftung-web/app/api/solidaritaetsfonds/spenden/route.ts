import { NextResponse } from 'next/server';
import { spendeAnFonds } from '@/lib/server/solidaritaetsfondsService';
import { UngueltigerBetragError } from '@/lib/server/einrichtungenService';

export async function POST(request: Request) {
  const body = await request.json();
  const betrag = Number(body.betrag);
  try {
    const bestand = await spendeAnFonds(betrag);
    return NextResponse.json({ bestand }, { status: 201 });
  } catch (err) {
    if (err instanceof UngueltigerBetragError) {
      return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    }
    throw err;
  }
}
