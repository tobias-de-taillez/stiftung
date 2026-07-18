// Einrichtungstypen wie im Prisma-Schema/Seed genutzt ('typ'-Feld ist dort
// ein einfacher String, siehe prisma/schema.prisma). Kein zentraler Export
// dieses Unions client-seitig — wird hier lokal definiert.
export type EinrichtungTyp = 'tagespflege' | 'kita' | 'schule';

interface ImpactStufe {
  // Untergrenze der jährlichen Ausschüttung (in €), ab der dieses Beispiel gilt.
  abJahresausschuettung: number;
  beispiel: string;
}

// Stufen bewusst so gewählt, dass alle drei innerhalb des im Rechner
// erreichbaren Wertebereichs liegen: Slider bis 2.000 €, einmalig ×
// ANNUAL_PAYOUT_RATE (1 %) ergibt max. 20 €/Jahr. Läge die höchste Stufe
// darüber, sähe niemand die Staffelung beim Spielen mit dem Regler.
const IMPACT_STUFEN: Record<EinrichtungTyp, ImpactStufe[]> = {
  tagespflege: [
    { abJahresausschuettung: 0, beispiel: 'neues Spielzeug' },
    { abJahresausschuettung: 5, beispiel: 'Bastelmaterial für ein ganzes Jahr' },
    { abJahresausschuettung: 15, beispiel: 'einen Ausflug mit allen Kindern' },
  ],
  kita: [
    { abJahresausschuettung: 0, beispiel: 'eine neue Bücherkiste' },
    { abJahresausschuettung: 7, beispiel: 'Musikinstrumente für den Morgenkreis' },
    { abJahresausschuettung: 16, beispiel: 'eine Bewegungslandschaft für den Turnraum' },
  ],
  schule: [
    { abJahresausschuettung: 0, beispiel: 'Schulmaterial für eine Klasse' },
    { abJahresausschuettung: 8, beispiel: 'einen kompletten Klassensatz Schulmaterial' },
    { abJahresausschuettung: 18, beispiel: 'einen Experimentierkasten für den Sachunterricht' },
  ],
};

export function impactBeispiel(typ: string, jahresAusschuettung: number): string {
  const stufen = IMPACT_STUFEN[typ as EinrichtungTyp] ?? IMPACT_STUFEN.tagespflege;
  let ergebnis = stufen[0].beispiel;
  for (const stufe of stufen) {
    if (jahresAusschuettung >= stufe.abJahresausschuettung) {
      ergebnis = stufe.beispiel;
    }
  }
  return ergebnis;
}
