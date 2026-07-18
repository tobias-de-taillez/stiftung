import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KennzahlHero } from '../KennzahlHero';

// useCountUp liest prefers-reduced-motion beim Mounten und läuft sonst über
// requestAnimationFrame — das würde die synchrone Assertion unten flaky
// machen. reduced-motion erzwingt den Sofort-Sprung auf den Zielwert (siehe
// components/__tests__/SpendenBestaetigung.test.tsx für dasselbe Muster).
function stubReducedMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

beforeEach(() => {
  stubReducedMotion();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KennzahlHero', () => {
  it('zeigt unter reduced-motion sofort den formatierten Zielwert (Gesamtkapital)', () => {
    render(<KennzahlHero gesamtKapital={614800} />);
    expect(screen.getByText(/614\.800,00\s*€/)).toBeInTheDocument();
  });

  it('rendert eine erklärende Eyebrow-Beschriftung', () => {
    render(<KennzahlHero gesamtKapital={1000} />);
    expect(screen.getByText(/Bildungskapital/i)).toBeInTheDocument();
  });
});
