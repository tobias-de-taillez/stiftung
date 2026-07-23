// Cap-Beschluss (Spec §8): muss vor dem Stichtagslauf feststehen.
import { NextResponse } from 'next/server';
import { setManagementCap, kontenLage } from '@/lib/server/kontenService';
import { leseJsonBody } from '@/lib/server/leseJsonBody';

export async function PUT(request: Request) {
  const body = await leseJsonBody(request);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  const capCent = Number(body.capCent);
  if (!Number.isSafeInteger(capCent) || capCent < 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }
  await setManagementCap(BigInt(capCent));
  return NextResponse.json(await kontenLage());
}
