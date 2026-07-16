import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import Page from '../page';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
  // Zwei Einrichtungen mit eindeutig unterschiedlicher Förderung pro Kind,
  // damit stats.bottom5[0] (größter Förderbedarf) deterministisch ist.
  await prisma.einrichtung.create({
    data: { slug: 'landing-test-gut-gefoerdert', name: 'Gut geförderte Kita', typ: 'kita', ort: 'Musterstadt', kinderAnzahl: 10, aktuellesKapital: 10000, zielKapital: 50000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'landing-test-bedarf', name: 'Tagespflege mit Bedarf', typ: 'tagespflege', ort: 'Beispielstadt', kinderAnzahl: 10, aktuellesKapital: 100, zielKapital: 20000 },
  });
});

describe('Landing Page', () => {
  it('zeigt die Mission, Live-Zahlen und einen primären "Jetzt spenden"-CTA zur Einrichtung mit dem größten Förderbedarf', async () => {
    render(await Page());
    expect(screen.getByText(/Bildung darf niemals vom Geldbeutel/i)).toBeInTheDocument();

    const liveZahlen = screen.getByText(/Einrichtungen/, { selector: 'p' });
    expect(liveZahlen).toHaveTextContent('2 Einrichtungen');
    expect(liveZahlen).toHaveTextContent('20 Kinder');
    expect(liveZahlen).toHaveTextContent('10.100,00 €');

    const cta = screen.getByRole('link', { name: /Jetzt spenden/i });
    expect(cta).toHaveAttribute('href', '/einrichtungen/landing-test-bedarf');
    expect(cta).toHaveClass('pill-primary');
  });

  it('zeigt sekundäre CTAs zu Einrichtung finden, Statistik und Solidaritätsfonds', async () => {
    render(await Page());
    const einrichtungFinden = screen.getByRole('link', { name: /Einrichtung finden/i });
    expect(einrichtungFinden).toHaveAttribute('href', '/einrichtungen');
    expect(einrichtungFinden).toHaveClass('pill-secondary');
    expect(screen.getByRole('link', { name: /Statistik ansehen/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });

  it('zeigt das Beispiel-Zielkapital von 2 Mio. € (20.000 € Ausschüttung / 1%) in der "Wie das Modell funktioniert"-Sektion', async () => {
    render(await Page());
    expect(screen.getByText(/Wie das Modell funktioniert/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.000\.000,00\s*€/)).toBeInTheDocument();
  });
});
