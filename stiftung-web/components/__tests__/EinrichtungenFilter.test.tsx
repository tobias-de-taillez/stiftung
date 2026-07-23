import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { EinrichtungenFilter } from '../EinrichtungenFilter';
import type { EinrichtungMitTopf } from '@/lib/server/uebersichtService';

const EINRICHTUNGEN: EinrichtungMitTopf[] = [
  {
    id: '1',
    slug: 'a',
    name: 'Tagespflege Wirbelwind',
    typ: 'tagespflege',
    ort: 'München',
    kinderAnzahl: 5,
    topfwertCent: 300000,
    zielKapitalCent: 2500000,
    foerderungProKindCent: 60000,
    verifiziert: true,
    auszahlungspfad: 'foerderguthaben',
    rechtsformLabel: 'Einzelunternehmen',
    traegerName: 'Wirbelwind e.K.',
    traegerId: 'traeger-1',
  },
  {
    id: '2',
    slug: 'b',
    name: 'Grundschule Sonnenhügel',
    typ: 'schule',
    ort: 'Berlin',
    kinderAnzahl: 250,
    topfwertCent: 5000000,
    zielKapitalCent: 25000000,
    foerderungProKindCent: 20000,
    verifiziert: false,
    auszahlungspfad: 'mittelweitergabe',
    rechtsformLabel: 'Eingetragener Verein',
    traegerName: 'Schulverein Sonnenhügel e.V.',
    traegerId: 'traeger-2',
  },
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

    it('zeigt das sichtbare Kurzlabel je Karte (beide Fixtures liegen bei Bronze: 12 %/20 %)', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      // Beide Fixture-Einrichtungen liegen zwischen 10 % und 25 % ihres
      // Zielkapitals (3.000/25.000 = 12 %, 50.000/250.000 = 20 %) — beide
      // zeigen daher dasselbe Kurzlabel "Keimling" (Design-Review Finding 1:
      // die kleine Kartenvariante zeigt nur noch den Stufennamen, nicht mehr
      // den vollen Zustandssatz), deshalb getAllByText statt getByText.
      expect(screen.getAllByText('Keimling')).toHaveLength(EINRICHTUNGEN.length);
    });
  });

  // Task 15: Topfwerte statt alter Kapital-Felder + neue Status-Chips.
  describe('Topfwerte und Status-Chips (Task 15)', () => {
    it('zeigt den ProgressBar-Fortschritt in Cent-korrekten Euro-Beträgen', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      expect(screen.getByText('3.000,00 € von 25.000,00 €')).toBeInTheDocument();
      expect(screen.getByText('50.000,00 € von 250.000,00 €')).toBeInTheDocument();
    });

    it('zeigt den Verifikationsstatus als Chip', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      expect(screen.getByText('Zugang abgeholt')).toBeInTheDocument();
      expect(screen.getByText('Zugang noch nicht abgeholt')).toBeInTheDocument();
    });

    it('zeigt den Auszahlungspfad als Chip', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      expect(screen.getByText('Förderguthaben (§ 57 AO)')).toBeInTheDocument();
      expect(screen.getByText('Mittelweitergabe (§ 58 AO)')).toBeInTheDocument();
    });

    it('zeigt eine Link-Kachel zum Anlegen einer neuen Einrichtung', () => {
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      const link = screen.getByRole('link', { name: /Deine Einrichtung fehlt/i });
      expect(link).toHaveAttribute('href', '/einrichtungen/neu');
      expect(link).toHaveTextContent(
        'Deine Einrichtung fehlt? Leg sie an — sobald du spendest, hilft der Solidaritätsfonds mit.'
      );
    });

    it('zeigt die Link-Kachel auch, wenn die Suche nichts findet', async () => {
      const user = userEvent.setup();
      render(<EinrichtungenFilter einrichtungen={EINRICHTUNGEN} />);
      await user.type(screen.getByLabelText(/Suche/i), 'xyz-gibt-es-nicht');
      expect(screen.getByRole('link', { name: /Deine Einrichtung fehlt/i })).toBeInTheDocument();
    });
  });
});
