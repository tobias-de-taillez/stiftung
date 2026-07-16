import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../Card';

describe('Card', () => {
  it('rendert Kinder innerhalb einer .card', () => {
    render(<Card>Inhalt</Card>);
    expect(screen.getByText('Inhalt').closest('.card')).not.toBeNull();
  });
});
