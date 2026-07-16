import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePathname } from 'next/navigation';
import { Nav } from '../Nav';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('Nav', () => {
  it('zeigt Links zu Startseite, Einrichtungen, Statistik und Solidaritätsfonds', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: /Startseite/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Einrichtungen/i })).toHaveAttribute('href', '/einrichtungen');
    expect(screen.getByRole('link', { name: /Statistik/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });

  it('markiert die aktive Route mit gefüllter Pille und aria-current="page"', () => {
    vi.mocked(usePathname).mockReturnValue('/einrichtungen');
    render(<Nav />);
    const aktiv = screen.getByRole('link', { name: /^Einrichtungen$/i });
    expect(aktiv).toHaveClass('pill-primary');
    expect(aktiv).toHaveAttribute('aria-current', 'page');

    const inaktiv = screen.getByRole('link', { name: /Statistik/i });
    expect(inaktiv).toHaveClass('pill-secondary');
    expect(inaktiv).not.toHaveAttribute('aria-current');
  });

  it('markiert die Startseite nur bei exaktem Pfad "/" als aktiv (kein Präfix-Treffer)', () => {
    vi.mocked(usePathname).mockReturnValue('/einrichtungen');
    render(<Nav />);
    const start = screen.getByRole('link', { name: /Startseite/i });
    expect(start).toHaveClass('pill-secondary');
    expect(start).not.toHaveAttribute('aria-current');
  });
});
