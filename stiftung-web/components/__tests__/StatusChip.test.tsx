import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusChip } from '../StatusChip';

describe('StatusChip', () => {
  it('rendert Text mit passender Ton-Klasse', () => {
    render(<StatusChip tone="positive">Ziel erreicht</StatusChip>);
    expect(screen.getByText('Ziel erreicht').className).toContain('positive');
  });
});
