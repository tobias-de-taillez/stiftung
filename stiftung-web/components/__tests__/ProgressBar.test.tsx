import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('setzt aria-valuenow/min/max korrekt und zeigt Label als Text', () => {
    render(<ProgressBar value={40000} max={2000000} label="40.000 € von 2.000.000 €" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '2000000');
    expect(bar).toHaveAttribute('aria-valuenow', '40000');
    expect(screen.getByText('40.000 € von 2.000.000 €')).toBeInTheDocument();
  });

  it('zeigt die gerundete Prozentzahl zusätzlich als Text', () => {
    render(<ProgressBar value={40000} max={2000000} label="40.000 € von 2.000.000 €" />);
    expect(screen.getByText('2 %')).toBeInTheDocument();
  });

  it('clamped aria-valuenow bei Überschreitung auf max, zeigt "Ziel erreicht" und färbt den Balken turquoise', () => {
    const { container } = render(
      <ProgressBar value={2500000} max={2000000} label="2.500.000 € von 2.000.000 €" />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2000000');
    expect(screen.getByText('100 % · Ziel erreicht')).toBeInTheDocument();
    expect(container.querySelector('.progress-bar-fill')).toHaveClass('is-complete');
  });

  it('zeigt bei genau erreichtem Ziel ebenfalls "Ziel erreicht" und die is-complete-Klasse', () => {
    const { container } = render(
      <ProgressBar value={2000000} max={2000000} label="2.000.000 € von 2.000.000 €" />
    );
    expect(screen.getByText('100 % · Ziel erreicht')).toBeInTheDocument();
    expect(container.querySelector('.progress-bar-fill')).toHaveClass('is-complete');
  });

  it('färbt den Balken NICHT turquoise, solange das Ziel nicht erreicht ist', () => {
    const { container } = render(
      <ProgressBar value={40000} max={2000000} label="40.000 € von 2.000.000 €" />
    );
    expect(container.querySelector('.progress-bar-fill')).not.toHaveClass('is-complete');
  });
});
