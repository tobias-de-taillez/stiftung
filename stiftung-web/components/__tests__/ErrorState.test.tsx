import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('zeigt einen sichtbaren Fehlertext und einen Retry-Button', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState error={new Error('db down')} reset={reset} />);
    expect(screen.getByText(/schiefgelaufen/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /erneut versuchen/i }));
    expect(reset).toHaveBeenCalled();
  });

  it('zeigt ein optionales Label statt des Standardtexts', () => {
    render(<ErrorState error={new Error('x')} reset={() => {}} label="Statistik konnte nicht geladen werden." />);
    expect(screen.getByText('Statistik konnte nicht geladen werden.')).toBeInTheDocument();
  });
});
