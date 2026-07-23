// Spielgeld-KYC (Spec §3.4/§3.5): "Zugang abgeholt" + Rechtsform/Gemeinnützigkeit am Träger.
import { NextResponse } from 'next/server';
import { setzeVerifikation } from '@/lib/server/lebenszyklusService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  if (body.rechtsform !== undefined && !Object.hasOwn(RECHTSFORM_LABELS, body.rechtsform)) {
    return NextResponse.json({ error: 'invalid_rechtsform' }, { status: 400 });
  }
  await setzeVerifikation(params.id, {
    verifiziert: Boolean(body.verifiziert),
    ...(body.gemeinnuetzig !== undefined ? { gemeinnuetzig: Boolean(body.gemeinnuetzig) } : {}),
    ...(body.rechtsform !== undefined ? { rechtsform: body.rechtsform as Rechtsform } : {}),
  });
  return NextResponse.json({ ok: true });
}
