import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('zeigt einen sichtbaren Ladehinweis (role="status")', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent(/Lädt/i);
  });

  it('zeigt ein optionales Label statt des Standardtexts', () => {
    render(<LoadingState label="Einrichtungen werden geladen …" />);
    expect(screen.getByRole('status')).toHaveTextContent('Einrichtungen werden geladen …');
  });
});
