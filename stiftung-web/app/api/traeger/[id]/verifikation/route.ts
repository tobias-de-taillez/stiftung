// Spielgeld-KYC (Spec §3.4/§3.5): "Zugang abgeholt" + Rechtsform/Gemeinnützigkeit am Träger.
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { setzeVerifikation } from '@/lib/server/lebenszyklusService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  if (typeof body.verifiziert !== 'boolean') {
    return NextResponse.json({ error: 'invalid_verifiziert' }, { status: 400 });
  }
  if (body.rechtsform !== undefined && !Object.hasOwn(RECHTSFORM_LABELS, body.rechtsform)) {
    return NextResponse.json({ error: 'invalid_rechtsform' }, { status: 400 });
  }
  try {
    await setzeVerifikation(params.id, {
      verifiziert: body.verifiziert,
      ...(body.gemeinnuetzig !== undefined ? { gemeinnuetzig: Boolean(body.gemeinnuetzig) } : {}),
      ...(body.rechtsform !== undefined ? { rechtsform: body.rechtsform as Rechtsform } : {}),
    });
  } catch (err) {
    // Unbekannte traegerId: Prisma wirft P2025 ("Record to update not found")
    // statt eines fachlichen Fehlers — hier explizit auf 404 gemappt statt den
    // Request unbehandelt mit 500 knallen zu lassen.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
