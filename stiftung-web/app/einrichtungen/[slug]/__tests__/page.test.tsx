import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import EinrichtungDetailPage from '../page';

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
});
