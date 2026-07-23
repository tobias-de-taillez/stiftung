import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  KaskadenErgebnis,
  staggerInterval,
  PHASE1_MS,
  ABSCHLUSS_MS,
  VERTEILUNG_BUDGET_MS,
  type KaskadenErgebnisProps,
} from '../KaskadenErgebnis';

// Reduced-motion erzwingt den Sofort-Endzustand (siehe KaskadenErgebnis) —
// deterministisch, ohne fake timers. Gleiches Muster wie das alte
// ZeitrafferErgebnis (Task 32), hier eigenständig kopiert.
function stubReducedMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

beforeEach(() => {
  stubReducedMotion();
});

afterEach(() => vi.unstubAllGlobals());

// ============================================================
// Goldene §9-Zahlen (siehe lib/verrechnung/__tests__/kaskade.test.ts):
// Töpfe A 140 € (5 Kinder), B 150 € (4), C 125 € (5) nach Spendeneingang.
// Direktspende A 140c · B 150c · C 125c. Abgabe A 34c (p=0,24 → 0,24 %) ·
// B 150c (p=1 → 1 %) · C entfällt (p=0). Management +302c. Umverteilung
// A 129c · C 170c (B fehlt: 0). Fonds danach 29.583c.
// ============================================================
const goldeneKaskade: KaskadenErgebnisProps = {
  nummer: 1,
  poolwertCent: 41_500,
  soliFondsCent: 30_000,
  direktspenden: [
    { slug: 'a', name: 'Einrichtung A', cent: 140 },
    { slug: 'b', name: 'Einrichtung B', cent: 150 },
    { slug: 'c', name: 'Einrichtung C', cent: 125 },
  ],
  abgaben: [
    { slug: 'a', name: 'Einrichtung A', cent: 34, pPromille: 240, basisCent: 14_000 },
    { slug: 'b', name: 'Einrichtung B', cent: 150, pPromille: 1000, basisCent: 15_000 },
  ],
  managementBewegungCent: 302,
  umverteilung: [
    { slug: 'a', name: 'Einrichtung A', cent: 129 },
    { slug: 'c', name: 'Einrichtung C', cent: 170 },
  ],
  keineVerteilungGrund: null,
  endSoliFondsCent: 29_583,
  endManagementKontoCent: 100_302,
  meilensteine: [{ slug: 'a', name: 'Einrichtung A', labels: ['Bronze erreicht'] }],
};

describe('KaskadenErgebnis — goldenes Spec-§9-Beispiel', () => {
  it('zeigt den Snapshot (Poolwert, Fonds vor der Kaskade)', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByText(/Poolwert:\s*415,00\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Solidaritätsfonds vor der Kaskade:\s*300,00\s*€/)).toBeInTheDocument();
  });

  it('zeigt die Direktförderung je Einrichtung', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByText(/Einrichtung A:\s*1,40\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Einrichtung B:\s*1,50\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Einrichtung C:\s*1,25\s*€/)).toBeInTheDocument();
  });

  it('zeigt die Abgabe je Einrichtung mit dem Abgabesatz p × 1 %', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    // A: p = 0,24 (pPromille 240) → Satz 0,24 % von 140,00 € (Snapshot-Topf), Betrag 34 Cent.
    expect(screen.getByText(/Einrichtung A zahlt 0,24\s*% von 140,00\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/0,34\s*€/)).toBeInTheDocument();
    // B: p = 1 (pPromille 1000) → Satz 1 % von 150,00 € (Snapshot-Topf), Betrag 1,50 €.
    expect(screen.getByText(/Einrichtung B zahlt 1\s*% von 150,00\s*€/)).toBeInTheDocument();
    // C zahlt keine Abgabe (p = 0) und taucht daher nicht in der Abgaben-Liste auf.
    expect(screen.queryByText(/Einrichtung C zahlt/)).not.toBeInTheDocument();
  });

  it('zeigt die Management-Bewegung signiert mit neuem Kontostand', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByText(/\+3,02\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/1\.003,02\s*€/)).toBeInTheDocument();
    expect(screen.queryByText(/Rückfluss/)).not.toBeInTheDocument();
  });

  it('zeigt die Umverteilung je Einrichtung und den Fonds-Endstand', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByText(/Einrichtung A:\s*1,29\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Einrichtung C:\s*1,70\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/295,83\s*€/)).toBeInTheDocument();
  });

  it('zeigt Meilensteine mit Konfetti', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByTestId('konfetti')).toBeInTheDocument();
    expect(screen.getByText(/🎉 Bronze erreicht/)).toBeInTheDocument();
  });

  it('zeigt keinen Konfetti-Burst, wenn es keine Meilensteine gibt', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} meilensteine={[]} />);
    expect(screen.queryByTestId('konfetti')).not.toBeInTheDocument();
    expect(screen.getByText(/Keine Meilensteine/i)).toBeInTheDocument();
  });
});

describe('KaskadenErgebnis — Management-Rückfluss (Cap gesenkt)', () => {
  it('markiert eine negative Management-Bewegung als Rückfluss in den Fonds', () => {
    render(
      <KaskadenErgebnis
        {...goldeneKaskade}
        managementBewegungCent={-500}
        endManagementKontoCent={99_802}
      />
    );
    expect(screen.getByText(/Rückfluss in den Fonds/)).toBeInTheDocument();
    expect(screen.getByText(/-5,00\s*€/)).toBeInTheDocument();
  });
});

describe('KaskadenErgebnis — Sonderfälle Umverteilung (Spec §6)', () => {
  it('zeigt die Erfolgs-Karte "Verteilungsgleichheit erreicht" statt eines Fehlers', () => {
    render(
      <KaskadenErgebnis
        {...goldeneKaskade}
        abgaben={[]}
        umverteilung={[]}
        keineVerteilungGrund="alleGleich"
      />
    );
    expect(screen.getByText(/Verteilungsgleichheit erreicht/)).toBeInTheDocument();
    expect(screen.getByText(/nichts umzuverteilen/)).toBeInTheDocument();
    expect(screen.queryByText(/Fehler/i)).not.toBeInTheDocument();
  });

  it('zeigt einen nüchternen Hinweis bei zu wenigen Einrichtungen', () => {
    render(
      <KaskadenErgebnis
        {...goldeneKaskade}
        abgaben={[]}
        umverteilung={[]}
        keineVerteilungGrund="zuWenigEinrichtungen"
      />
    );
    expect(screen.getByText(/[Zz]u wenige Einrichtungen/)).toBeInTheDocument();
    expect(screen.queryByText(/Verteilungsgleichheit erreicht/)).not.toBeInTheDocument();
  });
});

describe('KaskadenErgebnis — reduced-motion Sofort-Endzustand', () => {
  it('zeigt alle sechs Sektionen sofort, ohne auf gestaffelte Timer zu warten', () => {
    render(<KaskadenErgebnis {...goldeneKaskade} />);
    expect(screen.getByTestId('kaskade-snapshot')).toBeInTheDocument();
    expect(screen.getByTestId('kaskade-direktfoerderung')).toBeInTheDocument();
    expect(screen.getByTestId('kaskade-abgaben')).toBeInTheDocument();
    expect(screen.getByTestId('kaskade-management')).toBeInTheDocument();
    expect(screen.getByTestId('kaskade-umverteilung')).toBeInTheDocument();
    expect(screen.getByTestId('kaskade-meilensteine')).toBeInTheDocument();
  });
});

// Duration-Invariante (übernommen aus der alten ZeitrafferErgebnis-Testdatei,
// Task 32): staggerInterval skaliert mit der Anzahl, um die Gesamtdauer
// strukturell ≤ 4 Sekunden zu halten. KaskadenErgebnis hat seine eigene Kopie
// dieser Funktion (ZeitrafferErgebnis verschwindet in Task 20).
describe('staggerInterval — Dauer-Struktur', () => {
  it('hält bei kleinen N (9) die volle 220ms bei, da 2400/9 > 220', () => {
    expect(staggerInterval(9)).toBe(220);
  });

  it('schrumpft bei großen N (50) auf ~48ms: 2400/50=48', () => {
    expect(staggerInterval(50)).toBe(48);
  });

  it('gibt 0 zurück für N ≤ 0', () => {
    expect(staggerInterval(0)).toBe(0);
    expect(staggerInterval(-1)).toBe(0);
  });

  it('garantiert Gesamtdauer ≤ 4000ms für alle kritischen N', () => {
    const testCases = [1, 9, 13, 50, 200];
    for (const n of testCases) {
      const stagger = staggerInterval(n);
      const totalMs = PHASE1_MS + n * stagger + ABSCHLUSS_MS;
      expect(totalMs).toBeLessThanOrEqual(4000);
    }
  });

  it('nutzt das volle VERTEILUNG_BUDGET_MS korrekt: stagger ≤ floor(2400/N)', () => {
    const testCases = [1, 2, 9, 13, 50, 100];
    for (const n of testCases) {
      const expected = Math.min(220, Math.floor(VERTEILUNG_BUDGET_MS / n));
      expect(staggerInterval(n)).toBe(expected);
    }
  });
});
