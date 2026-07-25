// Verifikations-Antragsfluss (Design-Spec §6): Public stellt Antrag, Admin
// entscheidet. setzeVerifikation bleibt die einzige Stelle, die den
// Träger-Status schreibt — die Genehmigung ruft sie.
import { prisma } from './prismaClient';
import { setzeVerifikation } from './lebenszyklusService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export class TraegerNichtGefundenError extends Error {}
export class BereitsVerifiziertError extends Error {}
export class AntragOffenError extends Error {}
export class AntragNichtGefundenError extends Error {}
export class AntragBereitsEntschiedenError extends Error {}

export async function stelleAntrag(
  traegerId: string,
  daten: { rechtsform: Rechtsform; gemeinnuetzig: boolean }
): Promise<{ antragId: string }> {
  return prisma.$transaction(async (tx) => {
    const traeger = await tx.traeger.findUnique({ where: { id: traegerId } });
    if (!traeger) throw new TraegerNichtGefundenError(`Kein Träger ${traegerId}`);
    if (traeger.verifiziert) throw new BereitsVerifiziertError(`Träger ${traegerId} ist bereits verifiziert`);
    const offen = await tx.verifikationsAntrag.findFirst({ where: { traegerId, status: 'offen' } });
    if (offen) throw new AntragOffenError(`Träger ${traegerId} hat bereits einen offenen Antrag`);
    const antrag = await tx.verifikationsAntrag.create({
      data: { traegerId, rechtsform: daten.rechtsform, gemeinnuetzig: daten.gemeinnuetzig },
    });
    return { antragId: antrag.id };
  });
}

export async function offeneAntraege() {
  const antraege = await prisma.verifikationsAntrag.findMany({
    where: { status: 'offen' },
    orderBy: { createdAt: 'asc' },
    include: { traeger: { include: { einrichtungen: { select: { slug: true, name: true } } } } },
  });
  return serialisiere(
    antraege.map((a) => ({
      antragId: a.id,
      traegerId: a.traegerId,
      traegerName: a.traeger.name,
      einrichtungen: a.traeger.einrichtungen,
      rechtsform: a.rechtsform as Rechtsform,
      rechtsformLabel: RECHTSFORM_LABELS[a.rechtsform as Rechtsform] ?? a.rechtsform,
      gemeinnuetzig: a.gemeinnuetzig,
      createdAt: a.createdAt,
    }))
  );
}
export type OffenerAntrag = Awaited<ReturnType<typeof offeneAntraege>>[number];

export async function entscheideAntrag(antragId: string, entscheidung: 'genehmigt' | 'abgelehnt'): Promise<void> {
  // Atomarer Claim gegen Doppel-Entscheid bei Multi-Admin: nur wer den Antrag
  // von 'offen' auf die Entscheidung dreht (count === 1), fährt fort. Der
  // Verlierer eines Rennens bekommt count === 0 und wirft ohne Seiteneffekt.
  const { count } = await prisma.verifikationsAntrag.updateMany({
    where: { id: antragId, status: 'offen' },
    data: { status: entscheidung, entschiedenAm: new Date() },
  });
  if (count === 0) {
    // Kein offener Antrag beansprucht — unbekannt oder bereits entschieden.
    const vorhanden = await prisma.verifikationsAntrag.findUnique({ where: { id: antragId } });
    if (!vorhanden) throw new AntragNichtGefundenError(`Kein Antrag ${antragId}`);
    throw new AntragBereitsEntschiedenError(`Antrag ${antragId} ist ${vorhanden.status}`);
  }

  if (entscheidung === 'genehmigt') {
    // rechtsform/gemeinnuetzig/traegerId sind nach create() immutabel — das
    // Re-fetch nach dem Claim ist rennfrei. setzeVerifikation bleibt die einzige
    // Stelle, die den Träger-Status schreibt. Wirft sie hier (in dieser App kein
    // Träger-Lösch-Pfad, praktisch unerreichbar), bleibt der Antrag 'genehmigt'
    // ohne verifizierten Träger — bewusst akzeptiertes Fenster statt Transaction,
    // die setzeVerifikation als alleinige Schreibstelle aufbräche.
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    await setzeVerifikation(antrag.traegerId, {
      verifiziert: true,
      gemeinnuetzig: antrag.gemeinnuetzig,
      rechtsform: antrag.rechtsform as Rechtsform,
    });
  }
}
