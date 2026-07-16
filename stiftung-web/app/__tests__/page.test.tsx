import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from '../page';

describe('Landing Page', () => {
  it('zeigt die Mission und einen Spenden-CTA', () => {
    render(<Page />);
    expect(screen.getByText(/Bildung darf niemals vom Geldbeutel/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Einrichtung finden/i })).toHaveAttribute('href', '/einrichtungen');
  });
});
