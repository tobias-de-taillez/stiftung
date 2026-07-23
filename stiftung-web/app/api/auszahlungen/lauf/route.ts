import { NextResponse } from 'next/server';
import { auszahlungslauf } from '@/lib/server/auszahlungsService';

export async function POST() {
  return NextResponse.json(await auszahlungslauf(), { status: 201 });
}
