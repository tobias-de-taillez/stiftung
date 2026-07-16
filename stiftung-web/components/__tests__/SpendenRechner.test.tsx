import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { SpendenRechner } from '../SpendenRechner';

const einrichtung = {
  id: '1',
  slug: 'tagesmutter-wirbelwind-muenchen',
  name: 'Tagespflege Wirbelwind',
  typ: 'tagespflege',
  ort: 'München',
  kinderAnzahl: 5,
  aktuellesKapital: 3000,
  zielKapital: 25000,
};

describe('SpendenRechner', () => {
  it('zeigt initial die Jahre bis zum Ziel ohne Spende', () => {
    render(<SpendenRechner einrichtung={einrichtung} />);
    expect(screen.getByText(/bis zum Ziel/i)).toBeInTheDocument();
  });

  it('aktualisiert die Berechnung, wenn der Spendenbetrag geändert wird', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const initialText = screen.getByTestId('years-result').textContent;
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');
    const updatedText = screen.getByTestId('years-result').textContent;
    expect(updatedText).not.toBe(initialText);
  });

  it('wechselt zwischen einmalig und jährlich', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const jaehrlichButton = screen.getByRole('button', { name: 'Jährlich' });
    await user.click(jaehrlichButton);
    expect(jaehrlichButton).toHaveAttribute('aria-pressed', 'true');
  });
});
