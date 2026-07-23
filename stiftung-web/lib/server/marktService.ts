// Marktjahr-Simulation: Kurs, keine Buchungsregel. Beide ETF-Depots wachsen
// um MARKT_BRUTTO_RENDITE (kanonische Projektionsannahme: 7 % brutto, 1 %
// Ausschüttung via Kaskade, ~6 % netto). Töpfe werden NICHT geschrieben —
// ihr Euro-Wert entsteht beim Lesen (Spec §2). Die Kaskade bleibt ertragsblind.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, offeneDirektausschuettungenCent } from './kontenService';
import { anteilVon } from '@/lib/verrechnung/geld';
import { MARKT_BRUTTO_RENDITE_SATZ } from '@/lib/verrechnung/konstanten';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export async function simuliereMarktjahr() {
  return prisma.$transaction(async (tx) => {
    const k = await ensureKontenstand(tx);
    const deltaEinrichtung = anteilVon(k.etfMarktwertCent, MARKT_BRUTTO_RENDITE_SATZ);
    const deltaSoli = anteilVon(k.soliDepotCent, MARKT_BRUTTO_RENDITE_SATZ);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: k.etfMarktwertCent + deltaEinrichtung,
        soliDepotCent: k.soliDepotCent + deltaSoli,
      },
    });
    if (deltaEinrichtung !== 0n) {
      await buche(tx, { typ: 'kurs_einrichtungsdepot', betragCent: deltaEinrichtung });
    }
    if (deltaSoli !== 0n) {
      await buche(tx, { typ: 'kurs_soli', betragCent: deltaSoli });
    }
    const offene = await offeneDirektausschuettungenCent(tx);
    return serialisiere({
      einrichtungsDepotDeltaCent: deltaEinrichtung,
      soliDepotDeltaCent: deltaSoli,
      poolwertCent: k.etfMarktwertCent + deltaEinrichtung + k.verrechnungskontoCent - offene,
      soliFondsCent: k.soliDepotCent + deltaSoli + k.soliVerrechnungskontoCent,
    });
  });
}
