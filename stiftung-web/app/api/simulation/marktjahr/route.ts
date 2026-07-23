import { NextResponse } from 'next/server';
import { simuliereMarktjahr } from '@/lib/server/marktService';

export async function POST() {
  return NextResponse.json(await simuliereMarktjahr(), { status: 201 });
}
