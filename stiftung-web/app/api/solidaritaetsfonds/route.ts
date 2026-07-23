import { NextResponse } from 'next/server';
import { kontenLage } from '@/lib/server/kontenService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await kontenLage());
}
