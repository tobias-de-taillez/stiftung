import { NextResponse } from 'next/server';
import { listEinrichtungen } from '@/lib/server/einrichtungenService';

export async function GET() {
  return NextResponse.json(await listEinrichtungen());
}
