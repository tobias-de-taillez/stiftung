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

// Cent-Fixtures bewusst so gewählt, dass sie die alten Euro-Fixtures
// (3000/3050/25000 → 12,0 %/12,2 %) exakt reproduzieren.
const props = {
  betragCent: 5_000,
  frequenz: 'jaehrlich' as const,
  verwendungsart: 'vermoegen' as const,
  einrichtungName: 'Tagespflege Wirbelwind',
  altesTopfwertCent: 300_000,
  neuesTopfwertCent: 305_000,
  zielKapitalCent: 2_500_000,
  zuwendungId: 'zuwendung-123',
  widmungWortlaut: null as string | null,
};

describe('SpendenBestaetigung', () => {
  it('zeigt Betrag, Frequenz, neuen Topfwert und einen Spielgeld-Hinweis', () => {
    render(<SpendenBestaetigung {...props} />);
    expect(screen.getByText(/^50,00 €/)).toBeInTheDocument();
    expect(screen.getByText(/jährlich/i)).toBeInTheDocument();
    expect(screen.getByText(/^3\.050,00 €$/)).toBeInTheDocument();
    expect(screen.getByText(/Spielgeld/i)).toBeInTheDocument();
  });

  it('zeigt einen WhatsApp-Share-Link, dessen Text die Wirkung statt nur die Transaktion erzählt (Ziel-Fortschritt-Delta)', () => {
    render(<SpendenBestaetigung {...props} />);
    const link = screen.getByRole('link', { name: /WhatsApp/i });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('wa.me');
    const decodedText = decodeURIComponent(href);
    expect(decodedText).toMatch(/12,0 %/);
    expect(decodedText).toMatch(/12,2 %/);
    expect(decodedText).toMatch(/Ziel/);
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
    expect(screen.getByText(/zuwendung-123/)).toBeInTheDocument();
    expect(screen.getByText(/Demo-Dokument/i)).toBeInTheDocument();
  });

  it('rendert den Geisterbalken mit korrekten Alt-/Neu-Werten und zeigt den Ziel-Fortschritt als Text', () => {
    const { container } = render(<SpendenBestaetigung {...props} />);
    const ghost = container.querySelector('.vorher-nachher-ghost') as HTMLElement;
    const fill = container.querySelector('.vorher-nachher-fill') as HTMLElement;

    expect(ghost).toBeInTheDocument();
    expect(fill).toBeInTheDocument();
    expect(ghost.style.width).toBe('12%');
    expect(fill.style.width).toBe('12.2%');

    expect(screen.getByText(/3\.000,00 € → 3\.050,00 €/)).toBeInTheDocument();
    expect(screen.getByText('Von 12,0 % auf 12,2 % des Ziels')).toBeInTheDocument();
  });

  it('zeigt bei großen Einrichtungen den echten Ziel-Fortschritt statt einer irreführenden Relativ-Prozentzahl (Regressionsschutz)', () => {
    render(<SpendenBestaetigung {...props} altesTopfwertCent={80_000} neuesTopfwertCent={85_000} zielKapitalCent={2_000_000} />);
    expect(screen.getByText('Von 4,0 % auf 4,3 % des Ziels')).toBeInTheDocument();
    expect(screen.queryByText(/^\+0,0 %$/)).not.toBeInTheDocument();
  });

  describe('Meilenstein-Banner', () => {
    it('rendert einen Meilenstein-Banner mit Konfetti, wenn meilensteine übergeben werden', () => {
      const { container } = render(<SpendenBestaetigung {...props} meilensteine={['Silber erreicht']} />);
      const banner = screen.getByTestId('meilenstein-banner');
      expect(banner).toHaveTextContent('Silber erreicht');
      expect(banner).toHaveTextContent('🎉');
      expect(container.querySelectorAll('.konfetti-burst').length).toBeGreaterThanOrEqual(1);
    });

    it('zeigt alle übergebenen Meilenstein-Labels', () => {
      render(<SpendenBestaetigung {...props} meilensteine={['Silber erreicht', 'Halbzeit: 50 % des Ziels']} />);
      const banner = screen.getByTestId('meilenstein-banner');
      expect(banner).toHaveTextContent('Silber erreicht');
      expect(banner).toHaveTextContent('Halbzeit: 50 % des Ziels');
    });

    it('rendert den Banner ÜBER dem Danke-Block', () => {
      const { container } = render(<SpendenBestaetigung {...props} meilensteine={['Silber erreicht']} />);
      const sections = Array.from(container.querySelectorAll('[data-testid]'));
      const bannerIndex = sections.findIndex((el) => el.getAttribute('data-testid') === 'meilenstein-banner');
      const dankeIndex = sections.findIndex((el) => el.getAttribute('data-testid') === 'konfetti-danke');
      expect(bannerIndex).toBeGreaterThanOrEqual(0);
      expect(bannerIndex).toBeLessThan(dankeIndex);
    });

    it('zeigt keinen Banner, wenn meilensteine leer oder nicht übergeben ist', () => {
      const { rerender } = render(<SpendenBestaetigung {...props} />);
      expect(screen.queryByTestId('meilenstein-banner')).not.toBeInTheDocument();

      rerender(<SpendenBestaetigung {...props} meilensteine={[]} />);
      expect(screen.queryByTestId('meilenstein-banner')).not.toBeInTheDocument();
    });
  });

  it('zeigt den Spielgeld-Hinweis als letztes Element, als dezenten Text statt als Chip', () => {
    const { container } = render(<SpendenBestaetigung {...props} />);
    const sections = container.querySelectorAll('[data-testid]');
    const letztesElement = sections[sections.length - 1];

    expect(letztesElement).toHaveAttribute('data-testid', 'spielgeld-hinweis');
    expect(letztesElement.textContent).toMatch(/Spielgeld/i);
    expect(letztesElement.textContent).toMatch(/kein echtes Geld/i);
    expect(letztesElement.className).toContain('muted');
    expect(container.querySelector('.status')).toBeNull();
  });

  describe('Widmung (Verwendungsart A, Spec §3.1)', () => {
    const widmungWortlaut = 'Ich bestimme, dass meine Zuwendung dem Vermögen dauerhaft zugeführt wird.';

    it('zeigt den Widmungswortlaut als Beleg-Zeile in der aufgeklappten Quittung', async () => {
      const user = userEvent.setup();
      render(<SpendenBestaetigung {...props} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByText(/Spendenquittung anzeigen/i));
      expect(screen.getByText(new RegExp(widmungWortlaut))).toBeInTheDocument();
    });

    it('zeigt keine Widmungs-Zeile, wenn widmungWortlaut null ist (Verwendungsart B)', async () => {
      const user = userEvent.setup();
      render(<SpendenBestaetigung {...props} verwendungsart="direkt" widmungWortlaut={null} />);
      await user.click(screen.getByText(/Spendenquittung anzeigen/i));
      expect(screen.queryByText(/Widmung:/)).not.toBeInTheDocument();
    });
  });

  describe('Verwendungsart B (Direktauszahlung, Spec §3.1)', () => {
    it('zeigt die Auszahlungs-Copy statt des Kapital-Sprungs', () => {
      render(<SpendenBestaetigung {...props} verwendungsart="direkt" widmungWortlaut={null} />);
      expect(
        screen.getByText(/Deine 50,00 € werden gesammelt und im nächsten Monatslauf an Tagespflege Wirbelwind ausgezahlt\./)
      ).toBeInTheDocument();
      expect(screen.queryByTestId('vorher-nachher')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kapitalstand')).not.toBeInTheDocument();
    });

    it('zeigt trotzdem Danke-Block und Spielgeld-Hinweis', () => {
      render(<SpendenBestaetigung {...props} verwendungsart="direkt" widmungWortlaut={null} />);
      expect(screen.getByText('Danke für deine Spende!')).toBeInTheDocument();
      expect(screen.getByText(/Spielgeld/i)).toBeInTheDocument();
    });
  });
});
