import { NextResponse } from 'next/server';
import { fuehreKaskadeAus } from '@/lib/server/kaskadeService';

export async function POST() {
  return NextResponse.json(await fuehreKaskadeAus(), { status: 201 });
}
