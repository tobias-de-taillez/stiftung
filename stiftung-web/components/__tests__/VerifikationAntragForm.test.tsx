import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { VerifikationAntragForm } from '../VerifikationAntragForm';
import { RECHTSFORM_LABELS } from '@/lib/verrechnung/traeger';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe('VerifikationAntragForm — Rechtsform-Auswahl', () => {
  it('bietet alle Rechtsformen außer "unbekannt" als Option an', () => {
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);
    const select = screen.getByLabelText('Rechtsform') as HTMLSelectElement;
    const optionLabels = [...select.options].map((o) => o.text);

    for (const [value, label] of Object.entries(RECHTSFORM_LABELS)) {
      if (value === 'unbekannt') {
        expect(optionLabels).not.toContain(label);
      } else {
        expect(optionLabels).toContain(label);
      }
    }
  });
});

describe('VerifikationAntragForm — Antrag stellen (Erfolg)', () => {
  it('postet Rechtsform + gemeinnützig auf /api/traeger/[id]/verifikation/antrag und aktualisiert bei 201', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ antragId: 'a1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);

    await user.selectOptions(screen.getByLabelText('Rechtsform'), 'ggmbh');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Antrag stellen/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/traeger/traeger-1/verifikation/antrag',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
      })
    );
    expect(refresh).toHaveBeenCalled();
  });
});

describe('VerifikationAntragForm — Fehlbanner', () => {
  it('zeigt "Dieser Träger ist bereits verifiziert." bei 409 bereits_verifiziert', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'bereits_verifiziert' }) })
    );
    const user = userEvent.setup();
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);
    await user.click(screen.getByRole('button', { name: /Antrag stellen/i }));
    expect(await screen.findByText('Dieser Träger ist bereits verifiziert.')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('zeigt "Es läuft bereits ein Antrag." bei 409 antrag_offen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: 'antrag_offen' }) })
    );
    const user = userEvent.setup();
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);
    await user.click(screen.getByRole('button', { name: /Antrag stellen/i }));
    expect(await screen.findByText('Es läuft bereits ein Antrag.')).toBeInTheDocument();
  });

  it('zeigt einen Fehlertext bei 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'invalid_rechtsform' }) })
    );
    const user = userEvent.setup();
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);
    await user.click(screen.getByRole('button', { name: /Antrag stellen/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('zeigt einen generischen Fehlertext, wenn der Request selbst fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const user = userEvent.setup();
    render(<VerifikationAntragForm traegerId="traeger-1" slug="test-kita" />);
    await user.click(screen.getByRole('button', { name: /Antrag stellen/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('VerifikationAntragForm — kein Träger', () => {
  it('bietet ohne traegerId kein Formular an, sondern einen Hinweis', () => {
    render(<VerifikationAntragForm traegerId={null} slug="test-kita" />);
    expect(screen.queryByLabelText('Rechtsform')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Antrag stellen/i })).not.toBeInTheDocument();
    expect(screen.getByText(/noch kein Träger erfasst/i)).toBeInTheDocument();
  });
});
