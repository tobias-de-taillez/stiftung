import { NextResponse } from 'next/server';
import { statistik } from '@/lib/server/einrichtungenService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await statistik());
}
