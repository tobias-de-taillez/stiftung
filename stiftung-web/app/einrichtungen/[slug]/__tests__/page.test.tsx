import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import EinrichtungDetailPage from '../page';

// Diese Seite rendert SpendenRechner, das seit F3 useRouter() aus
// next/navigation aufruft (router.refresh() nach erfolgreicher Buchung) —
// ohne Mock würde bereits das reine Rendern hier fehlschlagen ("invariant
// expected app router to be mounted"). importActual erhält notFound()
// (von der Seite selbst genutzt) unverändert, statt es versehentlich zu
// undefined zu machen.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'detail-test-kita', name: 'Detail-Test-Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
});

describe('EinrichtungDetailPage', () => {
  it('zeigt Name, Ort, Fortschritt und einen QR-Code', async () => {
    const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
    render(jsx);
    expect(screen.getByText('Detail-Test-Kita')).toBeInTheDocument();
    expect(screen.getByText(/Teststadt/)).toBeInTheDocument();
    expect(screen.getByAltText(/QR-Code zu Detail-Test-Kita/i)).toBeInTheDocument();
  });

  it('wirft notFound für unbekannten slug', async () => {
    await expect(EinrichtungDetailPage({ params: { slug: 'gibt-es-nicht' } })).rejects.toThrow();
  });

  describe('Einrichtungs-Level (Task 30: Bronze–Diamant als Finanztopf-Zwischenziele)', () => {
    it('rendert die fünf Level-Marker auf dem Finanztopf-Balken', async () => {
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(container.querySelectorAll('.progress-bar-marker')).toHaveLength(5);
    });

    it('zeigt "Nächstes Ziel: Bronze — noch 4.000,00 €" unterhalb 10 % (1.000 von 50.000 €), ohne Aktuelles-Level-Zeile', async () => {
      // aktuellesKapital 1.000 / zielKapital 50.000 = 2 % → unter Bronze (10 %).
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText(/Nächstes Ziel: Bronze — noch 4\.000,00 €/)).toBeInTheDocument();
      expect(screen.queryByText(/Aktuelles Level/)).not.toBeInTheDocument();
    });

    // Task 36: Wachstums-Illustration neben dem Finanztopf-Balken — codiert
    // dieselbe Kennzahl (aktuellesKapital/zielKapital) wie levelMarker oben.
    it('zeigt die Wachstums-Illustration mit dem passenden Zustandstext (2 % → Stufe 0, Samen)', async () => {
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(container.querySelector('[data-testid="wachstums-illustration"]')).toHaveAttribute('data-stage', '0');
      expect(screen.getByText('Wachstumsstufe: Samen — noch kein Level erreicht')).toBeInTheDocument();
    });

    it('zeigt das aktuelle Level und das nächste Ziel bei 60 % des Zielkapitals (Gold, nächstes Platin)', async () => {
      await prisma.einrichtung.update({
        where: { slug: 'detail-test-kita' },
        data: { aktuellesKapital: 30000 },
      });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(screen.getByText(/Aktuelles Level: Gold/)).toBeInTheDocument();
      // Platin liegt bei 75 % von 50.000 € = 37.500 €, aktuell 30.000 € → fehlen 7.500 €.
      expect(screen.getByText(/Nächstes Ziel: Platin — noch 7\.500,00 €/)).toBeInTheDocument();
      // Wachstums-Illustration (Task 36) zeigt dasselbe Level als Stufe 3.
      expect(container.querySelector('[data-testid="wachstums-illustration"]')).toHaveAttribute('data-stage', '3');
    });

    it('zeigt bei Zielerreichung (100 %) das Diamant-Level ohne Nächstes-Ziel-Zeile', async () => {
      await prisma.einrichtung.update({
        where: { slug: 'detail-test-kita' },
        data: { aktuellesKapital: 50000 },
      });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(screen.getByText(/Aktuelles Level: Diamant/)).toBeInTheDocument();
      expect(screen.queryByText(/Nächstes Ziel/)).not.toBeInTheDocument();
      // Wachstums-Illustration (Task 36) zeigt Stufe 5 (Baum voller Früchte).
      expect(container.querySelector('[data-testid="wachstums-illustration"]')).toHaveAttribute('data-stage', '5');
    });
  });

  // Transparenz auf der Detailseite (Task 34): Förderung pro Kind,
  // Spendenhistorie mit explizitem Solidaritätsfonds-Label, Anzahl
  // Unterstützungen gesamt.
  describe('Transparenz (Task 34)', () => {
    it('zeigt Förderung pro Kind und Anzahl Unterstützungen ohne Spenden', async () => {
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      // aktuellesKapital 1.000 € / 10 Kinder = 100,00 €
      expect(screen.getByText(/Förderung pro Kind: 100,00\s*€/)).toBeInTheDocument();
      expect(screen.getByText(/Unterstützungen insgesamt: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Noch keine Spenden für diese Einrichtung/)).toBeInTheDocument();
    });

    it('zeigt Direktspenden in der Historie mit Betrag, ohne Solidaritäts-Label', async () => {
      const kita = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: 'detail-test-kita' } });
      await prisma.spende.create({
        data: { einrichtungId: kita.id, betrag: 75, frequenz: 'einmalig', quelle: 'direkt' },
      });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText(/Unterstützungen insgesamt: 1/)).toBeInTheDocument();
      expect(screen.getByText(/75,00\s*€/)).toBeInTheDocument();
      expect(screen.queryByText(/Solidaritätsfonds/)).not.toBeInTheDocument();
    });

    it('labelt Solidaritäts-Zuflüsse explizit "aus dem Solidaritätsfonds"', async () => {
      const kita = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: 'detail-test-kita' } });
      await prisma.spende.create({
        data: { einrichtungId: kita.id, betrag: 40, frequenz: 'einmalig', quelle: 'direkt' },
      });
      await prisma.spende.create({
        data: { einrichtungId: kita.id, betrag: 25, frequenz: 'einmalig', quelle: 'solidaritaet' },
      });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(screen.getByText(/Unterstützungen insgesamt: 2/)).toBeInTheDocument();
      expect(screen.getByText(/aus dem Solidaritätsfonds/)).toBeInTheDocument();
      // Text-Label ist Pflicht, die Farbe (turquoise via .positive) ist nur Zusatz.
      expect(container.querySelector('.positive')).toBeInTheDocument();
    });

    it('begrenzt die angezeigte Historie auf 10 Einträge', async () => {
      const kita = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: 'detail-test-kita' } });
      for (let i = 0; i < 12; i++) {
        await prisma.spende.create({
          data: { einrichtungId: kita.id, betrag: 1, frequenz: 'einmalig', quelle: 'direkt' },
        });
      }
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText(/Unterstützungen insgesamt: 12/)).toBeInTheDocument();
      expect(screen.getAllByText(/1,00\s*€/)).toHaveLength(10);
    });
  });
});
