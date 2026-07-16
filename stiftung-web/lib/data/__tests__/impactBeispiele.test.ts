import { describe, it, expect } from 'vitest';
import { impactBeispiel } from '../impactBeispiele';

describe('impactBeispiel', () => {
  describe('tagespflege', () => {
    it('gibt bei kleinen Jahresausschüttungen ein Spielzeug-Beispiel zurück', () => {
      expect(impactBeispiel('tagespflege', 0)).toMatch(/Spielzeug/i);
      expect(impactBeispiel('tagespflege', 1)).toMatch(/Spielzeug/i);
    });

    it('gibt ab der mittleren Stufe Bastelmaterial zurück', () => {
      expect(impactBeispiel('tagespflege', 5)).toMatch(/Bastelmaterial/i);
    });

    it('gibt ab der höchsten Stufe einen Ausflug zurück', () => {
      expect(impactBeispiel('tagespflege', 15)).toMatch(/Ausflug/i);
    });
  });

  describe('kita', () => {
    it('gibt bei kleinen Jahresausschüttungen eine Bücherkiste zurück', () => {
      expect(impactBeispiel('kita', 0)).toMatch(/Bücherkiste/i);
    });

    it('gibt ab der mittleren Stufe Musikinstrumente zurück', () => {
      expect(impactBeispiel('kita', 7)).toMatch(/Musikinstrumente/i);
    });

    it('gibt ab der höchsten Stufe eine Bewegungslandschaft zurück', () => {
      expect(impactBeispiel('kita', 16)).toMatch(/Bewegungslandschaft/i);
    });
  });

  describe('schule', () => {
    it('gibt bei kleinen Jahresausschüttungen Schulmaterial für eine Klasse zurück', () => {
      expect(impactBeispiel('schule', 0)).toMatch(/Schulmaterial/i);
    });

    it('gibt ab der mittleren Stufe einen Klassensatz Schulmaterial zurück', () => {
      expect(impactBeispiel('schule', 8)).toMatch(/Klassensatz/i);
    });

    it('gibt ab der höchsten Stufe einen Experimentierkasten zurück', () => {
      expect(impactBeispiel('schule', 18)).toMatch(/Experimentierkasten/i);
    });
  });

  it('bleibt bei negativen Jahresausschüttungen auf der niedrigsten Stufe (kein Absturz, kein negatives Beispiel)', () => {
    expect(impactBeispiel('tagespflege', -5)).toMatch(/Spielzeug/i);
  });

  it('alle drei Stufen liegen innerhalb des im Rechner erreichbaren Wertebereichs (Slider bis 2000 € × 1% = 20 €/Jahr)', () => {
    // Regressionsschutz: Stufen dürfen nicht so hoch liegen, dass der
    // Spendenrechner-Slider (max. 2000 €, einmalig × ANNUAL_PAYOUT_RATE = 20
    // €/Jahr) sie nie erreicht — sonst sieht niemand die gestaffelten
    // Beispiele in der UI.
    expect(impactBeispiel('kita', 20)).toMatch(/Bewegungslandschaft/i);
    expect(impactBeispiel('schule', 20)).toMatch(/Experimentierkasten/i);
  });

  it('fallback zu tagespflege bei unbekanntem Einrichtungstyp (keine Exception)', () => {
    // Defensiv: Prisma speichert 'typ' als generischen String. Falls ein neuer
    // Typ in die DB kommt, bevor die UI aktualisiert ist, sollte die Funktion
    // fallback auf das generischste Beispiel (tagespflege), statt abzustürzen.
    expect(impactBeispiel('unbekannter-typ', 0)).toBe('neues Spielzeug');
    expect(impactBeispiel('unbekannter-typ', 0.5)).toBe('neues Spielzeug');
  });
});
