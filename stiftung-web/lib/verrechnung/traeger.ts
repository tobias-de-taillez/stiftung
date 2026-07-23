// Abfluss-Weiche (Spec §3.5): Der Gemeinnützigkeitsstatus des RECHTSTRÄGERS
// entscheidet über den Auszahlungspfad — nicht der Einrichtungstyp.
export type Rechtsform =
  | 'verein'
  | 'ggmbh'
  | 'stiftung'
  | 'kirche'
  | 'kommune'
  | 'einzelunternehmen'
  | 'gewerblich'
  | 'unbekannt';

export type Auszahlungspfad = 'mittelweitergabe' | 'foerderguthaben';

/** Rechtsformen, die den Gemeinnützigkeitsstatus überhaupt halten können (Körperschaften). */
const KOERPERSCHAFTEN: ReadonlySet<Rechtsform> = new Set(['verein', 'ggmbh', 'stiftung', 'kirche']);

/**
 * Pfad 1 (Mittelweitergabe, § 58 Nr. 1 AO): steuerbegünstigte Körperschaft
 * oder juristische Person des öffentlichen Rechts. Alles andere: Pfad 2
 * (Förderguthaben, § 57 AO). Eine natürliche Person oder ein Gewerbebetrieb
 * kann den Status strukturell nicht erlangen — das Flag wird dort ignoriert.
 */
export function auszahlungspfad(t: { rechtsform: Rechtsform; gemeinnuetzig: boolean }): Auszahlungspfad {
  if (t.rechtsform === 'kommune') return 'mittelweitergabe';
  if (KOERPERSCHAFTEN.has(t.rechtsform) && t.gemeinnuetzig) return 'mittelweitergabe';
  return 'foerderguthaben';
}

export const RECHTSFORM_LABELS: Record<Rechtsform, string> = {
  verein: 'eingetragener Verein',
  ggmbh: 'gGmbH',
  stiftung: 'Stiftung',
  kirche: 'kirchliche Körperschaft',
  kommune: 'Kommune',
  einzelunternehmen: 'Kindertagespflege (Einzelunternehmen)',
  gewerblich: 'gewerblicher Träger',
  unbekannt: 'Träger noch nicht erfasst',
};
