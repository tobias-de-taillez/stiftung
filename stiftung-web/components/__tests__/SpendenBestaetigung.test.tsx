import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpendenBestaetigung } from '../SpendenBestaetigung';

// useCountUp liest prefers-reduced-motion beim Mounten und läuft sonst über
// requestAnimationFrame — das würde die synchronen Assertions unten flaky
// machen. reduced-motion erzwingt den Sofort-Sprung auf den Zielwert
// (deterministisch, siehe lib/hooks/__tests__/useCountUp.test.ts).
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

const props = {
  betrag: 50,
  frequenz: 'jaehrlich' as const,
  einrichtungName: 'Tagespflege Wirbelwind',
  altesKapital: 3000,
  neuesKapital: 3050,
  zielKapital: 25000,
  spendeId: 'spende-123',
};

describe('SpendenBestaetigung', () => {
  it('zeigt Betrag, Frequenz, neuen Kapitalstand und einen Spielgeld-Hinweis', () => {
    render(<SpendenBestaetigung {...props} />);
    // Anchored: formatEuro(3050) = "3.050,00 €" taucht sowohl im
    // Vorher→Nachher-Text ("3.000,00 € → 3.050,00 €") als auch im
    // Kapitalstand-<strong> auf — nur die volle Anker-Regex trifft eindeutig
    // das <strong> (getNodeText fasst nur direkte Text-Kindknoten zusammen).
    expect(screen.getByText(/^50,00 €/)).toBeInTheDocument();
    expect(screen.getByText(/jährlich/i)).toBeInTheDocument();
    expect(screen.getByText(/^3\.050,00 €$/)).toBeInTheDocument();
    expect(screen.getByText(/Spielgeld/i)).toBeInTheDocument();
  });

  it('zeigt einen WhatsApp-Share-Link mit dem Spendentext', () => {
    render(<SpendenBestaetigung {...props} />);
    const link = screen.getByRole('link', { name: /WhatsApp/i });
    expect(link.getAttribute('href')).toContain('wa.me');
  });

  it('nutzt navigator.share, wenn verfügbar', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: shareMock });
    const user = userEvent.setup();
    render(<SpendenBestaetigung {...props} />);
    await user.click(screen.getByRole('button', { name: 'Teilen' }));
    expect(shareMock).toHaveBeenCalled();
  });

  it('zeigt eine Spendenquittung mit Beleg-Nummer nach Aufklappen', async () => {
    const user = userEvent.setup();
    render(<SpendenBestaetigung {...props} />);
    await user.click(screen.getByText(/Spendenquittung anzeigen/i));
    expect(screen.getByText(/spende-123/)).toBeInTheDocument();
    expect(screen.getByText(/Demo-Dokument/i)).toBeInTheDocument();
  });

  it('rendert den Geisterbalken mit korrekten Alt-/Neu-Werten und zeigt den Prozentzuwachs als Text', () => {
    const { container } = render(<SpendenBestaetigung {...props} />);
    const ghost = container.querySelector('.vorher-nachher-ghost') as HTMLElement;
    const fill = container.querySelector('.vorher-nachher-fill') as HTMLElement;

    expect(ghost).toBeInTheDocument();
    expect(fill).toBeInTheDocument();
    // altesKapital 3000 / zielKapital 25000 = 12 %; neuesKapital 3050 / 25000 = 12,2 %
    expect(ghost.style.width).toBe('12%');
    expect(fill.style.width).toBe('12.2%');

    expect(screen.getByText(/3\.000,00 € → 3\.050,00 €/)).toBeInTheDocument();
    // (3050 - 3000) / 3000 * 100 = 1,666...% → gerundet "1,7 %"
    expect(screen.getByText(/\+1,7 %/)).toBeInTheDocument();
  });

  it('zeigt den Spielgeld-Hinweis als letztes Element, als dezenten Text statt als Chip', () => {
    const { container } = render(<SpendenBestaetigung {...props} />);
    const sections = container.querySelectorAll('[data-testid]');
    const letztesElement = sections[sections.length - 1];

    expect(letztesElement).toHaveAttribute('data-testid', 'spielgeld-hinweis');
    expect(letztesElement.textContent).toMatch(/Spielgeld/i);
    expect(letztesElement.textContent).toMatch(/kein echtes Geld/i);
    expect(letztesElement.className).toContain('muted');
    // Kein StatusChip mehr (der rendert eine .status-Span)
    expect(container.querySelector('.status')).toBeNull();
  });
});
