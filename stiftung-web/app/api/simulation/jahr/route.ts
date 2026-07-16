import { NextResponse } from 'next/server';
import { simuliereJahr } from '@/lib/server/simulationService';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(await simuliereJahr(), { status: 201 });
}
