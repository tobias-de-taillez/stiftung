import { NextResponse } from 'next/server';
import { getFondsBestand } from '@/lib/server/solidaritaetsfondsService';

export async function GET() {
  return NextResponse.json({ bestand: await getFondsBestand() });
}
