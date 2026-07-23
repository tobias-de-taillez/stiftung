import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import StatistikPage from '../page';

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Statistik-Seite', () => {
  it('zeigt Kopfzeile und Kennzahlen-Karten aus poolStatistik()', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000_00n });
    await createTestEinrichtung({ slug: 'a', name: 'Kita A', topfCent: 20_000_00n, kinderAnzahl: 4 });
    await createTestEinrichtung({ slug: 'b', name: 'Kita B', topfCent: 10_000_00n, kinderAnzahl: 6 });

    render(await StatistikPage());

    expect(screen.getByText(/2 Einrichtungen/)).toBeInTheDocument();
    expect(screen.getByText(/10 Kinder/)).toBeInTheDocument();
    expect(screen.getByText(/30\.000,00\s*€ Gesamtkapital/)).toBeInTheDocument();
    // Ø Volumen serverseitig gerundet: 30.000 / 2 = 15.000.
    expect(screen.getByText('15.000,00 €')).toBeInTheDocument();
    // Simulierter Jahresertrag nennt die Prozentzahl aus NET_GROWTH_RATE (6 %), kein zweites Literal.
    expect(screen.getByText(/Simulierter Jahresertrag \(6 %\)/)).toBeInTheDocument();
  });

  it('zeigt die Kaskadenlauf-Historie mit beschrifteten Spalten und dem "Verteilungsgleichheit"-Badge bei alleGleich', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    await prisma.kaskadenlauf.create({
      data: {
        nummer: 1,
        poolwertCent: 100_000n,
        soliFondsCent: 1_000n,
        direktspendenCent: 5_000n,
        abgabenCent: 500n,
        managementBewegungCent: 200n,
        umverteilungCent: 300n,
        keineVerteilungGrund: 'alleGleich',
      },
    });
    await prisma.kaskadenlauf.create({
      data: {
        nummer: 2,
        poolwertCent: 200_000n,
        soliFondsCent: 2_000n,
        direktspendenCent: 6_000n,
        abgabenCent: 600n,
        managementBewegungCent: 100n,
        umverteilungCent: 0n,
        keineVerteilungGrund: 'zuWenigEinrichtungen',
      },
    });

    render(await StatistikPage());

    expect(screen.getByText('Nr.')).toBeInTheDocument();
    expect(screen.getByText('Poolwert')).toBeInTheDocument();
    expect(screen.getByText('Direktförderung')).toBeInTheDocument();
    expect(screen.getByText('Abgaben')).toBeInTheDocument();
    expect(screen.getByText('Umverteilung')).toBeInTheDocument();
    expect(screen.getByText('Management-Bewegung')).toBeInTheDocument();
    expect(screen.getByText('1.000,00 €')).toBeInTheDocument(); // Poolwert Lauf 1
    expect(screen.getByText('2.000,00 €')).toBeInTheDocument(); // Poolwert Lauf 2

    // Nur der alleGleich-Lauf bekommt den positiven Badge.
    const badges = screen.getAllByText('Verteilungsgleichheit');
    expect(badges).toHaveLength(1);
  });

  it('zeigt den Empty-State ohne Kaskadenläufe', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_000n });
    render(await StatistikPage());
    expect(screen.getByText(/Noch keine Kaskadenläufe/)).toBeInTheDocument();
  });

  it('zeigt Top5/Bottom5 mit Cent-Feldern und einen beschrifteten BarChart', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000n });
    await createTestEinrichtung({ slug: 'reich', name: 'Reiche Kita', topfCent: 20_000n, kinderAnzahl: 1 });
    await createTestEinrichtung({ slug: 'arm', name: 'Arme Kita', topfCent: 10_000n, kinderAnzahl: 1 });

    render(await StatistikPage());

    // Bei nur zwei Einrichtungen tauchen beide sowohl in Top5 als auch in
    // Bottom5 auf (je eine <ol>) — deshalb zwei Treffer je Betrag. Der Betrag
    // steht im selben <span> wie "pro Kind" (ein Textknoten), daher Regex
    // statt exaktem String-Vergleich.
    expect(screen.getAllByText(/200,00\s*€\s*pro Kind/)).toHaveLength(2); // Förderung/Kind Reiche Kita
    expect(screen.getAllByText(/100,00\s*€\s*pro Kind/)).toHaveLength(2); // Förderung/Kind Arme Kita
    expect(screen.getByRole('img', { name: /Förderung pro Kind \(€\) nach Einrichtung/ })).toBeInTheDocument();
  });
});
