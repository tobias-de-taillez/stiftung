import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TraegerPanel } from '../TraegerPanel';

// TraegerPanel selbst hat keine Hooks mehr — aber im unverifiziert-ohne-
// Antrag-Fall rendert es das echte VerifikationAntragForm, das intern
// useRouter() aufruft. Ohne Mock wirft das außerhalb eines echten
// App-Router-Baums.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const baseProps = {
  slug: 'test-kita',
  traegerId: 'traeger-1',
  traegerName: 'Testträger e.V.',
  rechtsformLabel: 'eingetragener Verein',
  auszahlungspfad: 'mittelweitergabe' as const,
};

describe('TraegerPanel — verifiziert', () => {
  it('zeigt den "Zugang abgeholt"-Chip, keinen Hinweis und kein Antragsformular', () => {
    render(<TraegerPanel {...baseProps} verifiziert offenerAntrag={false} />);
    expect(screen.getByText('Zugang abgeholt')).toBeInTheDocument();
    expect(screen.queryByTestId('unverifiziert-hinweis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('antrag-in-pruefung')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Antrag stellen/i })).not.toBeInTheDocument();
  });
});

describe('TraegerPanel — unverifiziert mit offenem Antrag', () => {
  it('zeigt den §3.4-Hinweis und "Antrag in Prüfung", aber kein Formular', () => {
    render(<TraegerPanel {...baseProps} verifiziert={false} offenerAntrag />);
    expect(screen.getByTestId('unverifiziert-hinweis')).toBeInTheDocument();
    expect(screen.getByText(/Antrag in Prüfung — ein Admin entscheidet\./)).toBeInTheDocument();
    expect(screen.queryByLabelText('Rechtsform')).not.toBeInTheDocument();
  });
});

describe('TraegerPanel — unverifiziert ohne offenen Antrag', () => {
  it('zeigt das Antragsformular (Rechtsform-Auswahl + gemeinnützig-Checkbox)', () => {
    render(<TraegerPanel {...baseProps} verifiziert={false} offenerAntrag={false} />);
    expect(screen.getByTestId('unverifiziert-hinweis')).toBeInTheDocument();
    expect(screen.queryByTestId('antrag-in-pruefung')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rechtsform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Antrag stellen/i })).toBeInTheDocument();
  });
});

describe('TraegerPanel — keine Lebenszyklus-Aktionen mehr', () => {
  it('rendert weder den "Zugang abholen (KYC simulieren)"-Toggle noch den "Einrichtung schließen"-Button', () => {
    render(<TraegerPanel {...baseProps} verifiziert={false} offenerAntrag={false} />);
    expect(screen.queryByRole('button', { name: /Zugang abholen \(KYC simulieren\)/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Einrichtung schließen/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/geht in den Solidaritätsfonds über/i)).not.toBeInTheDocument();
  });

  it('rendert den Schließen-Button auch im verifizierten Zustand nicht', () => {
    render(<TraegerPanel {...baseProps} verifiziert offenerAntrag={false} />);
    expect(screen.queryByRole('button', { name: /Einrichtung schließen/i })).not.toBeInTheDocument();
  });
});
