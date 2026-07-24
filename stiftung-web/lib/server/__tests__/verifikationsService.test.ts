import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, createTestTraeger, createTestEinrichtung } from './testDb';
import {
  stelleAntrag, offeneAntraege, entscheideAntrag,
  BereitsVerifiziertError, AntragOffenError, AntragBereitsEntschiedenError, AntragNichtGefundenError, TraegerNichtGefundenError,
} from '../verifikationsService';

beforeEach(resetDb);

describe('verifikationsService', () => {
  it('stelleAntrag legt einen offenen Antrag an', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    const zeile = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(zeile.status).toBe('offen');
    expect(zeile.rechtsform).toBe('ggmbh');
  });

  it('lehnt Antrag für unbekannten Träger ab', async () => {
    await expect(stelleAntrag('gibt-es-nicht', { rechtsform: 'verein', gemeinnuetzig: true })).rejects.toThrow(TraegerNichtGefundenError);
  });

  it('lehnt Antrag ab, wenn der Träger bereits verifiziert ist', async () => {
    const t = await createTestTraeger({ verifiziert: true });
    await expect(stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true })).rejects.toThrow(BereitsVerifiziertError);
  });

  it('lehnt einen zweiten offenen Antrag ab', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await expect(stelleAntrag(t.id, { rechtsform: 'verein', gemeinnuetzig: false })).rejects.toThrow(AntragOffenError);
  });

  it('offeneAntraege listet nur offene, mit Träger und Einrichtungen', async () => {
    const t = await createTestTraeger({ verifiziert: false, name: 'Träger X' });
    await createTestEinrichtung({ slug: 'kita-x', name: 'Kita X', traegerId: t.id });
    await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    const liste = await offeneAntraege();
    expect(liste).toHaveLength(1);
    expect(liste[0].traegerName).toBe('Träger X');
    expect(liste[0].rechtsformLabel).toBe('gGmbH');
    expect(liste[0].einrichtungen.map((e) => e.slug)).toContain('kita-x');
  });

  it('Genehmigung verifiziert den Träger und übernimmt Rechtsform + gemeinnützig', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'genehmigt');
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(true);
    expect(traeger.rechtsform).toBe('ggmbh');
    expect(traeger.gemeinnuetzig).toBe(true);
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(antrag.status).toBe('genehmigt');
    expect(antrag.entschiedenAm).not.toBeNull();
  });

  it('Ablehnung ändert den Träger nicht', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt' });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'abgelehnt');
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(false);
    expect(traeger.rechtsform).toBe('unbekannt');
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(antrag.status).toBe('abgelehnt');
  });

  it('doppelte Entscheidung wirft', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'genehmigt');
    await expect(entscheideAntrag(antragId, 'abgelehnt')).rejects.toThrow(AntragBereitsEntschiedenError);
  });

  it('Entscheidung über unbekannten Antrag wirft', async () => {
    await expect(entscheideAntrag('gibt-es-nicht', 'genehmigt')).rejects.toThrow(AntragNichtGefundenError);
  });

  it('konkurrierende Doppelentscheidung: genau eine gewinnt, die andere wirft', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });

    const ergebnisse = await Promise.allSettled([
      entscheideAntrag(antragId, 'genehmigt'),
      entscheideAntrag(antragId, 'abgelehnt'),
    ]);
    // Welcher Aufruf gewinnt, ist Implementierungsdetail (SQLite serialisiert) —
    // geprüft wird nur: genau einer erfüllt, genau einer wirft BereitsEntschieden.
    const erfuellt = ergebnisse.filter((r) => r.status === 'fulfilled');
    const abgelehnt = ergebnisse.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(erfuellt).toHaveLength(1);
    expect(abgelehnt).toHaveLength(1);
    expect(abgelehnt[0].reason).toBeInstanceOf(AntragBereitsEntschiedenError);

    // Antrag endet in genau einem Entscheidungs-Status, konsistent zum Träger.
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(['genehmigt', 'abgelehnt']).toContain(antrag.status);
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(antrag.status === 'genehmigt');
  });
});
