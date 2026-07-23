import { NextResponse } from 'next/server';
import { einrichtungDetail } from '@/lib/server/uebersichtService';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const detail = await einrichtungDetail(params.slug);
  if (!detail) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(detail);
}
