import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminLogoutButton } from '../AdminLogoutButton';

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

describe('AdminLogoutButton', () => {
  it('leitet bei erfolgreichem Logout auf /admin/login weiter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminLogoutButton />);

    await user.click(screen.getByRole('button', { name: /Abmelden/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logout', expect.objectContaining({ method: 'POST' }));
    expect(pushMock).toHaveBeenCalledWith('/admin/login');
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.queryByText(/fehlgeschlagen/i)).not.toBeInTheDocument();
  });

  it('leitet bei fehlgeschlagenem Logout NICHT weiter und zeigt einen Fehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminLogoutButton />);

    await user.click(screen.getByRole('button', { name: /Abmelden/i }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Abmelden fehlgeschlagen/i)).toBeInTheDocument();
    // Button bleibt bedienbar für einen erneuten Versuch.
    expect(screen.getByRole('button', { name: /Abmelden/i })).not.toBeDisabled();
  });

  it('leitet auch bei Netzwerkfehler nicht weiter, sondern zeigt den Fehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const user = userEvent.setup();
    render(<AdminLogoutButton />);

    await user.click(screen.getByRole('button', { name: /Abmelden/i }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Abmelden fehlgeschlagen/i)).toBeInTheDocument();
  });
});
