import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Nav } from '../Nav';

describe('Nav', () => {
  it('zeigt Links zu Startseite, Einrichtungen, Statistik und Solidaritätsfonds', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: /Startseite/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Einrichtungen/i })).toHaveAttribute('href', '/einrichtungen');
    expect(screen.getByRole('link', { name: /Statistik/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });
});
