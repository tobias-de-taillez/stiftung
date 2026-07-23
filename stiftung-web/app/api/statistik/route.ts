import { NextResponse } from 'next/server';
import { poolStatistik } from '@/lib/server/uebersichtService';

export const dynamic = 'force-dynamic';

export async function GET() {
  // poolStatistik() serialisiert bereits selbst (bigint -> number) — kein
  // doppeltes serialisiere() nötig.
  return NextResponse.json(await poolStatistik());
}
