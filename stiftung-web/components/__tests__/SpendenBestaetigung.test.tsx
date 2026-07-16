import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpendenBestaetigung } from '../SpendenBestaetigung';

afterEach(() => {
  vi.unstubAllGlobals();
});

const props = {
  betrag: 50,
  frequenz: 'jaehrlich' as const,
  einrichtungName: 'Tagespflege Wirbelwind',
  neuesKapital: 3050,
  spendeId: 'spende-123',
};

describe('SpendenBestaetigung', () => {
  it('zeigt Betrag, Frequenz, neuen Kapitalstand und einen Spielgeld-Hinweis', () => {
    render(<SpendenBestaetigung {...props} />);
    // Anchored: formatEuro(3050) = "3.050,00 €" contains "50,00 €" as a
    // substring, so an unanchored regex would ambiguously match both the
    // betrag paragraph and the neuesKapital <strong> (multiple elements).
    expect(screen.getByText(/^50,00 €/)).toBeInTheDocument();
    expect(screen.getByText(/jährlich/i)).toBeInTheDocument();
    expect(screen.getByText(/3.050,00 €/)).toBeInTheDocument();
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
});
