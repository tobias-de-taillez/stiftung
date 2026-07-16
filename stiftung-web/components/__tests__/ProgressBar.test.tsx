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
});
