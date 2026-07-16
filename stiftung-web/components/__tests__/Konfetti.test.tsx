import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Konfetti } from '../Konfetti';

describe('Konfetti', () => {
  it('rendert einen aria-hidden Partikel-Burst-Container mit mehreren Partikeln', () => {
    const { container } = render(<Konfetti />);
    const burst = container.querySelector('.konfetti-burst');

    expect(burst).toBeInTheDocument();
    expect(burst).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.konfetti-partikel').length).toBeGreaterThan(0);
  });
});
