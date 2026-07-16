import { NextResponse } from 'next/server';
import { getEinrichtungBySlug } from '@/lib/server/einrichtungenService';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const e = await getEinrichtungBySlug(params.slug);
  if (!e) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(e);
}
