import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from '../page';

describe('Landing Page', () => {
  it('zeigt die Mission und einen Spenden-CTA', () => {
    render(<Page />);
    expect(screen.getByText(/Bildung darf niemals vom Geldbeutel/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Einrichtung finden/i })).toHaveAttribute('href', '/einrichtungen');
  });

  it('zeigt sekundäre CTAs zu Statistik und Solidaritätsfonds', () => {
    render(<Page />);
    expect(screen.getByRole('link', { name: /Statistik ansehen/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });

  it('zeigt das Beispiel-Zielkapital von 2 Mio. € (20.000 € Ausschüttung / 1%)', () => {
    render(<Page />);
    expect(screen.getByText(/2\.000\.000,00\s*€/)).toBeInTheDocument();
  });
});
