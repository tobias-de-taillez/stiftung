import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BarChart } from '../BarChart';

describe('BarChart', () => {
  it('zeigt beschriftete X- und Y-Achse', () => {
    render(
      <BarChart
        data={[{ label: 'Kita A', value: 100 }, { label: 'Kita B', value: 200 }]}
        xAxisLabel="Einrichtung"
        yAxisLabel="Förderung pro Kind (€)"
      />
    );
    expect(screen.getByText('Einrichtung')).toBeInTheDocument();
    expect(screen.getByText('Förderung pro Kind (€)')).toBeInTheDocument();
  });

  it('rendert einen Balken pro Datenpunkt', () => {
    const { container } = render(
      <BarChart
        data={[{ label: 'Kita A', value: 100 }, { label: 'Kita B', value: 200 }, { label: 'Kita C', value: 50 }]}
        xAxisLabel="Einrichtung"
        yAxisLabel="Förderung pro Kind (€)"
      />
    );
    expect(container.querySelectorAll('rect.bar').length).toBe(3);
  });
});
