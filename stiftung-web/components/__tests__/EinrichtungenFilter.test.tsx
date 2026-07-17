import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { EinrichtungenFilter } from '../EinrichtungenFilter';

const EINRICHTUNGEN = [
  { id: '1', slug: 'a', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, aktuellesKapital: 3000, zielKapital: 25000 },
  { id: '2', slug: 'b', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, aktuellesKapital: 50000, zielKapital: 250000 },
];

describe('EinrichtungenFilter', () => {
  it('zeigt alle Einrichtungen initial', () => {
    render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
    expect(screen.getByText('Tagespflege Wirbelwind')).toBeInTheDocument();
    expect(screen.getByText('Grundschule Sonnenhügel')).toBeInTheDocument();
  });

  it('filtert nach Typ', async () => {
    const user = userEvent.setup();
    render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
    await user.selectOptions(screen.getByLabelText(/Typ/i), 'schule');
    expect(screen.queryByText('Tagespflege Wirbelwind')).not.toBeInTheDocument();
    expect(screen.getByText('Grundschule Sonnenhügel')).toBeInTheDocument();
  });

  it('zeigt Empty-State, wenn Suche nichts findet', async () => {
    const user = userEvent.setup();
    render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
    await user.type(screen.getByLabelText(/Suche/i), 'xyz-gibt-es-nicht');
    expect(screen.getByText(/Keine Einrichtung gefunden/i)).toBeInTheDocument();
  });

  it('filtert per Suche nach Name oder Ort (trimmt Leerzeichen)', async () => {
    const user = userEvent.setup();
    render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
    await user.type(screen.getByLabelText(/Suche/i), ' wirbelwind ');
    expect(screen.getByText('Tagespflege Wirbelwind')).toBeInTheDocument();
    expect(screen.queryByText('Grundschule Sonnenhügel')).not.toBeInTheDocument();
  });

  // Task 36: Wachstums-Illustration steht klein neben dem Namen jeder Karte.
  describe('Wachstums-Illustration (Task 36)', () => {
    it('rendert genau eine Illustration pro Karte', () => {
      const { container } = render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      expect(container.querySelectorAll('[data-testid="wachstums-illustration"]')).toHaveLength(EINRICHTUNGEN.length);
    });

    it('zeigt den sichtbaren Zustandstext je Karte (beide Fixtures liegen bei Bronze: 12 %/20 %)', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      // Beide Fixture-Einrichtungen liegen zwischen 10 % und 25 % ihres
      // Zielkapitals (3.000/25.000 = 12 %, 50.000/250.000 = 20 %) — beide
      // zeigen daher denselben Bronze-Zustandstext, deshalb getAllByText
      // statt getByText.
      expect(screen.getAllByText('Wachstumsstufe: Keimling — Bronze erreicht')).toHaveLength(EINRICHTUNGEN.length);
    });
  });
});
