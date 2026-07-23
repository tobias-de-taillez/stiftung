import { NextResponse } from 'next/server';
import { auszahlungslauf } from '@/lib/server/auszahlungsService';

export async function POST() {
  const ergebnis = await auszahlungslauf();
  // Leerer Lauf legt nichts an — 200, nicht 201.
  return NextResponse.json(ergebnis, { status: ergebnis.laufId ? 201 : 200 });
}
