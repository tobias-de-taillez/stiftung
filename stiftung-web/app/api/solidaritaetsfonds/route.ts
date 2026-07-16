import { NextResponse } from 'next/server';
import { getFondsBestand } from '@/lib/server/solidaritaetsfondsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ bestand: await getFondsBestand() });
}
