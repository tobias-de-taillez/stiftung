import { NextResponse } from 'next/server';
import { statistik } from '@/lib/server/einrichtungenService';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(serialisiere(await statistik()));
}
