import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedWidmung, seedKontenstand, createTestEinrichtung, createTestTraeger } from '@/lib/server/__tests__/testDb';
import EinrichtungDetailPage from '../page';

// Diese Seite rendert SpendenRechner (useRouter().refresh()) und TraegerPanel
// (useRouter().push() beim Schließen-Redirect) — ohne Mock würde bereits das
// reine Rendern hier fehlschlagen ("invariant expected app router to be
// mounted"). importActual erhält notFound() (von der Seite selbst genutzt)
// unverändert, statt es versehentlich zu undefined zu machen.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('EinrichtungDetailPage', () => {
  it('zeigt Name, Ort, Fortschritt und einen QR-Code', async () => {
    await seedKontenstand({ etfMarktwertCent: 100_000n });
    await createTestEinrichtung({
      slug: 'detail-test-kita',
      name: 'Detail-Test-Kita',
      ort: 'Teststadt',
      kinderAnzahl: 10,
      topfCent: 100_000n,
      zielKapitalCent: 5_000_000n,
    });

    const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
    render(jsx);
    expect(screen.getByText('Detail-Test-Kita')).toBeInTheDocument();
    expect(screen.getByText(/Teststadt/)).toBeInTheDocument();
    expect(screen.getByAltText(/QR-Code zu Detail-Test-Kita/i)).toBeInTheDocument();
  });

  it('wirft notFound für unbekannten slug', async () => {
    await expect(EinrichtungDetailPage({ params: { slug: 'gibt-es-nicht' } })).rejects.toThrow();
  });

  it('wirft notFound für eine geschlossene Einrichtung', async () => {
    await seedKontenstand({ etfMarktwertCent: 0n });
    await createTestEinrichtung({ slug: 'geschlossen-test', geschlossenAm: new Date() });
    await expect(EinrichtungDetailPage({ params: { slug: 'geschlossen-test' } })).rejects.toThrow();
  });

  describe('Einrichtungs-Level (Cent-Werte über einrichtungsLevel)', () => {
    it('rendert die fünf Level-Marker auf dem Finanztopf-Balken', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      const { container } = render(jsx);
      expect(container.querySelectorAll('.progress-bar-marker')).toHaveLength(5);
    });

    it('zeigt "Nächstes Ziel: Bronze — noch 4.000,00 €" unterhalb 10 % (1.000 € von 50.000 € Ziel)', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText(/Nächstes Ziel: Bronze — noch 4\.000,00 €/)).toBeInTheDocument();
      expect(screen.queryByText(/Aktuelles Level/)).not.toBeInTheDocument();
    });

    it('zeigt das aktuelle Level und das nächste Ziel bei 60 % des Zielkapitals (Gold, nächstes Platin)', async () => {
      await seedKontenstand({ etfMarktwertCent: 3_000_000n });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 3_000_000n, zielKapitalCent: 5_000_000n });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText(/Aktuelles Level: Gold/)).toBeInTheDocument();
      // Platin liegt bei 75 % von 50.000 € = 37.500 €, aktuell 30.000 € → fehlen 7.500 €.
      expect(screen.getByText(/Nächstes Ziel: Platin — noch 7\.500,00 €/)).toBeInTheDocument();
    });
  });

  describe('Transparenz (Buchungshistorie statt Spenden-Historie, Task 16)', () => {
    it('zeigt Förderung pro Kind und Anzahl Unterstützungen ohne Buchungen', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n });
      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      // 100.000 Cent Topf / 10 Kinder = 10.000 Cent = 100,00 €
      expect(screen.getByText(/Förderung pro Kind: 100,00\s*€/)).toBeInTheDocument();
      expect(screen.getByText(/Unterstützungen insgesamt: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Noch keine Spenden für diese Einrichtung/)).toBeInTheDocument();
    });

    it('labelt jeden Buchungstyp mit dem korrekten Klartext', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      const e = await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n });
      await prisma.buchung.create({ data: { typ: 'spende', betragCent: 5_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'erstbefuellung', betragCent: 1_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'kaskade_umverteilung', betragCent: 2_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'kaskade_direktspende', betragCent: 3_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'kaskade_abgabe', betragCent: 500n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'direktausschuettung_eingang', betragCent: 4_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'auszahlungslauf', betragCent: 4_000n, einrichtungId: e.id } });
      await prisma.buchung.create({ data: { typ: 'schliessung', betragCent: 0n, einrichtungId: e.id } });

      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);

      // Anchored an die " · label · " Trennzeichen der Zeile — sonst matcht
      // z. B. "Spende" auch die Überschrift "Spendenrechner" weiter oben.
      expect(screen.getByText(/· Spende ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Erstbefüllung aus dem Solidaritätsfonds ·/)).toBeInTheDocument();
      expect(screen.getByText(/· aus dem Solidaritätsfonds ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Direktförderung ausgezahlt ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Solidaritätsabgabe ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Direktspende \(wird ausgezahlt\) ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Auszahlung ·/)).toBeInTheDocument();
      expect(screen.getByText(/· Schließung ·/)).toBeInTheDocument();
    });
  });

  describe('TraegerPanel (Task 16)', () => {
    it('zeigt Trägername, Rechtsform-Label und den Verifikations-Chip eines verifizierten Trägers', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      const traeger = await createTestTraeger({ name: 'Träger Test e.V.', rechtsform: 'ggmbh', gemeinnuetzig: true, verifiziert: true });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n, traegerId: traeger.id });

      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.getByText('Träger Test e.V.')).toBeInTheDocument();
      expect(screen.getByText('gGmbH')).toBeInTheDocument();
      expect(screen.getByText(/Zugang abgeholt/)).toBeInTheDocument();
      expect(screen.getByText(/Der Auszahlungspfad hängt am Rechtsträger, nicht am Einrichtungstyp/)).toBeInTheDocument();
    });

    it('zeigt den §3.4-Hinweis, wenn der Träger nicht verifiziert ist', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      const traeger = await createTestTraeger({ verifiziert: false });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n, traegerId: traeger.id });

      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(
        screen.getByText(/erhält aber keine Umverteilung und keine Direktförderung, bis der Zugang abgeholt ist/)
      ).toBeInTheDocument();
    });

    it('zeigt keinen §3.4-Hinweis, wenn der Träger verifiziert ist', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      const traeger = await createTestTraeger({ verifiziert: true });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n, traegerId: traeger.id });

      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      expect(screen.queryByText(/erhält aber keine Umverteilung/)).not.toBeInTheDocument();
    });
  });

  describe('SpendenRechner-Verdrahtung (Task 16)', () => {
    it('reicht verifiziert und den aktuellen Widmungswortlaut an den Rechner weiter', async () => {
      await seedKontenstand({ etfMarktwertCent: 100_000n });
      const traeger = await createTestTraeger({ verifiziert: true });
      await createTestEinrichtung({ slug: 'detail-test-kita', kinderAnzahl: 10, topfCent: 100_000n, zielKapitalCent: 5_000_000n, traegerId: traeger.id });

      const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
      render(jsx);
      // Verifizierter Träger → Verwendungsart B ist im Rechner wählbar (nicht disabled).
      expect(screen.getByRole('radio', { name: /Direkt auszahlen/i })).not.toBeDisabled();
      expect(screen.getByText(/Ich bestimme, dass meine Zuwendung/)).toBeInTheDocument();
    });
  });
});
