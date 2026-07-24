import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminLogin } from '../AdminLogin';

// router.push muss asserted werden — anders als beim refresh()-only-Muster
// in SolidaritaetsfondsPanel.test reicht ein Mock-Objekt aus dem
// Fabrik-Callback nicht: vi.hoisted hebt die Mocks vor den vi.mock-Import,
// sodass die Testdatei denselben vi.fn()-Instanzen zugreifen kann wie die
// Komponente.
const { pushMock, refreshMock } = vi.hoisted(() => ({ pushMock: vi.fn(), refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminLogin', () => {
  it('postet das Passwort und navigiert bei Erfolg zum Dashboard', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminLogin />);

    await user.type(screen.getByLabelText(/Passwort/i), 'geheim');
    await user.click(screen.getByRole('button', { name: /anmelden/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ passwort: 'geheim' }),
      })
    );
    expect(pushMock).toHaveBeenCalledWith('/admin');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('zeigt bei falschem Passwort (401) ein Fehlbanner und behält die Eingabe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const user = userEvent.setup();
    render(<AdminLogin />);

    const input = screen.getByLabelText(/Passwort/i);
    await user.type(input, 'falsch');
    await user.click(screen.getByRole('button', { name: /anmelden/i }));

    expect(await screen.findByText(/Anmeldung fehlgeschlagen/i)).toBeInTheDocument();
    expect(input).toHaveValue('falsch');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('zeigt ein Fehlbanner, wenn der Request selbst fehlschlägt (Netzwerkfehler)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const user = userEvent.setup();
    render(<AdminLogin />);

    await user.type(screen.getByLabelText(/Passwort/i), 'irgendwas');
    await user.click(screen.getByRole('button', { name: /anmelden/i }));

    expect(await screen.findByText(/Anmeldung fehlgeschlagen/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
