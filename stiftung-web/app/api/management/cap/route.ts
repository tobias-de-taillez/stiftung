// Cap-Beschluss (Spec §8): muss vor dem Stichtagslauf feststehen.
import { NextResponse } from 'next/server';
import { setManagementCap, kontenLage } from '@/lib/server/kontenService';

export async function PUT(request: Request) {
  const body = await request.json();
  const capCent = Number(body.capCent);
  if (!Number.isSafeInteger(capCent) || capCent < 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }
  await setManagementCap(BigInt(capCent));
  return NextResponse.json(await kontenLage());
}
