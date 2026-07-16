import { NextResponse } from 'next/server';
import { verteileFonds } from '@/lib/server/solidaritaetsfondsService';

export async function POST() {
  return NextResponse.json(await verteileFonds());
}
