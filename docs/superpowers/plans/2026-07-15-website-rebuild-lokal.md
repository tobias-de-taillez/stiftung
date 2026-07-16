# Website-Rebuild (lokale Version) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lokal lauffähige Next.js-Website für die Deutsche Bildungsstiftung — White-Label-Grundstruktur nach Leitbild Phase 1 (Tagespflege-Fokus, generisch für Kita/Schule erweiterbar). Frontend-Slider bleibt clientseitig simuliert, aber **Spenden werden real gegen eine laufende SQLite-Datenbank gebucht** (Spielgeld, kein echtes Geld) — inklusive eines echten, aktiv wirkenden **Solidaritäts-Umverteilungsmechanismus** (Kern des Leitbilds: "wer am wenigsten hat, wird am meisten gefördert"), QR-Code, Share-Button, Mock-Spendenquittung und erweiterter Statistik.

**Architektur:** Next.js 14 (App Router, TypeScript). Vier Schichten:
1. **Reine Berechnungslogik** (`lib/calc`) — Spendenrechner-Simulation (clientseitig) + Solidaritäts-Verteilungsformel (pure Funktionen, unit-getestet, DB-unabhängig).
2. **Backend** (`lib/server` + `app/api/**`) — Prisma-Client gegen SQLite-Datei, Service-Funktionen, API-Routes. Tests laufen gegen eine echte Test-SQLite-Datei (`prisma/test.db`), kein Mocking der DB-Schicht.
3. **UI** (`app/**`, `components/**`) — Design-Token-System adaptiert aus dem `hausstil`-Skill des `wealth`-Projekts, ohne die Weltraum-/Missions-Illustration.
4. **Solidaritätsfonds** — eigenständiges Backend-Modell + UI-Seite: allgemeine (nicht zweckgebundene) Spenden sammeln sich im Fonds, eine Verteilung bucht sie nach Bedarfs-Score real in die Finanztöpfe der am wenigsten geförderten Einrichtungen.

**Tech Stack:** Next.js 14 + TypeScript + App Router, Prisma + SQLite, Vitest + React Testing Library, `qrcode` (einzige neue Runtime-Dependency, für Offline-QR-Generierung), kein CSS-Framework, kein Chart-Paket (eigene SVG-Bar-Chart-Komponente).

## Global Constraints

- Lokale Version: kein echtes Payment, kein echtes Geld, kein Login/KYC — aber jede Buchung (direkte Spende UND Solidaritätsfonds-Verteilung) ist eine echte, persistierte DB-Transaktion.
- Finanzmodell exakt aus `projekt-status.md`: 7 % Brutto-Rendite, 1 % jährliche Ausschüttung, **6 % Netto-Wachstumsrate**. Formel: benötigtes Kapital = gewünschter Jahresbetrag / 0.01.
- **Solidaritätsprinzip ist aktiv, nicht nur sichtbar:** Der Solidaritätsfonds verteilt real nach Bedarfs-Score (Pro-Kind-Lücke zum Ziel) — Einrichtungen mit dem größten Rückstand bekommen proportional am meisten. Kein Geld bleibt ungenutzt liegen, solange irgendwo Bedarf besteht (bleibt der Bedarf bei 0, bleibt der Fonds-Bestand bewusst unangetastet, statt sinnlos verteilt zu werden).
- Design: Farbtokens/Radien/Typografie aus `docs/DESIGN.md` im `wealth`-Projekt (`/Users/tdetaillez/CodingInternal/wealth/docs/DESIGN.md`) übernehmen, aber **keine** Planet/Orbit/Satellit-Illustration, keine Mission-Terminologie. Nur visuelle Primitives.
- Farben ausschließlich als `var(--token)`, keine rohen Hex-Werte außerhalb des Token-Blocks in `globals.css` — **keine Ausnahme, auch nicht für den QR-Code-Hintergrund** (Task 18): dafür trägt der Token-Block ein eigenes `--qr-bg: #fff;` (Pre-Flight-Entscheidung, 2026-07-16). Gilt auch für rgba-Literale: Rahmen-/Nav-Transparenzen sind als `--border`, `--border-subtle`, `--nav-bg` tokenisiert (Entscheidung 2026-07-16, Task-2-Review).
- Eine Schriftfamilie: `Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif`.
- Jeder Chart hat beschriftete Achsen (keine Ausnahme).
- Jede Ansicht mit Daten braucht sichtbare Zustände: Loading, Empty, Populated, Error — **explizit auch Server-Component-Seiten, die aus der lokalen SQLite-DB laden** (`/einrichtungen`, `/einrichtungen/[slug]`, `/statistik`, `/solidaritaetsfonds`): jede bekommt ein `loading.tsx` und ein `error.tsx` nach Next.js-App-Router-Konvention, auch wenn der lokale DB-Read quasi instant ist (Pre-Flight-Entscheidung, 2026-07-16).
- `prefers-reduced-motion` deaktiviert Animationen; `:focus-visible` sichtbar (3px, `--focus`-Token).
- Backend-Tests laufen gegen eine echte SQLite-Datei (`prisma/test.db`), reset via `prisma db push --force-reset` vor jedem Testlauf (`pretest`-Skript) — keine In-Memory-Mocks der Datenbank-Schicht.
- Node.js ≥ 18, npm als Paketmanager.

---

## Datei-Übersicht

```
stiftung-web/
  package.json, tsconfig.json, next.config.mjs, vitest.config.ts, .env
  prisma/
    schema.prisma                       (Einrichtung, Spende, Solidaritaetsfonds, FondsSpende)
    seed.ts
  app/
    layout.tsx, globals.css, page.tsx
    einrichtungen/
      page.tsx
      [slug]/page.tsx                   (Detail + Rechner + QR-Code)
    statistik/page.tsx                  (erweitert: Ø-Volumen, Jahres-Zufluss, simulierter Ertrag)
    solidaritaetsfonds/page.tsx         (NEU)
    api/
      einrichtungen/route.ts
      einrichtungen/[slug]/route.ts
      einrichtungen/[slug]/spenden/route.ts
      statistik/route.ts
      solidaritaetsfonds/route.ts               (NEU, GET Bestand)
      solidaritaetsfonds/spenden/route.ts        (NEU, POST)
      solidaritaetsfonds/verteilen/route.ts      (NEU, POST)
  components/
    Nav.tsx (4 Links), Card.tsx, StatusChip.tsx, ProgressBar.tsx, BarChart.tsx
    EinrichtungenFilter.tsx, SpendenRechner.tsx, SpendenBestaetigung.tsx
    SolidaritaetsfondsPanel.tsx         (NEU)
    __tests__/
  lib/
    calc/
      spendenrechner.ts, format.ts
      solidaritaet.ts                   (NEU: bedarfProKind, verteilePool)
    data/levels.ts
    server/
      prismaClient.ts, einrichtungenService.ts
      solidaritaetsfondsService.ts      (NEU)
  README.md
```

---

### Task 1: Projekt-Scaffold (Next.js + TypeScript + Vitest)

**Files:**
- Create: `stiftung-web/package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`
- Create: `stiftung-web/app/layout.tsx`, `app/globals.css` (Platzhalter, Task 2 füllt), `app/page.tsx` (Platzhalter, Task 14 ersetzt)
- Create: `stiftung-web/.gitignore`

**Interfaces:**
- Produces: lauffähiges `npm run dev` (Port 3000) und `npm run test` (Vitest).

- [ ] **Step 1: Next.js-Grundgerüst erzeugen**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
npx create-next-app@14 stiftung-web --typescript --eslint --app --no-src-dir --import-alias "@/*" --no-tailwind --use-npm
```

- [ ] **Step 2: Vitest + React Testing Library installieren**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/stiftung-web"
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: `vitest.config.ts` anlegen**

```ts
// stiftung-web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 4: `vitest.setup.ts` anlegen**

```ts
// stiftung-web/vitest.setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Test-Script in `package.json` ergänzen**

```json
"test": "vitest run",
"test:watch": "vitest"
```

(`pretest` folgt in Task 9, sobald Prisma installiert ist.)

- [ ] **Step 6: Smoke-Test schreiben und verifizieren**

```ts
// stiftung-web/lib/__smoke__.test.ts
import { describe, it, expect } from 'vitest';

describe('Vitest-Setup', () => {
  it('läuft', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test`
Expected: `1 passed`. Danach Datei wieder löschen.

- [ ] **Step 7: Dev-Server verifizieren**

Run: `npm run dev`, `http://localhost:3000` öffnen.
Expected: Next.js-Default-Seite lädt ohne Fehler. Server stoppen.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web
git commit -m "chore: Next.js-Scaffold für lokale Website + Vitest-Setup"
```

---

### Task 2: Design-Tokens & globales CSS (Hausstil ohne Weltraum)

**Files:**
- Modify: `stiftung-web/app/globals.css`
- Modify: `stiftung-web/app/layout.tsx`

**Interfaces:**
- Produces: CSS-Variablen (`--space`, `--surface`, `--cream`, `--muted`, `--turquoise`, `--coral`, `--sun`, `--lavender`, `--ink`, `--focus`, `--qr-bg`, `--border`, `--border-subtle`, `--nav-bg`, `--radius`, `--shadow`), Klassen `.card`, `.pill`, `.status`, `.positive`, `.negative`, `.forecast`, `.muted`. `--qr-bg` ist bewusst der einzige feste Weißwert im Token-Block — QR-Codes brauchen echten Weiß-Kontrast unabhängig vom Theme (genutzt in Task 18). `--border`/`--border-subtle`/`--nav-bg` tokenisieren die früheren rgba-Literale (Entscheidung 2026-07-16, Task-2-Review: „Farben ausschließlich als var(--token)" gilt auch für rgba, nicht nur Hex).

- [ ] **Step 1: `globals.css` mit Tokens und Basis-Primitives schreiben**

```css
/* stiftung-web/app/globals.css */

:root {
  --space: #09132f;
  --space-2: #101d46;
  --surface: #17285a;
  --surface-2: #20366f;
  --cream: #fff3d2;
  --muted: #aebbe7;
  --turquoise: #5dd6c4;
  --coral: #f27791;
  --sun: #ffc857;
  --lavender: #8798e8;
  --ink: #101939;
  --focus: #fff;
  --qr-bg: #fff;
  --border: rgba(135, 152, 232, 0.35);
  --border-subtle: rgba(135, 152, 232, 0.25);
  --nav-bg: rgba(9, 19, 47, 0.75);

  --radius: 22px;
  --radius-sm: 14px;
  --shadow: 0 18px 48px rgba(2, 7, 25, 0.32);
}

* {
  box-sizing: border-box;
}

html,
body {
  padding: 0;
  margin: 0;
}

body {
  background: radial-gradient(circle at top, var(--space-2), var(--space));
  color: var(--cream);
  font-family: Inter, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.55;
}

a {
  color: inherit;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.hero-number {
  font-size: clamp(2.2rem, 5vw, 4.6rem);
  font-weight: 800;
  margin: 0;
}

.card {
  background: linear-gradient(145deg, var(--surface), var(--space-2));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.6rem 1.2rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pill-primary {
  background: var(--sun);
  color: var(--ink);
}

.pill-secondary {
  background: var(--surface-2);
  color: var(--cream);
  border: 1px solid var(--border);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--surface-2);
}

.positive { color: var(--turquoise); }
.negative { color: var(--coral); }
.forecast { color: var(--sun); }
.muted { color: var(--muted); }

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

@media (max-width: 800px) {
  .container {
    padding: 0 1rem;
  }
}

@media print {
  header {
    display: none;
  }
}
```

- [ ] **Step 2: `layout.tsx` auf Design-Basis + Nav-Platzhalter umstellen**

```tsx
// stiftung-web/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Deutsche Bildungsstiftung',
  description: 'Wir verwandeln jeden gespendeten Euro in dauerhaft arbeitendes Bildungskapital.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
```

(`components/Nav.tsx` entsteht in Task 3 — Build-Verifikation für `layout.tsx` erfolgt am Ende von Task 3.)

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/globals.css stiftung-web/app/layout.tsx
git commit -m "feat: Design-Tokens und Basis-Layout (Hausstil ohne Weltraum-Illustration)"
```

---

### Task 3: Navigation-Komponente

**Files:**
- Create: `stiftung-web/components/Nav.tsx`
- Test: `stiftung-web/components/__tests__/Nav.test.tsx`

**Interfaces:**
- Produces: `Nav(): JSX.Element`, Links zu `/`, `/einrichtungen`, `/statistik`, `/solidaritaetsfonds`.

- [ ] **Step 1: Failing Test schreiben**

```tsx
// stiftung-web/components/__tests__/Nav.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Nav } from '../Nav';

describe('Nav', () => {
  it('zeigt Links zu Startseite, Einrichtungen, Statistik und Solidaritätsfonds', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: /Startseite/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Einrichtungen/i })).toHaveAttribute('href', '/einrichtungen');
    expect(screen.getByRole('link', { name: /Statistik/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- Nav`
Expected: FAIL — `Cannot find module '../Nav'`.

- [ ] **Step 3: `Nav.tsx` implementieren**

```tsx
// stiftung-web/components/Nav.tsx
import Link from 'next/link';

export function Nav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <nav
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <Link href="/" className="eyebrow" style={{ color: 'var(--cream)' }}>
          Deutsche Bildungsstiftung
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/" className="pill pill-secondary">Startseite</Link>
          <Link href="/einrichtungen" className="pill pill-secondary">Einrichtungen</Link>
          <Link href="/statistik" className="pill pill-secondary">Statistik</Link>
          <Link href="/solidaritaetsfonds" className="pill pill-secondary">Solidaritätsfonds</Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- Nav`
Expected: PASS.

- [ ] **Step 5: Build verifizieren (schließt Task 2 ab)**

Run: `npm run dev`, `http://localhost:3000` öffnen.
Expected: Nav sichtbar, 4 Links, keine Konsolenfehler. Server stoppen.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/components/Nav.tsx stiftung-web/components/__tests__/Nav.test.tsx
git commit -m "feat: Navigation-Komponente mit vier Pillen-Links"
```

---

### Task 4: Basis-UI-Primitives (Card, ProgressBar, StatusChip, LoadingState, ErrorState)

**Files:**
- Create: `stiftung-web/components/Card.tsx`, `components/ProgressBar.tsx`, `components/StatusChip.tsx`, `components/LoadingState.tsx`, `components/ErrorState.tsx`
- Test: `stiftung-web/components/__tests__/Card.test.tsx`, `ProgressBar.test.tsx`, `StatusChip.test.tsx`, `LoadingState.test.tsx`, `ErrorState.test.tsx`

**Interfaces:**
- Produces:
  - `Card({ children, className? }): JSX.Element`
  - `ProgressBar({ value, max, label }): JSX.Element` — `role="progressbar"` mit `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, `label` sichtbar.
  - `StatusChip({ tone, children }): JSX.Element` — `tone: 'positive' | 'negative' | 'forecast' | 'muted'`.
  - `LoadingState({ label? }): JSX.Element` — sichtbarer Ladezustand für Server-Component-Seiten, die aus der DB laden; wiederverwendet in den `loading.tsx`-Dateien der Tasks 15/17/18/20.
  - `ErrorState({ error, reset, label? }): JSX.Element` — sichtbarer Fehlerzustand mit Retry-Button; `error: Error`, `reset: () => void` (Next.js-`error.tsx`-Konvention). Wiederverwendet in den `error.tsx`-Dateien der Tasks 15/17/18/20 — jede `error.tsx` bleibt eine eigene Datei (Next.js-Pflicht-Konvention pro Route-Segment), rendert aber nur `ErrorState`.

- [ ] **Step 1: Failing Tests schreiben**

```tsx
// stiftung-web/components/__tests__/Card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../Card';

describe('Card', () => {
  it('rendert Kinder innerhalb einer .card', () => {
    render(<Card>Inhalt</Card>);
    expect(screen.getByText('Inhalt').closest('.card')).not.toBeNull();
  });
});
```

```tsx
// stiftung-web/components/__tests__/ProgressBar.test.tsx
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
```

```tsx
// stiftung-web/components/__tests__/StatusChip.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusChip } from '../StatusChip';

describe('StatusChip', () => {
  it('rendert Text mit passender Ton-Klasse', () => {
    render(<StatusChip tone="positive">Ziel erreicht</StatusChip>);
    expect(screen.getByText('Ziel erreicht').className).toContain('positive');
  });
});
```

```tsx
// stiftung-web/components/__tests__/LoadingState.test.tsx
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
```

```tsx
// stiftung-web/components/__tests__/ErrorState.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('zeigt einen sichtbaren Fehlertext und einen Retry-Button', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState error={new Error('db down')} reset={reset} />);
    expect(screen.getByText(/schiefgelaufen/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /erneut versuchen/i }));
    expect(reset).toHaveBeenCalled();
  });

  it('zeigt ein optionales Label statt des Standardtexts', () => {
    render(<ErrorState error={new Error('x')} reset={() => {}} label="Statistik konnte nicht geladen werden." />);
    expect(screen.getByText('Statistik konnte nicht geladen werden.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Tests ausführen, Fehlschlag verifizieren**

Run: `npm run test -- Card ProgressBar StatusChip LoadingState ErrorState`
Expected: FAIL — Module nicht gefunden.

- [ ] **Step 3: Komponenten implementieren**

```tsx
// stiftung-web/components/Card.tsx
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}
```

```tsx
// stiftung-web/components/ProgressBar.tsx
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '14px', overflow: 'hidden' }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sun)', borderRadius: '999px' }} />
      </div>
      <p className="muted" style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>{label}</p>
    </div>
  );
}
```

```tsx
// stiftung-web/components/StatusChip.tsx
export function StatusChip({ tone, children }: { tone: 'positive' | 'negative' | 'forecast' | 'muted'; children: React.ReactNode }) {
  return <span className={`status ${tone}`}>{children}</span>;
}
```

```tsx
// stiftung-web/components/LoadingState.tsx
export function LoadingState({ label = 'Lädt …' }: { label?: string }) {
  return (
    <p role="status" className="muted" style={{ padding: '2rem 0' }}>
      {label}
    </p>
  );
}
```

```tsx
// stiftung-web/components/ErrorState.tsx
'use client';

export function ErrorState({
  error,
  reset,
  label = 'Etwas ist beim Laden schiefgelaufen.',
}: {
  error: Error;
  reset: () => void;
  label?: string;
}) {
  return (
    <div style={{ padding: '2rem 0' }} role="alert">
      <p className="negative">{label}</p>
      <p className="muted" style={{ fontSize: '0.8rem' }}>{error.message}</p>
      <button type="button" className="pill pill-secondary" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Tests erneut ausführen**

Run: `npm run test -- Card ProgressBar StatusChip LoadingState ErrorState`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/components/Card.tsx stiftung-web/components/ProgressBar.tsx stiftung-web/components/StatusChip.tsx stiftung-web/components/LoadingState.tsx stiftung-web/components/ErrorState.tsx stiftung-web/components/__tests__
git commit -m "feat: Basis-UI-Primitives (Card, ProgressBar, StatusChip, LoadingState, ErrorState)"
```

---

### Task 5: Formatierungs-Helfer (Währung, Dauer)

**Files:**
- Create: `stiftung-web/lib/calc/format.ts`
- Test: `stiftung-web/lib/calc/__tests__/format.test.ts`

**Interfaces:**
- Produces: `formatEuro(value: number): string`, `formatDuration(years: number): string`.

- [ ] **Step 1: Failing Test schreiben**

```ts
// stiftung-web/lib/calc/__tests__/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatEuro, formatDuration } from '../format';

describe('formatEuro', () => {
  it('formatiert mit deutschem Format und Euro-Zeichen', () => {
    expect(formatEuro(1234.5)).toBe('1.234,50 €');
  });
  it('rundet auf zwei Nachkommastellen', () => {
    expect(formatEuro(40000)).toBe('40.000,00 €');
  });
});

describe('formatDuration', () => {
  it('zeigt Jahre und Monate', () => {
    expect(formatDuration(2.25)).toBe('2 Jahre und 3 Monate');
  });
  it('zeigt nur Monate bei unter einem Jahr', () => {
    expect(formatDuration(0.5)).toBe('6 Monate');
  });
  it('zeigt nur Jahre bei vollen Jahren', () => {
    expect(formatDuration(5)).toBe('5 Jahre');
  });
  it('meldet Infinity als nicht erreichbar', () => {
    expect(formatDuration(Infinity)).toBe('nicht erreichbar');
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- format`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `format.ts` implementieren**

```ts
// stiftung-web/lib/calc/format.ts
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDuration(years: number): string {
  if (!isFinite(years)) return 'nicht erreichbar';
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} Monate`;
  if (m === 0) return `${y} Jahre`;
  return `${y} Jahre und ${m} Monate`;
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- format`
Expected: PASS. (Falls `Intl.NumberFormat` ein geschütztes Leerzeichen statt normalem liefert: `console.log(formatEuro(1234.5))` einmal prüfen und exakten Output in allen Tests dieses Plans konsistent übernehmen — betrifft dann auch die Assertions in späteren Tasks.)

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/calc/format.ts stiftung-web/lib/calc/__tests__/format.test.ts
git commit -m "feat: Formatierungs-Helfer für Euro-Beträge und Zeitdauern"
```

---

### Task 6: Spendenrechner-Simulationslogik (clientseitig, pure Funktionen)

**Files:**
- Create: `stiftung-web/lib/calc/spendenrechner.ts`
- Test: `stiftung-web/lib/calc/__tests__/spendenrechner.test.ts`

**Interfaces:**
- Produces: `NET_GROWTH_RATE = 0.06`, `capitalForAnnualPayout(annualPayout: number): number`, `computeYearsToGoal(input: { startCapital: number; targetCapital: number; donation: number; frequency: 'einmalig' | 'jaehrlich'; netRate?: number }): number`.

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/calc/__tests__/spendenrechner.test.ts
import { describe, it, expect } from 'vitest';
import { NET_GROWTH_RATE, capitalForAnnualPayout, computeYearsToGoal } from '../spendenrechner';

describe('capitalForAnnualPayout', () => {
  it('berechnet benötigtes Kapital für gewünschte Jahresausschüttung (1%)', () => {
    expect(capitalForAnnualPayout(20000)).toBe(2000000);
  });
});

describe('computeYearsToGoal', () => {
  it('liefert 0 Jahre, wenn Startkapital bereits über dem Ziel liegt', () => {
    expect(computeYearsToGoal({ startCapital: 3000000, targetCapital: 2000000, donation: 0, frequency: 'einmalig' })).toBe(0);
  });

  it('berechnet Jahre bis Ziel ohne Spende (reines Wachstum)', () => {
    const years = computeYearsToGoal({ startCapital: 50000, targetCapital: 100000, donation: 0, frequency: 'einmalig' });
    expect(years).toBeCloseTo(11.9, 1);
  });

  it('einmalige Spende reduziert die Jahre bis zum Ziel', () => {
    const ohne = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 0, frequency: 'einmalig' });
    const mit = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'einmalig' });
    expect(mit).toBeLessThan(ohne);
  });

  it('jährliche Spende reduziert die Jahre stärker als einmalige gleicher Höhe', () => {
    const einmalig = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'einmalig' });
    const jaehrlich = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'jaehrlich' });
    expect(jaehrlich).toBeLessThan(einmalig);
  });

  it('verwendet die Netto-Wachstumsrate von 6% als Default', () => {
    expect(NET_GROWTH_RATE).toBe(0.06);
  });

  it('gibt Infinity zurück, wenn das Ziel im Simulationszeitraum nicht erreichbar ist', () => {
    const years = computeYearsToGoal({ startCapital: 0, targetCapital: 1_000_000_000_000, donation: 0, frequency: 'jaehrlich' });
    expect(years).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- spendenrechner`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `spendenrechner.ts` implementieren**

```ts
// stiftung-web/lib/calc/spendenrechner.ts

// Finanzmodell aus projekt-status.md: 7% Brutto-Rendite, 1% jährliche
// Ausschüttung, 6% Netto-Wachstumsrate.
export const NET_GROWTH_RATE = 0.06;
const ANNUAL_PAYOUT_RATE = 0.01;

export function capitalForAnnualPayout(annualPayout: number): number {
  return annualPayout / ANNUAL_PAYOUT_RATE;
}

function yearsToTargetWithoutRecurringDonation(startCapital: number, targetCapital: number, rate: number): number {
  if (startCapital >= targetCapital) return 0;
  if (startCapital <= 0) return Infinity;
  return Math.log(targetCapital / startCapital) / Math.log(1 + rate);
}

// Future Value einer gewöhnlichen Rente: FV = PV*(1+i)^n + PMT*((1+i)^n - 1)/i
function futureValueWithAnnualDonation(startCapital: number, donation: number, rate: number, years: number): number {
  const growthFactor = Math.pow(1 + rate, years);
  const capitalPart = startCapital * growthFactor;
  const donationPart = donation > 0 ? donation * ((growthFactor - 1) / rate) : 0;
  return capitalPart + donationPart;
}

export function computeYearsToGoal(input: {
  startCapital: number;
  targetCapital: number;
  donation: number;
  frequency: 'einmalig' | 'jaehrlich';
  netRate?: number;
}): number {
  const { startCapital, targetCapital, donation, frequency, netRate = NET_GROWTH_RATE } = input;

  if (startCapital >= targetCapital) return 0;

  if (frequency === 'einmalig') {
    return yearsToTargetWithoutRecurringDonation(startCapital + donation, targetCapital, netRate);
  }

  const MAX_YEARS = 500;
  if (futureValueWithAnnualDonation(startCapital, donation, netRate, MAX_YEARS) < targetCapital) {
    return Infinity;
  }

  let lo = 0;
  let hi = MAX_YEARS;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fv = futureValueWithAnnualDonation(startCapital, donation, netRate, mid);
    if (fv < targetCapital) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- spendenrechner`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/calc/spendenrechner.ts stiftung-web/lib/calc/__tests__/spendenrechner.test.ts
git commit -m "feat: Spendenrechner-Simulationslogik (6% Netto-Wachstum, Bisektion für jährliche Spenden)"
```

---

### Task 7: Level-Definitionen (Gamification-Stufen)

**Files:**
- Create: `stiftung-web/lib/data/levels.ts`
- Test: `stiftung-web/lib/data/__tests__/levels.test.ts`

**Interfaces:**
- Produces: `interface Level { name: string; annualDonationPerChild: number; tone: 'positive' | 'forecast' | 'muted' }`, `LEVELS: Level[]`, `currentLevel(annualDonationPerChild: number): Level | null`.

- [ ] **Step 1: Failing Test schreiben**

```ts
// stiftung-web/lib/data/__tests__/levels.test.ts
import { describe, it, expect } from 'vitest';
import { LEVELS, currentLevel } from '../levels';

describe('LEVELS', () => {
  it('enthält die Stufen aus dem Brainstorming (50/200/500 pro Kind/Jahr) plus zwei weitere', () => {
    expect(LEVELS.map((l) => l.annualDonationPerChild)).toEqual([50, 200, 500, 1000, 2000]);
  });
});

describe('currentLevel', () => {
  it('gibt null zurück unter der ersten Schwelle', () => {
    expect(currentLevel(10)).toBeNull();
  });
  it('gibt Bronze bei genau 50 zurück', () => {
    expect(currentLevel(50)?.name).toBe('Bronze');
  });
  it('gibt das höchste erreichte Level zurück', () => {
    expect(currentLevel(600)?.name).toBe('Gold');
  });
  it('gibt Diamant bei sehr hohen Beträgen zurück', () => {
    expect(currentLevel(5000)?.name).toBe('Diamant');
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- levels`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `levels.ts` implementieren**

```ts
// stiftung-web/lib/data/levels.ts
export interface Level {
  name: string;
  annualDonationPerChild: number;
  tone: 'positive' | 'forecast' | 'muted';
}

export const LEVELS: Level[] = [
  { name: 'Bronze', annualDonationPerChild: 50, tone: 'muted' },
  { name: 'Silber', annualDonationPerChild: 200, tone: 'muted' },
  { name: 'Gold', annualDonationPerChild: 500, tone: 'forecast' },
  { name: 'Platin', annualDonationPerChild: 1000, tone: 'forecast' },
  { name: 'Diamant', annualDonationPerChild: 2000, tone: 'positive' },
];

export function currentLevel(annualDonationPerChild: number): Level | null {
  let result: Level | null = null;
  for (const level of LEVELS) {
    if (annualDonationPerChild >= level.annualDonationPerChild) {
      result = level;
    }
  }
  return result;
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- levels`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/data/levels.ts stiftung-web/lib/data/__tests__/levels.test.ts
git commit -m "feat: Gamification-Level-Stufen (Bronze bis Diamant)"
```

---

### Task 8: Prisma-Schema (vollständig, inkl. Solidaritätsfonds), SQLite-DB, Seed-Script

**Files:**
- Create: `stiftung-web/prisma/schema.prisma`, `prisma/seed.ts`
- Create: `stiftung-web/.env`
- Modify: `stiftung-web/package.json`, `stiftung-web/.gitignore`

**Interfaces:**
- Produces: SQLite-Datei `prisma/dev.db` mit Tabellen `Einrichtung`, `Spende` (mit `quelle`-Feld), `Solidaritaetsfonds` (Singleton), `FondsSpende`. Befüllt mit 8 Seed-Einrichtungen.

Das Schema wird von Anfang an vollständig geschrieben (inkl. der später genutzten Solidaritätsfonds-Tabellen) — vermeidet eine zweite Migration mitten im Plan.

- [ ] **Step 1: Prisma installieren**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/stiftung-web"
npm install prisma @prisma/client
npm install --save-dev tsx
```

- [ ] **Step 2: `prisma/schema.prisma` schreiben**

```prisma
// stiftung-web/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Einrichtung {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  typ              String
  ort              String
  kinderAnzahl     Int
  aktuellesKapital Float
  zielKapital      Float
  spenden          Spende[]
}

model Spende {
  id            String      @id @default(cuid())
  einrichtungId String
  einrichtung   Einrichtung @relation(fields: [einrichtungId], references: [id])
  betrag        Float
  frequenz      String
  quelle        String      @default("direkt")
  createdAt     DateTime    @default(now())
}

model Solidaritaetsfonds {
  id      String @id @default("main")
  bestand Float  @default(0)
}

model FondsSpende {
  id        String   @id @default(cuid())
  betrag    Float
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: `.env` anlegen**

```bash
# stiftung-web/.env
DATABASE_URL="file:./prisma/dev.db"
```

- [ ] **Step 4: `.gitignore` ergänzen**

```
# Prisma / lokale DB
/prisma/*.db
/prisma/*.db-journal
.env
```

- [ ] **Step 5: `prisma/seed.ts` schreiben**

```ts
// stiftung-web/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EINRICHTUNGEN = [
  { slug: 'tagesmutter-wirbelwind-muenchen', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, aktuellesKapital: 3000, zielKapital: 25000 },
  { slug: 'tagesvater-sonnenschein-leipzig', name: 'Tagespflege Sonnenschein', typ: 'tagespflege', ort: 'Leipzig', kinderAnzahl: 4, aktuellesKapital: 800, zielKapital: 20000 },
  { slug: 'tagesmutter-kleine-forscher-dresden', name: 'Tagespflege Kleine Forscher', typ: 'tagespflege', ort: 'Dresden', kinderAnzahl: 6, aktuellesKapital: 12000, zielKapital: 30000 },
  { slug: 'kita-wirbelwind-muenchen', name: 'Kita Wirbelwind', typ: 'kita', ort: 'München', kinderAnzahl: 60, aktuellesKapital: 15000, zielKapital: 120000 },
  { slug: 'kita-regenbogen-koeln', name: 'Kita Regenbogen', typ: 'kita', ort: 'Köln', kinderAnzahl: 45, aktuellesKapital: 5000, zielKapital: 90000 },
  { slug: 'grundschule-sonnenhuegel-berlin', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, aktuellesKapital: 50000, zielKapital: 250000 },
  { slug: 'gymnasium-neustadt-hamburg', name: 'Gymnasium Neustadt', typ: 'schule', ort: 'Hamburg', kinderAnzahl: 800, aktuellesKapital: 450000, zielKapital: 1200000 },
  { slug: 'foerderschule-pestalozzi-bremen', name: 'Förderschule Pestalozzi', typ: 'schule', ort: 'Bremen', kinderAnzahl: 90, aktuellesKapital: 80000, zielKapital: 225000 },
];

async function main() {
  for (const e of EINRICHTUNGEN) {
    await prisma.einrichtung.upsert({ where: { slug: e.slug }, update: e, create: e });
  }
  await prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });
  console.log(`Seed abgeschlossen: ${EINRICHTUNGEN.length} Einrichtungen.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: `package.json` um Prisma-Seed-Config und Scripts ergänzen**

Im Root-Objekt:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Im `"scripts"`-Block:

```json
"db:push": "prisma db push",
"db:seed": "prisma db seed"
```

- [ ] **Step 7: DB erzeugen und befüllen**

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

Expected: `Seed abgeschlossen: 8 Einrichtungen.`, Datei `stiftung-web/prisma/dev.db` existiert. Verifikation der Lese-/Schreibpfade erfolgt mit dem ersten echten DB-Test in Task 9.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/prisma/schema.prisma stiftung-web/prisma/seed.ts stiftung-web/.gitignore stiftung-web/package.json stiftung-web/package-lock.json
git commit -m "feat: Prisma-Schema (Einrichtung/Spende/Solidaritaetsfonds/FondsSpende) + SQLite-Seed-Daten"
```

(`.env` und `prisma/dev.db` werden durch `.gitignore` bewusst nicht committet.)

---

### Task 9: Backend-Service-Layer Einrichtungen mit echten DB-Integrationstests

**Files:**
- Create: `stiftung-web/lib/server/prismaClient.ts`
- Create: `stiftung-web/lib/server/einrichtungenService.ts`
- Test: `stiftung-web/lib/server/__tests__/einrichtungenService.test.ts`
- Modify: `stiftung-web/package.json` (`pretest`-Script)

**Interfaces:**
- Produces:
  - `prisma: PrismaClient`
  - `type Frequenz = 'einmalig' | 'jaehrlich'`
  - `listEinrichtungen(): Promise<Einrichtung[]>`
  - `getEinrichtungBySlug(slug: string): Promise<Einrichtung | null>`
  - `spenden(slug: string, betrag: number, frequenz: Frequenz): Promise<{ einrichtung: Einrichtung; spende: Spende }>` — wirft `EinrichtungNotFoundError` bzw. `UngueltigerBetragError`.
  - `foerderungProKind(e: { aktuellesKapital: number; kinderAnzahl: number }): number`
  - `statistik(): Promise<{ anzahlEinrichtungen: number; gesamtKapital: number; gesamtKinder: number; durchschnittlichesVolumen: number; zuflussLetztesJahr: number; simulierterJahresertrag: number; top5: (Einrichtung & { foerderungProKind: number })[]; bottom5: (Einrichtung & { foerderungProKind: number })[] }>`
- Tests laufen gegen die echte Datei `prisma/test.db`. Kein Mocking der DB-Schicht.

- [ ] **Step 1: `pretest`-Script ergänzen**

Im `"scripts"`-Block von `package.json`:

```json
"pretest": "DATABASE_URL=\"file:./prisma/test.db\" npx prisma db push --force-reset --skip-generate"
```

- [ ] **Step 2: Failing Test schreiben**

```ts
// stiftung-web/lib/server/__tests__/einrichtungenService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import {
  listEinrichtungen,
  getEinrichtungBySlug,
  spenden,
  statistik,
  EinrichtungNotFoundError,
  UngueltigerBetragError,
} from '../einrichtungenService';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'test-kita-a', name: 'Test-Kita A', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'test-kita-b', name: 'Test-Kita B', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 5, aktuellesKapital: 5000, zielKapital: 20000 },
  });
});

describe('listEinrichtungen', () => {
  it('liest echte Zeilen aus der Test-DB', async () => {
    const alle = await listEinrichtungen();
    expect(alle.map((e) => e.slug).sort()).toEqual(['test-kita-a', 'test-kita-b']);
  });
});

describe('spenden', () => {
  it('erhöht aktuellesKapital in der DB dauerhaft und gibt Einrichtung + Spende zurück', async () => {
    const result = await spenden('test-kita-a', 50, 'einmalig');
    expect(result.einrichtung.aktuellesKapital).toBe(1050);
    expect(result.spende.betrag).toBe(50);
    expect(result.spende.quelle).toBe('direkt');
    const nachher = await getEinrichtungBySlug('test-kita-a');
    expect(nachher?.aktuellesKapital).toBe(1050);
  });

  it('speichert die Frequenz korrekt', async () => {
    const result = await spenden('test-kita-a', 200, 'jaehrlich');
    expect(result.spende.frequenz).toBe('jaehrlich');
  });

  it('wirft EinrichtungNotFoundError bei unbekanntem slug', async () => {
    await expect(spenden('gibt-es-nicht', 10, 'einmalig')).rejects.toThrow(EinrichtungNotFoundError);
  });

  it('wirft UngueltigerBetragError bei Betrag <= 0', async () => {
    await expect(spenden('test-kita-a', 0, 'einmalig')).rejects.toThrow(UngueltigerBetragError);
    await expect(spenden('test-kita-a', -5, 'einmalig')).rejects.toThrow(UngueltigerBetragError);
  });
});

describe('statistik', () => {
  it('berechnet Gesamtwerte und Ranking aus echten DB-Zeilen', async () => {
    const stats = await statistik();
    expect(stats.anzahlEinrichtungen).toBe(2);
    expect(stats.gesamtKapital).toBe(6000);
    expect(stats.gesamtKinder).toBe(15);
    expect(stats.top5[0].slug).toBe('test-kita-b');
    expect(stats.top5[0].foerderungProKind).toBe(1000);
    expect(stats.bottom5[0].slug).toBe('test-kita-a');
  });

  it('berechnet Durchschnittsvolumen und simulierten Jahresertrag', async () => {
    const stats = await statistik();
    expect(stats.durchschnittlichesVolumen).toBe(3000);
    expect(stats.simulierterJahresertrag).toBeCloseTo(6000 * 0.06, 5);
  });

  it('meldet 0 Zufluss, wenn im letzten Jahr nichts gespendet wurde', async () => {
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(0);
  });

  it('zählt frische Spenden zum Jahres-Zufluss', async () => {
    await spenden('test-kita-a', 100, 'einmalig');
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(100);
  });
});
```

- [ ] **Step 3: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- einrichtungenService`
Expected: FAIL — Modul `../einrichtungenService` nicht gefunden.

- [ ] **Step 4: `prismaClient.ts` implementieren**

```ts
// stiftung-web/lib/server/prismaClient.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: `einrichtungenService.ts` implementieren**

```ts
// stiftung-web/lib/server/einrichtungenService.ts
import { prisma } from './prismaClient';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';

export type Frequenz = 'einmalig' | 'jaehrlich';

export class EinrichtungNotFoundError extends Error {}
export class UngueltigerBetragError extends Error {}

export async function listEinrichtungen() {
  return prisma.einrichtung.findMany({ orderBy: { name: 'asc' } });
}

export async function getEinrichtungBySlug(slug: string) {
  return prisma.einrichtung.findUnique({ where: { slug } });
}

export async function spenden(slug: string, betrag: number, frequenz: Frequenz) {
  if (!Number.isFinite(betrag) || betrag <= 0) {
    throw new UngueltigerBetragError('Betrag muss größer als 0 sein');
  }
  const einrichtung = await getEinrichtungBySlug(slug);
  if (!einrichtung) {
    throw new EinrichtungNotFoundError(`Keine Einrichtung mit slug ${slug}`);
  }
  const [aktualisiert, spende] = await prisma.$transaction([
    prisma.einrichtung.update({
      where: { slug },
      data: { aktuellesKapital: einrichtung.aktuellesKapital + betrag },
    }),
    prisma.spende.create({
      data: { einrichtungId: einrichtung.id, betrag, frequenz, quelle: 'direkt' },
    }),
  ]);
  return { einrichtung: aktualisiert, spende };
}

export function foerderungProKind(e: { aktuellesKapital: number; kinderAnzahl: number }): number {
  return e.aktuellesKapital / e.kinderAnzahl;
}

export async function statistik() {
  const alle = await listEinrichtungen();
  const mitFoerderung = alle.map((e) => ({ ...e, foerderungProKind: foerderungProKind(e) }));
  const ranked = [...mitFoerderung].sort((a, b) => b.foerderungProKind - a.foerderungProKind);

  const gesamtKapital = alle.reduce((sum, e) => sum + e.aktuellesKapital, 0);
  const anzahlEinrichtungen = alle.length;

  const einJahrVorHeute = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const [direktSumme, fondsSumme] = await Promise.all([
    prisma.spende.aggregate({ _sum: { betrag: true }, where: { createdAt: { gte: einJahrVorHeute } } }),
    prisma.fondsSpende.aggregate({ _sum: { betrag: true }, where: { createdAt: { gte: einJahrVorHeute } } }),
  ]);
  const zuflussLetztesJahr = (direktSumme._sum.betrag ?? 0) + (fondsSumme._sum.betrag ?? 0);

  return {
    anzahlEinrichtungen,
    gesamtKapital,
    gesamtKinder: alle.reduce((sum, e) => sum + e.kinderAnzahl, 0),
    durchschnittlichesVolumen: anzahlEinrichtungen > 0 ? gesamtKapital / anzahlEinrichtungen : 0,
    zuflussLetztesJahr,
    simulierterJahresertrag: gesamtKapital * NET_GROWTH_RATE,
    top5: ranked.slice(0, 5),
    bottom5: ranked.slice(-5).reverse(),
  };
}
```

- [ ] **Step 6: Test erneut ausführen**

Run: `npm run test -- einrichtungenService`
Expected: `pretest` setzt `prisma/test.db` zurück, dann alle Tests PASS.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/server stiftung-web/package.json
git commit -m "feat: Backend-Service-Layer (Einrichtungen, Spenden, erweiterte Statistik) mit echten DB-Tests"
```

---

### Task 10: API-Routes Einrichtungen (HTTP-Schnittstelle für den Client)

**Files:**
- Create: `stiftung-web/app/api/einrichtungen/route.ts` (GET)
- Create: `stiftung-web/app/api/einrichtungen/[slug]/route.ts` (GET)
- Create: `stiftung-web/app/api/einrichtungen/[slug]/spenden/route.ts` (POST)
- Create: `stiftung-web/app/api/statistik/route.ts` (GET)
- Test: `stiftung-web/app/api/einrichtungen/[slug]/spenden/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `listEinrichtungen`, `getEinrichtungBySlug`, `spenden`, `statistik`, `EinrichtungNotFoundError`, `UngueltigerBetragError` (Task 9).
- Produces: `GET /api/einrichtungen`, `GET /api/einrichtungen/:slug`, `POST /api/einrichtungen/:slug/spenden` (Body `{ betrag, frequenz }`, Antwort 201 mit `{ einrichtung, spende }`, 404 bei unbekanntem slug, 400 bei ungültigem Betrag), `GET /api/statistik`.

- [ ] **Step 1: Failing Test für den Spenden-Endpoint schreiben**

```ts
// stiftung-web/app/api/einrichtungen/[slug]/spenden/__tests__/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { POST } from '../route';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'api-test-kita', name: 'API-Test-Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
});

describe('POST /api/einrichtungen/[slug]/spenden', () => {
  it('bucht Spende real in die DB und gibt { einrichtung, spende } zurück (201)', async () => {
    const request = new Request('http://localhost/api/einrichtungen/api-test-kita/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: 100, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'api-test-kita' } });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.einrichtung.aktuellesKapital).toBe(1100);
    expect(json.spende.betrag).toBe(100);

    const inDb = await prisma.einrichtung.findUnique({ where: { slug: 'api-test-kita' } });
    expect(inDb?.aktuellesKapital).toBe(1100);
  });

  it('gibt 404 bei unbekanntem slug', async () => {
    const request = new Request('http://localhost/api/einrichtungen/unbekannt/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: 100, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'unbekannt' } });
    expect(response.status).toBe(404);
  });

  it('gibt 400 bei ungültigem Betrag', async () => {
    const request = new Request('http://localhost/api/einrichtungen/api-test-kita/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: -10, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'api-test-kita' } });
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- app/api/einrichtungen`
Expected: FAIL — Modul `../route` nicht gefunden.

- [ ] **Step 3: Routen implementieren**

```ts
// stiftung-web/app/api/einrichtungen/route.ts
import { NextResponse } from 'next/server';
import { listEinrichtungen } from '@/lib/server/einrichtungenService';

export async function GET() {
  return NextResponse.json(await listEinrichtungen());
}
```

```ts
// stiftung-web/app/api/einrichtungen/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getEinrichtungBySlug } from '@/lib/server/einrichtungenService';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const e = await getEinrichtungBySlug(params.slug);
  if (!e) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(e);
}
```

```ts
// stiftung-web/app/api/einrichtungen/[slug]/spenden/route.ts
import { NextResponse } from 'next/server';
import { spenden, EinrichtungNotFoundError, UngueltigerBetragError } from '@/lib/server/einrichtungenService';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const body = await request.json();
  const betrag = Number(body.betrag);
  const frequenz = body.frequenz === 'jaehrlich' ? 'jaehrlich' : 'einmalig';

  try {
    const result = await spenden(params.slug, betrag, frequenz);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof EinrichtungNotFoundError) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (err instanceof UngueltigerBetragError) {
      return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    }
    throw err;
  }
}
```

```ts
// stiftung-web/app/api/statistik/route.ts
import { NextResponse } from 'next/server';
import { statistik } from '@/lib/server/einrichtungenService';

export async function GET() {
  return NextResponse.json(await statistik());
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- app/api/einrichtungen`
Expected: alle PASS.

- [ ] **Step 5: Manuelle HTTP-Verifikation gegen den echten Dev-Server**

```bash
npm run dev
```

In einem zweiten Terminal:

```bash
curl -s http://localhost:3000/api/einrichtungen | head -c 300
curl -s -X POST http://localhost:3000/api/einrichtungen/tagesmutter-wirbelwind-muenchen/spenden \
  -H "Content-Type: application/json" \
  -d '{"betrag": 25, "frequenz": "einmalig"}'
curl -s http://localhost:3000/api/statistik | head -c 300
```

Expected: JSON-Antworten, `aktuellesKapital` von `tagesmutter-wirbelwind-muenchen` in der zweiten Antwort um 25 erhöht (3025). Server danach stoppen.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/api
git commit -m "feat: API-Routes für Einrichtungen, Spenden-Buchung und Statistik"
```

---

### Task 11: Solidaritäts-Berechnungslogik (pure Funktionen, DB-unabhängig)

**Files:**
- Create: `stiftung-web/lib/calc/solidaritaet.ts`
- Test: `stiftung-web/lib/calc/__tests__/solidaritaet.test.ts`

**Interfaces:**
- Produces:
  - `bedarfProKind(e: { aktuellesKapital: number; zielKapital: number; kinderAnzahl: number }): number` — Pro-Kind-Lücke zum Ziel, mindestens 0.
  - `verteilePool(pool: number, eintraege: { slug: string; bedarf: number }[]): { slug: string; anteil: number }[]` — verteilt `pool` proportional zum `bedarf`; Summe der `anteil`-Werte entspricht `pool` (Rundungsdifferenz geht an den letzten Eintrag); überall 0, wenn `pool <= 0` oder Gesamtbedarf 0 ist.

Das ist die reine Formel, die "wer am wenigsten hat, wird am meisten gefördert" umsetzt (Leitbild-Kern) — ohne DB-Zugriff, dadurch trivial testbar.

- [ ] **Step 1: Failing Test schreiben**

```ts
// stiftung-web/lib/calc/__tests__/solidaritaet.test.ts
import { describe, it, expect } from 'vitest';
import { bedarfProKind, verteilePool } from '../solidaritaet';

describe('bedarfProKind', () => {
  it('berechnet die Pro-Kind-Lücke zum Ziel', () => {
    expect(bedarfProKind({ aktuellesKapital: 1000, zielKapital: 5000, kinderAnzahl: 10 })).toBe(400);
  });
  it('gibt 0 zurück, wenn das Ziel pro Kind bereits erreicht ist', () => {
    expect(bedarfProKind({ aktuellesKapital: 6000, zielKapital: 5000, kinderAnzahl: 10 })).toBe(0);
  });
});

describe('verteilePool', () => {
  it('verteilt proportional zum Bedarf – höherer Bedarf bekommt mehr', () => {
    const ergebnis = verteilePool(100, [
      { slug: 'a', bedarf: 300 },
      { slug: 'b', bedarf: 100 },
    ]);
    const a = ergebnis.find((e) => e.slug === 'a')!;
    const b = ergebnis.find((e) => e.slug === 'b')!;
    expect(a.anteil).toBeGreaterThan(b.anteil);
    expect(a.anteil + b.anteil).toBeCloseTo(100, 2);
  });

  it('verteilt den kompletten Pool ohne Rest (Rundungsdifferenz an den letzten Eintrag)', () => {
    const ergebnis = verteilePool(100, [
      { slug: 'a', bedarf: 1 },
      { slug: 'b', bedarf: 1 },
      { slug: 'c', bedarf: 1 },
    ]);
    const summe = ergebnis.reduce((s, e) => s + e.anteil, 0);
    expect(summe).toBeCloseTo(100, 2);
  });

  it('gibt überall 0 zurück, wenn kein Bedarf besteht', () => {
    const ergebnis = verteilePool(100, [{ slug: 'a', bedarf: 0 }, { slug: 'b', bedarf: 0 }]);
    expect(ergebnis.every((e) => e.anteil === 0)).toBe(true);
  });

  it('gibt überall 0 zurück, wenn der Pool leer ist', () => {
    const ergebnis = verteilePool(0, [{ slug: 'a', bedarf: 100 }]);
    expect(ergebnis.every((e) => e.anteil === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- solidaritaet`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `solidaritaet.ts` implementieren**

```ts
// stiftung-web/lib/calc/solidaritaet.ts
export interface BedarfsEintrag {
  slug: string;
  bedarf: number;
}

export function bedarfProKind(e: { aktuellesKapital: number; zielKapital: number; kinderAnzahl: number }): number {
  const luecke = e.zielKapital / e.kinderAnzahl - e.aktuellesKapital / e.kinderAnzahl;
  return Math.max(0, luecke);
}

export function verteilePool(pool: number, eintraege: BedarfsEintrag[]): { slug: string; anteil: number }[] {
  const gesamtBedarf = eintraege.reduce((sum, e) => sum + e.bedarf, 0);
  if (pool <= 0 || gesamtBedarf <= 0) {
    return eintraege.map((e) => ({ slug: e.slug, anteil: 0 }));
  }
  let rest = Math.round(pool * 100) / 100;
  return eintraege.map((e, i) => {
    const isLast = i === eintraege.length - 1;
    const rohAnteil = (pool * e.bedarf) / gesamtBedarf;
    const anteil = isLast ? rest : Math.round(rohAnteil * 100) / 100;
    rest = Math.round((rest - anteil) * 100) / 100;
    return { slug: e.slug, anteil };
  });
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- solidaritaet`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/calc/solidaritaet.ts stiftung-web/lib/calc/__tests__/solidaritaet.test.ts
git commit -m "feat: Solidaritäts-Verteilungsformel (Bedarf pro Kind, proportionale Poolverteilung)"
```

---

### Task 12: Solidaritätsfonds-Service mit echten DB-Integrationstests

**Files:**
- Create: `stiftung-web/lib/server/solidaritaetsfondsService.ts`
- Test: `stiftung-web/lib/server/__tests__/solidaritaetsfondsService.test.ts`

**Interfaces:**
- Consumes: `bedarfProKind`, `verteilePool` (Task 11), `UngueltigerBetragError` (Task 9), `prisma` (Task 9).
- Produces:
  - `getFondsBestand(): Promise<number>`
  - `spendeAnFonds(betrag: number): Promise<number>` — wirft `UngueltigerBetragError` bei `betrag <= 0`.
  - `verteileFonds(): Promise<{ verteiltGesamt: number; verteilung: { slug: string; name: string; anteil: number }[] }>` — bucht real in `Einrichtung.aktuellesKapital`, legt `Spende`-Zeilen mit `quelle: 'solidaritaet'` an, setzt den Fonds-Bestand um den verteilten Betrag zurück (bei fehlendem Bedarf bleibt der Bestand unangetastet).

- [ ] **Step 1: Failing Test schreiben**

```ts
// stiftung-web/lib/server/__tests__/solidaritaetsfondsService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { getFondsBestand, spendeAnFonds, verteileFonds } from '../solidaritaetsfondsService';
import { UngueltigerBetragError } from '../einrichtungenService';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.fondsSpende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'arm', name: 'Arme Kita', typ: 'kita', ort: 'X', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 10000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'reich', name: 'Reiche Schule', typ: 'schule', ort: 'Y', kinderAnzahl: 10, aktuellesKapital: 9000, zielKapital: 10000 },
  });
});

describe('spendeAnFonds', () => {
  it('erhöht den Fonds-Bestand dauerhaft', async () => {
    await spendeAnFonds(100);
    expect(await getFondsBestand()).toBe(100);
  });
  it('wirft UngueltigerBetragError bei Betrag <= 0', async () => {
    await expect(spendeAnFonds(0)).rejects.toThrow(UngueltigerBetragError);
  });
});

describe('verteileFonds', () => {
  it('verteilt mehr an die Einrichtung mit größerem Pro-Kind-Bedarf', async () => {
    await spendeAnFonds(1000);
    const ergebnis = await verteileFonds();
    const arm = ergebnis.verteilung.find((v) => v.slug === 'arm')!;
    const reich = ergebnis.verteilung.find((v) => v.slug === 'reich')!;
    expect(arm.anteil).toBeGreaterThan(reich.anteil);
  });

  it('setzt den Fonds-Bestand nach Verteilung auf 0 zurück', async () => {
    await spendeAnFonds(500);
    await verteileFonds();
    expect(await getFondsBestand()).toBe(0);
  });

  it('bucht die Verteilung als echte Spende mit quelle "solidaritaet"', async () => {
    await spendeAnFonds(300);
    await verteileFonds();
    const spendenListe = await prisma.spende.findMany({ where: { quelle: 'solidaritaet' } });
    expect(spendenListe.length).toBeGreaterThan(0);
  });

  it('lässt den Pool unangetastet, wenn kein Bedarf besteht', async () => {
    await prisma.einrichtung.updateMany({ data: { aktuellesKapital: 10000 } });
    await spendeAnFonds(200);
    await verteileFonds();
    expect(await getFondsBestand()).toBe(200);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- solidaritaetsfondsService`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `solidaritaetsfondsService.ts` implementieren**

```ts
// stiftung-web/lib/server/solidaritaetsfondsService.ts
import { prisma } from './prismaClient';
import { bedarfProKind, verteilePool } from '@/lib/calc/solidaritaet';
import { UngueltigerBetragError } from './einrichtungenService';

async function ensureFonds() {
  return prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });
}

export async function getFondsBestand(): Promise<number> {
  const fonds = await ensureFonds();
  return fonds.bestand;
}

export async function spendeAnFonds(betrag: number): Promise<number> {
  if (!Number.isFinite(betrag) || betrag <= 0) {
    throw new UngueltigerBetragError('Betrag muss größer als 0 sein');
  }
  await ensureFonds();
  const fonds = await prisma.solidaritaetsfonds.update({
    where: { id: 'main' },
    data: { bestand: { increment: betrag } },
  });
  await prisma.fondsSpende.create({ data: { betrag } });
  return fonds.bestand;
}

export async function verteileFonds() {
  return prisma.$transaction(async (tx) => {
    const fonds = await tx.solidaritaetsfonds.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main', bestand: 0 },
    });
    if (fonds.bestand <= 0) {
      return { verteiltGesamt: 0, verteilung: [] as { slug: string; name: string; anteil: number }[] };
    }

    const alle = await tx.einrichtung.findMany();
    const eintraege = alle.map((e) => ({ slug: e.slug, bedarf: bedarfProKind(e) }));
    const verteilung = verteilePool(fonds.bestand, eintraege);

    for (const v of verteilung) {
      if (v.anteil <= 0) continue;
      const e = alle.find((x) => x.slug === v.slug)!;
      await tx.einrichtung.update({
        where: { slug: v.slug },
        data: {
          aktuellesKapital: e.aktuellesKapital + v.anteil,
          spenden: { create: { betrag: v.anteil, frequenz: 'einmalig', quelle: 'solidaritaet' } },
        },
      });
    }

    const verteiltGesamt = verteilung.reduce((s, v) => s + v.anteil, 0);
    await tx.solidaritaetsfonds.update({
      where: { id: 'main' },
      data: { bestand: fonds.bestand - verteiltGesamt },
    });

    const namen = new Map(alle.map((e) => [e.slug, e.name]));
    return {
      verteiltGesamt,
      verteilung: verteilung
        .filter((v) => v.anteil > 0)
        .map((v) => ({ ...v, name: namen.get(v.slug)! })),
    };
  });
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- solidaritaetsfondsService`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/lib/server/solidaritaetsfondsService.ts stiftung-web/lib/server/__tests__/solidaritaetsfondsService.test.ts
git commit -m "feat: Solidaritätsfonds-Service (Einzahlen, bedarfsbasierte Verteilung) mit echten DB-Tests"
```

---

### Task 13: Solidaritätsfonds-API-Routes

**Files:**
- Create: `stiftung-web/app/api/solidaritaetsfonds/route.ts` (GET)
- Create: `stiftung-web/app/api/solidaritaetsfonds/spenden/route.ts` (POST)
- Create: `stiftung-web/app/api/solidaritaetsfonds/verteilen/route.ts` (POST)
- Test: `stiftung-web/app/api/solidaritaetsfonds/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getFondsBestand`, `spendeAnFonds`, `verteileFonds` (Task 12), `UngueltigerBetragError` (Task 9).
- Produces: `GET /api/solidaritaetsfonds` → `{ bestand }`, `POST /api/solidaritaetsfonds/spenden` (Body `{ betrag }`) → `{ bestand }` (201) oder 400, `POST /api/solidaritaetsfonds/verteilen` → `{ verteiltGesamt, verteilung }`.

- [ ] **Step 1: Failing Test schreiben**

```ts
// stiftung-web/app/api/solidaritaetsfonds/__tests__/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { GET } from '../route';
import { POST as postSpenden } from '../spenden/route';
import { POST as postVerteilen } from '../verteilen/route';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.fondsSpende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'fonds-test-kita', name: 'Fonds-Test-Kita', typ: 'kita', ort: 'Z', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 5000 },
  });
});

describe('Solidaritätsfonds-API', () => {
  it('GET liefert Bestand 0 initial', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.bestand).toBe(0);
  });

  it('POST /spenden erhöht Bestand, POST /verteilen bucht real in Einrichtung', async () => {
    await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betrag: 100 }),
      })
    );
    const verteilenRes = await postVerteilen();
    const verteilenJson = await verteilenRes.json();
    expect(verteilenJson.verteiltGesamt).toBeGreaterThan(0);

    const e = await prisma.einrichtung.findUnique({ where: { slug: 'fonds-test-kita' } });
    expect(e?.aktuellesKapital).toBeGreaterThan(0);
  });

  it('POST /spenden gibt 400 bei ungültigem Betrag', async () => {
    const res = await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betrag: -5 }),
      })
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- app/api/solidaritaetsfonds`
Expected: FAIL — Module nicht gefunden.

- [ ] **Step 3: Routen implementieren**

```ts
// stiftung-web/app/api/solidaritaetsfonds/route.ts
import { NextResponse } from 'next/server';
import { getFondsBestand } from '@/lib/server/solidaritaetsfondsService';

export async function GET() {
  return NextResponse.json({ bestand: await getFondsBestand() });
}
```

```ts
// stiftung-web/app/api/solidaritaetsfonds/spenden/route.ts
import { NextResponse } from 'next/server';
import { spendeAnFonds } from '@/lib/server/solidaritaetsfondsService';
import { UngueltigerBetragError } from '@/lib/server/einrichtungenService';

export async function POST(request: Request) {
  const body = await request.json();
  const betrag = Number(body.betrag);
  try {
    const bestand = await spendeAnFonds(betrag);
    return NextResponse.json({ bestand }, { status: 201 });
  } catch (err) {
    if (err instanceof UngueltigerBetragError) {
      return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    }
    throw err;
  }
}
```

```ts
// stiftung-web/app/api/solidaritaetsfonds/verteilen/route.ts
import { NextResponse } from 'next/server';
import { verteileFonds } from '@/lib/server/solidaritaetsfondsService';

export async function POST() {
  return NextResponse.json(await verteileFonds());
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- app/api/solidaritaetsfonds`
Expected: alle PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/api/solidaritaetsfonds
git commit -m "feat: Solidaritätsfonds-API-Routes (Bestand, Einzahlen, Verteilen)"
```

---

### Task 14: Landing-Page

**Files:**
- Modify: `stiftung-web/app/page.tsx`
- Test: `stiftung-web/app/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `Card` (Task 4), `capitalForAnnualPayout` (Task 6).

- [ ] **Step 1: Failing Test schreiben**

```tsx
// stiftung-web/app/__tests__/page.test.tsx
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- app/__tests__/page`
Expected: FAIL — Text fehlt im Next.js-Platzhalter.

- [ ] **Step 3: `page.tsx` implementieren**

```tsx
// stiftung-web/app/page.tsx
import Link from 'next/link';
import { Card } from '@/components/Card';
import { capitalForAnnualPayout } from '@/lib/calc/spendenrechner';
import { formatEuro } from '@/lib/calc/format';

export default function Page() {
  const beispielZiel = capitalForAnnualPayout(20000);

  return (
    <div style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <section>
        <p className="eyebrow">Deutsche Bildungsstiftung</p>
        <h1 className="hero-number" style={{ maxWidth: '18ch' }}>
          Gemeinsam zur Bildungsrevolution
        </h1>
        <p style={{ maxWidth: '60ch', fontSize: '1.1rem' }}>
          Bildung darf niemals vom Geldbeutel der Familie abhängen. Wir bauen
          unabhängiges, dauerhaftes Bildungskapital auf, damit jede
          Bildungs- und Betreuungseinrichtung in Deutschland ihre Kinder
          fördern kann — unabhängig davon, wie reich ihr Umfeld ist.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/einrichtungen" className="pill pill-primary">Einrichtung finden</Link>
          <Link href="/statistik" className="pill pill-secondary">Statistik ansehen</Link>
          <Link href="/solidaritaetsfonds" className="pill pill-secondary">Solidaritätsfonds</Link>
        </div>
      </section>

      <Card>
        <p className="eyebrow">So wirkt Ihre Spende</p>
        <p style={{ maxWidth: '60ch' }}>
          Für eine jährliche Ausschüttung von 20.000 € an eine Einrichtung
          braucht der Finanztopf ein Kapital von{' '}
          <strong>{formatEuro(beispielZiel)}</strong> — bei einer
          Netto-Wachstumsrate von 6 % pro Jahr wächst jede Spende dauerhaft
          weiter, ohne dass das Kapital verbraucht wird.
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- app/__tests__/page`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/page.tsx stiftung-web/app/__tests__/page.test.tsx
git commit -m "feat: Landing-Page mit Mission und Spenden-CTA"
```

---

### Task 15: Einrichtungen-Liste (Server Component lädt aus DB, Client-Filter)

**Files:**
- Create: `stiftung-web/app/einrichtungen/page.tsx` (Server Component)
- Create: `stiftung-web/app/einrichtungen/loading.tsx`, `app/einrichtungen/error.tsx`
- Create: `stiftung-web/components/EinrichtungenFilter.tsx` (Client Component)
- Test: `stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx`

**Interfaces:**
- Consumes: `listEinrichtungen` (Task 9), `Card`, `ProgressBar`, `LoadingState`, `ErrorState` (Task 4), `formatEuro` (Task 5).
- Produces: `EinrichtungenFilter({ einrichtungen }): JSX.Element` (Client Component, reiner UI-Filter über bereits geladene Daten — kein eigener Fetch, testbar ohne DB).

- [ ] **Step 1: Failing Test für `EinrichtungenFilter` schreiben**

```tsx
// stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { EinrichtungenFilter } from '../EinrichtungenFilter';

const EINRICHTUNGEN = [
  { id: '1', slug: 'a', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, aktuellesKapital: 3000, zielKapital: 25000 },
  { id: '2', slug: 'b', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, aktuellesKapital: 50000, zielKapital: 250000 },
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
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- EinrichtungenFilter`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `EinrichtungenFilter.tsx` implementieren**

```tsx
// stiftung-web/components/EinrichtungenFilter.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { formatEuro } from '@/lib/calc/format';

interface EinrichtungListItem {
  id: string;
  slug: string;
  name: string;
  typ: string;
  ort: string;
  kinderAnzahl: number;
  aktuellesKapital: number;
  zielKapital: number;
}

type TypFilter = 'alle' | 'tagespflege' | 'kita' | 'schule';

export function EinrichtungenFilter({ einrichtungen }: { einrichtungen: EinrichtungListItem[] }) {
  const [suche, setSuche] = useState('');
  const [typ, setTyp] = useState<TypFilter>('alle');

  const gefiltert = useMemo(() => {
    return einrichtungen.filter((e) => {
      const passtTyp = typ === 'alle' || e.typ === typ;
      const passtSuche =
        suche.trim() === '' ||
        e.name.toLowerCase().includes(suche.toLowerCase()) ||
        e.ort.toLowerCase().includes(suche.toLowerCase());
      return passtTyp && passtSuche;
    });
  }, [suche, typ, einrichtungen]);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Suche</span>
          <input
            aria-label="Suche"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name oder Ort"
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
        </label>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Typ</span>
          <select
            aria-label="Typ"
            value={typ}
            onChange={(e) => setTyp(e.target.value as TypFilter)}
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          >
            <option value="alle">Alle</option>
            <option value="tagespflege">Tagespflege</option>
            <option value="kita">Kita</option>
            <option value="schule">Schule</option>
          </select>
        </label>
      </div>

      {gefiltert.length === 0 ? (
        <Card><p>Keine Einrichtung gefunden. Suche oder Filter anpassen.</p></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {gefiltert.map((e) => (
            <Link key={e.id} href={`/einrichtungen/${e.slug}`} style={{ textDecoration: 'none' }}>
              <Card>
                <p className="eyebrow">{e.typ}</p>
                <h2 style={{ margin: '0.25rem 0' }}>{e.name}</h2>
                <p className="muted" style={{ margin: '0 0 0.75rem' }}>{e.ort} · {e.kinderAnzahl} Kinder</p>
                <ProgressBar
                  value={e.aktuellesKapital}
                  max={e.zielKapital}
                  label={`${formatEuro(e.aktuellesKapital)} von ${formatEuro(e.zielKapital)}`}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- EinrichtungenFilter`
Expected: alle PASS.

- [ ] **Step 5: Server-Component-Seite schreiben, die aus der DB lädt**

```tsx
// stiftung-web/app/einrichtungen/page.tsx
import { listEinrichtungen } from '@/lib/server/einrichtungenService';
import { EinrichtungenFilter } from '@/components/EinrichtungenFilter';

export default async function EinrichtungenPage() {
  const einrichtungen = await listEinrichtungen();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Einrichtungen</h1>
        <p className="muted">Tagespflege, Kita und Schulen — jede Einrichtung mit eigenem Finanztopf.</p>
      </div>
      <EinrichtungenFilter einrichtungen={einrichtungen} />
    </div>
  );
}
```

- [ ] **Step 6: `loading.tsx` und `error.tsx` für die Route ergänzen**

```tsx
// stiftung-web/app/einrichtungen/loading.tsx
import { LoadingState } from '@/components/LoadingState';

export default function Loading() {
  return <LoadingState label="Einrichtungen werden geladen …" />;
}
```

```tsx
// stiftung-web/app/einrichtungen/error.tsx
'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} label="Einrichtungen konnten nicht geladen werden." />;
}
```

- [ ] **Step 7: Manuell im Browser verifizieren**

Run: `npm run dev`, `http://localhost:3000/einrichtungen` öffnen.
Expected: 8 Seed-Einrichtungen aus der Dev-DB sichtbar, Filter funktioniert. Server stoppen.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/einrichtungen/page.tsx stiftung-web/app/einrichtungen/loading.tsx stiftung-web/app/einrichtungen/error.tsx stiftung-web/components/EinrichtungenFilter.tsx stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx
git commit -m "feat: Einrichtungen-Liste lädt aus DB, Filter als reine Client-Komponente, Loading-/Error-States"
```

---

### Task 16: SVG-BarChart-Komponente (beschriftete Achsen)

**Files:**
- Create: `stiftung-web/components/BarChart.tsx`
- Test: `stiftung-web/components/__tests__/BarChart.test.tsx`

**Interfaces:**
- Produces: `BarChart({ data, xAxisLabel, yAxisLabel }): JSX.Element`, `data: { label: string; value: number }[]`.

- [ ] **Step 1: Failing Test schreiben**

```tsx
// stiftung-web/components/__tests__/BarChart.test.tsx
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- BarChart`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `BarChart.tsx` implementieren**

```tsx
// stiftung-web/components/BarChart.tsx
export function BarChart({
  data,
  xAxisLabel,
  yAxisLabel,
}: {
  data: { label: string; value: number }[];
  xAxisLabel: string;
  yAxisLabel: string;
}) {
  const width = 640;
  const height = 320;
  const padding = { top: 16, right: 16, bottom: 56, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 8;
  const barWidth = data.length > 0 ? Math.max(4, plotWidth / data.length - barGap) : plotWidth;

  return (
    <div>
      <svg role="img" aria-label={`${yAxisLabel} nach ${xAxisLabel}`} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * plotHeight;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + (plotHeight - barHeight);
          return (
            <g key={d.label}>
              <rect className="bar" x={x} y={y} width={barWidth} height={barHeight} fill="var(--sun)" rx={4} />
              <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }} className="muted">
        <span>{yAxisLabel}</span>
        <span>{xAxisLabel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- BarChart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/components/BarChart.tsx stiftung-web/components/__tests__/BarChart.test.tsx
git commit -m "feat: SVG-BarChart mit Pflicht-Achsenbeschriftung"
```

---

### Task 17: Statistik-Seite (erweitert: Ø-Volumen, Jahres-Zufluss, simulierter Ertrag, Solidaritätsfonds-Verweis)

**Files:**
- Create: `stiftung-web/app/statistik/page.tsx`
- Create: `stiftung-web/app/statistik/loading.tsx`, `app/statistik/error.tsx`

**Interfaces:**
- Consumes: `statistik` (Task 9, bereits mit erweiterten Feldern), `Card`, `LoadingState`, `ErrorState` (Task 4), `BarChart` (Task 16), `formatEuro` (Task 5).

Reine Server Component ohne eigene Client-Logik — die zugrundeliegende `statistik()`-Funktion und `Card`/`BarChart` sind bereits getestet. Verifikation hier bewusst über manuellen Browser-Check (Step 2), kein weiterer RTL-Test für reine Verdrahtung.

- [ ] **Step 1: `page.tsx` implementieren**

```tsx
// stiftung-web/app/statistik/page.tsx
import { Card } from '@/components/Card';
import { BarChart } from '@/components/BarChart';
import { formatEuro } from '@/lib/calc/format';
import { statistik } from '@/lib/server/einrichtungenService';

export default async function StatistikPage() {
  const stats = await statistik();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Statistik</h1>
        <p className="muted">
          {stats.anzahlEinrichtungen} Einrichtungen · {stats.gesamtKinder} Kinder ·{' '}
          {formatEuro(stats.gesamtKapital)} Gesamtkapital
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card>
          <p className="eyebrow">Ø Volumen pro Einrichtung</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.durchschnittlichesVolumen)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Zufluss letzte 12 Monate</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.zuflussLetztesJahr)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Simulierter Jahresertrag (6%)</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.simulierterJahresertrag)}</p>
          <p className="muted" style={{ fontSize: '0.8rem' }}>Simuliert auf Basis des Gesamtkapitals — kein realer Auszahlungs-Flow (folgt mit Payment/KYC).</p>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Förderung pro Kind — Top 5</p>
        <BarChart
          data={stats.top5.map((e) => ({ label: e.name, value: Math.round(e.foerderungProKind) }))}
          xAxisLabel="Einrichtung"
          yAxisLabel="Förderung pro Kind (€)"
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <Card>
          <h2>Am besten gefördert</h2>
          <ol>{stats.top5.map((e) => (<li key={e.id}>{e.name} — {formatEuro(e.foerderungProKind)} pro Kind</li>))}</ol>
        </Card>
        <Card>
          <h2>Größter Förderbedarf</h2>
          <ol>{stats.bottom5.map((e) => (<li key={e.id}>{e.name} — {formatEuro(e.foerderungProKind)} pro Kind</li>))}</ol>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Solidaritätsfonds</p>
        <p>Nicht direkt zugeordnete Spenden werden nach Bedarf verteilt — wer pro Kind am wenigsten hat, bekommt am meisten.</p>
        <a href="/solidaritaetsfonds" className="pill pill-secondary">Zum Solidaritätsfonds</a>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: `loading.tsx` und `error.tsx` für die Route ergänzen**

```tsx
// stiftung-web/app/statistik/loading.tsx
import { LoadingState } from '@/components/LoadingState';

export default function Loading() {
  return <LoadingState label="Statistik wird geladen …" />;
}
```

```tsx
// stiftung-web/app/statistik/error.tsx
'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} label="Statistik konnte nicht geladen werden." />;
}
```

- [ ] **Step 3: Manuell im Browser verifizieren**

Run: `npm run dev`, `http://localhost:3000/statistik` öffnen.
Expected: Gesamtzahlen, drei neue Stat-Kacheln (Ø-Volumen, Zufluss, simulierter Ertrag), Balkendiagramm mit beschrifteten Achsen, Top-5/Bottom-5-Listen, Link zum Solidaritätsfonds. Server stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/statistik/page.tsx stiftung-web/app/statistik/loading.tsx stiftung-web/app/statistik/error.tsx
git commit -m "feat: Statistik-Seite mit erweiterten Kennzahlen, Solidaritätsfonds-Verweis, Loading-/Error-States"
```

---

### Task 18: Einrichtungs-Detailseite mit Live-Spendenrechner und QR-Code

**Files:**
- Create: `stiftung-web/components/SpendenRechner.tsx` (Client Component, Basisversion ohne Buchen — Buchen folgt in Task 19)
- Test: `stiftung-web/components/__tests__/SpendenRechner.test.tsx`
- Create: `stiftung-web/app/einrichtungen/[slug]/page.tsx` (Server Component)
- Create: `stiftung-web/app/einrichtungen/[slug]/loading.tsx`, `app/einrichtungen/[slug]/error.tsx`
- Test: `stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `computeYearsToGoal` (Task 6), `formatEuro`, `formatDuration` (Task 5), `currentLevel` (Task 7), `getEinrichtungBySlug` (Task 9), `ProgressBar`, `StatusChip`, `Card`, `LoadingState`, `ErrorState` (Task 4).
- Produces: `SpendenRechner({ einrichtung }): JSX.Element` — Regler + Zahleneingabe, Frequenz-Toggle, zeigt live clientseitig simulierte Jahre bis Ziel (kein Netzwerk-Call bei jedem Slider-Tick).

- [ ] **Step 1: `qrcode`-Paket installieren**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/stiftung-web"
npm install qrcode
npm install --save-dev @types/qrcode
```

- [ ] **Step 2: Failing Test für `SpendenRechner` schreiben**

```tsx
// stiftung-web/components/__tests__/SpendenRechner.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { SpendenRechner } from '../SpendenRechner';

const einrichtung = {
  id: '1',
  slug: 'tagesmutter-wirbelwind-muenchen',
  name: 'Tagespflege Wirbelwind',
  typ: 'tagespflege',
  ort: 'München',
  kinderAnzahl: 5,
  aktuellesKapital: 3000,
  zielKapital: 25000,
};

describe('SpendenRechner', () => {
  it('zeigt initial die Jahre bis zum Ziel ohne Spende', () => {
    render(<SpendenRechner einrichtung={einrichtung} />);
    expect(screen.getByText(/bis zum Ziel/i)).toBeInTheDocument();
  });

  it('aktualisiert die Berechnung, wenn der Spendenbetrag geändert wird', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const initialText = screen.getByTestId('years-result').textContent;
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');
    const updatedText = screen.getByTestId('years-result').textContent;
    expect(updatedText).not.toBe(initialText);
  });

  it('wechselt zwischen einmalig und jährlich', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const jaehrlichButton = screen.getByRole('button', { name: 'Jährlich' });
    await user.click(jaehrlichButton);
    expect(jaehrlichButton).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 3: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- SpendenRechner`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 4: `SpendenRechner.tsx` implementieren**

```tsx
// stiftung-web/components/SpendenRechner.tsx
'use client';

import { useState } from 'react';
import { computeYearsToGoal } from '@/lib/calc/spendenrechner';
import { formatDuration, formatEuro } from '@/lib/calc/format';
import { currentLevel } from '@/lib/data/levels';
import { StatusChip } from './StatusChip';

interface EinrichtungFuerRechner {
  slug: string;
  name: string;
  kinderAnzahl: number;
  aktuellesKapital: number;
  zielKapital: number;
}

export function SpendenRechner({ einrichtung }: { einrichtung: EinrichtungFuerRechner }) {
  const [betrag, setBetrag] = useState(50);
  const [frequenz, setFrequenz] = useState<'einmalig' | 'jaehrlich'>('einmalig');

  const jahre = computeYearsToGoal({
    startCapital: einrichtung.aktuellesKapital,
    targetCapital: einrichtung.zielKapital,
    donation: betrag,
    frequency: frequenz,
  });

  const annualDonationPerChild = (frequenz === 'jaehrlich' ? betrag : 0) / einrichtung.kinderAnzahl;
  const level = currentLevel(annualDonationPerChild);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <label>
        <span className="eyebrow" style={{ display: 'block' }}>Spendenbetrag</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            aria-label="Spendenbetrag (Regler)"
            type="range"
            min={5}
            max={2000}
            step={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value))}
          />
          <input
            aria-label="Spendenbetrag"
            type="number"
            min={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value) || 0)}
            style={{ width: '6rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <span>€</span>
        </div>
      </label>

      <div role="group" aria-label="Spendenfrequenz" style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className={`pill ${frequenz === 'einmalig' ? 'pill-primary' : 'pill-secondary'}`} aria-pressed={frequenz === 'einmalig'} onClick={() => setFrequenz('einmalig')}>
          Einmalig
        </button>
        <button type="button" className={`pill ${frequenz === 'jaehrlich' ? 'pill-primary' : 'pill-secondary'}`} aria-pressed={frequenz === 'jaehrlich'} onClick={() => setFrequenz('jaehrlich')}>
          Jährlich
        </button>
      </div>

      <div data-testid="years-result">
        <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>{formatDuration(jahre)}</p>
        <p className="muted">bis zum Ziel von {formatEuro(einrichtung.zielKapital)}</p>
      </div>

      {level && <StatusChip tone={level.tone}>{level.name}-Spender:in</StatusChip>}
    </div>
  );
}
```

- [ ] **Step 5: Test erneut ausführen**

Run: `npm run test -- SpendenRechner`
Expected: alle PASS.

- [ ] **Step 6: Failing Test für die Detailseite (inkl. QR-Code) schreiben**

```tsx
// stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import EinrichtungDetailPage from '../page';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'detail-test-kita', name: 'Detail-Test-Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
});

describe('EinrichtungDetailPage', () => {
  it('zeigt Name, Ort, Fortschritt und einen QR-Code', async () => {
    const jsx = await EinrichtungDetailPage({ params: { slug: 'detail-test-kita' } });
    render(jsx);
    expect(screen.getByText('Detail-Test-Kita')).toBeInTheDocument();
    expect(screen.getByText(/Teststadt/)).toBeInTheDocument();
    expect(screen.getByAltText(/QR-Code zu Detail-Test-Kita/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- app/einrichtungen/\[slug\]`
Expected: FAIL — Modul `../page` nicht gefunden.

- [ ] **Step 8: `[slug]/page.tsx` implementieren**

```tsx
// stiftung-web/app/einrichtungen/[slug]/page.tsx
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SpendenRechner } from '@/components/SpendenRechner';
import { formatEuro } from '@/lib/calc/format';
import { getEinrichtungBySlug } from '@/lib/server/einrichtungenService';

export default async function EinrichtungDetailPage({ params }: { params: { slug: string } }) {
  const einrichtung = await getEinrichtungBySlug(params.slug);
  if (!einrichtung) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/einrichtungen/${einrichtung!.slug}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 180 });

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <p className="eyebrow">{einrichtung!.typ}</p>
        <h1>{einrichtung!.name}</h1>
        <p className="muted">{einrichtung!.ort} · {einrichtung!.kinderAnzahl} Kinder</p>
      </div>

      <Card>
        <p className="eyebrow">Finanztopf</p>
        <ProgressBar
          value={einrichtung!.aktuellesKapital}
          max={einrichtung!.zielKapital}
          label={`${formatEuro(einrichtung!.aktuellesKapital)} von ${formatEuro(einrichtung!.zielKapital)} (Ziel: finanzielle Unabhängigkeit)`}
        />
      </Card>

      <Card>
        <p className="eyebrow">Spendenrechner</p>
        <SpendenRechner einrichtung={einrichtung!} />
      </Card>

      <Card>
        <p className="eyebrow">Für Vorträge & Events</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR-Code zu ${einrichtung!.name}`}
            width={140}
            height={140}
            style={{ borderRadius: 'var(--radius-sm)', background: 'var(--qr-bg)', padding: '8px' }}
          />
          <p className="muted" style={{ maxWidth: '32ch' }}>
            QR-Code scannen, um direkt auf dieser Seite zu landen — praktisch für Vorträge oder Spendenaktionen vor Ort.
          </p>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 9: `loading.tsx` und `error.tsx` für die Route ergänzen**

```tsx
// stiftung-web/app/einrichtungen/[slug]/loading.tsx
import { LoadingState } from '@/components/LoadingState';

export default function Loading() {
  return <LoadingState label="Einrichtung wird geladen …" />;
}
```

```tsx
// stiftung-web/app/einrichtungen/[slug]/error.tsx
'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} label="Einrichtung konnte nicht geladen werden." />;
}
```

- [ ] **Step 10: Test erneut ausführen**

Run: `npm run test -- app/einrichtungen`
Expected: alle PASS (Liste, Filter, Detail inkl. QR-Code).

- [ ] **Step 11: Manuell im Browser verifizieren**

Run: `npm run dev`, eine Einrichtungs-URL öffnen (z. B. `http://localhost:3000/einrichtungen/tagesmutter-wirbelwind-muenchen`).
Expected: Regler bewegen → Jahres-Anzeige ändert sich sofort ohne Netzwerk-Request (DevTools-Network-Tab prüfen). QR-Code sichtbar und mit einem Handy scannbar (führt zur gleichen URL). Server stoppen.

- [ ] **Step 12: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/app/einrichtungen/\[slug\] stiftung-web/components/SpendenRechner.tsx stiftung-web/components/__tests__/SpendenRechner.test.tsx stiftung-web/package.json stiftung-web/package-lock.json
git commit -m "feat: Einrichtungs-Detailseite mit live simuliertem Spendenrechner, QR-Code, Loading-/Error-States"
```

---

### Task 19: Echte Spielgeld-Buchung + Share-Button + Spendenquittung (Mock)

**Files:**
- Modify: `stiftung-web/components/SpendenRechner.tsx`
- Create: `stiftung-web/components/SpendenBestaetigung.tsx`
- Test: `stiftung-web/components/__tests__/SpendenBestaetigung.test.tsx`
- Modify: `stiftung-web/components/__tests__/SpendenRechner.test.tsx`

**Interfaces:**
- Produces: `SpendenBestaetigung({ betrag, frequenz, einrichtungName, neuesKapital, spendeId }): JSX.Element` — zeigt gebuchten Betrag, neuen Kapitalstand, Spielgeld-Hinweis, Share-Button (Web Share API + WhatsApp-Link-Fallback), aufklappbare Mock-Spendenquittung mit Beleg-Nummer und Druck-Button.
- `SpendenRechner` bekommt Button "Jetzt spenden", der `POST /api/einrichtungen/:slug/spenden` aufruft, mit Loading-/Error-/Erfolgs-Zustand.

- [ ] **Step 1: Failing Test für `SpendenBestaetigung` schreiben**

```tsx
// stiftung-web/components/__tests__/SpendenBestaetigung.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpendenBestaetigung } from '../SpendenBestaetigung';

afterEach(() => {
  vi.unstubAllGlobals();
});

const props = {
  betrag: 50,
  frequenz: 'jaehrlich' as const,
  einrichtungName: 'Tagespflege Wirbelwind',
  neuesKapital: 3050,
  spendeId: 'spende-123',
};

describe('SpendenBestaetigung', () => {
  it('zeigt Betrag, Frequenz, neuen Kapitalstand und einen Spielgeld-Hinweis', () => {
    render(<SpendenBestaetigung {...props} />);
    expect(screen.getByText(/50,00 €/)).toBeInTheDocument();
    expect(screen.getByText(/jährlich/i)).toBeInTheDocument();
    expect(screen.getByText(/3.050,00 €/)).toBeInTheDocument();
    expect(screen.getByText(/Spielgeld/i)).toBeInTheDocument();
  });

  it('zeigt einen WhatsApp-Share-Link mit dem Spendentext', () => {
    render(<SpendenBestaetigung {...props} />);
    const link = screen.getByRole('link', { name: /WhatsApp/i });
    expect(link.getAttribute('href')).toContain('wa.me');
  });

  it('nutzt navigator.share, wenn verfügbar', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: shareMock });
    const user = userEvent.setup();
    render(<SpendenBestaetigung {...props} />);
    await user.click(screen.getByRole('button', { name: 'Teilen' }));
    expect(shareMock).toHaveBeenCalled();
  });

  it('zeigt eine Spendenquittung mit Beleg-Nummer nach Aufklappen', async () => {
    const user = userEvent.setup();
    render(<SpendenBestaetigung {...props} />);
    await user.click(screen.getByText(/Spendenquittung anzeigen/i));
    expect(screen.getByText(/spende-123/)).toBeInTheDocument();
    expect(screen.getByText(/Demo-Dokument/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- SpendenBestaetigung`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `SpendenBestaetigung.tsx` implementieren**

```tsx
// stiftung-web/components/SpendenBestaetigung.tsx
'use client';

import { formatEuro } from '@/lib/calc/format';
import { Card } from './Card';
import { StatusChip } from './StatusChip';

export function SpendenBestaetigung({
  betrag,
  frequenz,
  einrichtungName,
  neuesKapital,
  spendeId,
}: {
  betrag: number;
  frequenz: 'einmalig' | 'jaehrlich';
  einrichtungName: string;
  neuesKapital: number;
  spendeId: string;
}) {
  const shareText = `Ich habe gerade ${formatEuro(betrag)} an ${einrichtungName} gespendet — mach mit!`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Meine Spende', text: shareText, url: shareUrl });
    } else if (typeof window !== 'undefined') {
      window.alert('Teilen wird von diesem Browser nicht unterstützt — nutze den WhatsApp-Link.');
    }
  }

  return (
    <Card>
      <StatusChip tone="forecast">Spielgeld — echte Buchung, kein echtes Geld</StatusChip>
      <h2 style={{ marginTop: '0.75rem' }}>Danke für Ihre Spende!</h2>
      <p>{formatEuro(betrag)} {frequenz === 'jaehrlich' ? 'jährlich' : 'einmalig'} für {einrichtungName}.</p>
      <p className="muted">
        Neuer Kapitalstand im Finanztopf: <strong>{formatEuro(neuesKapital)}</strong> — real in
        der Datenbank gespeichert. In der Live-Version folgt hier echte
        Zahlungsabwicklung (Stripe/PayPal) sowie bei Auszahlung an eine
        Einrichtung die verifizierte Zugangsprüfung (KYC).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button type="button" className="pill pill-secondary" onClick={handleShare}>
          Teilen
        </button>
        <a
          className="pill pill-secondary"
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      </div>

      <details style={{ marginTop: '1rem' }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>Spendenquittung anzeigen</summary>
        <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
          <p className="eyebrow">Spendenquittung (Demo)</p>
          <p>Beleg-Nr.: {spendeId}</p>
          <p>Betrag: {formatEuro(betrag)} ({frequenz === 'jaehrlich' ? 'jährlich' : 'einmalig'})</p>
          <p>Empfänger: {einrichtungName}</p>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Demo-Dokument, nicht steuerlich gültig — echte Quittungen folgen mit dem Payment-Backend.
          </p>
          <button type="button" className="pill pill-secondary" onClick={() => window.print()}>
            Drucken / Als PDF speichern
          </button>
        </div>
      </details>
    </Card>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- SpendenBestaetigung`
Expected: alle PASS.

- [ ] **Step 5: Failing Test für den echten POST-Flow in `SpendenRechner` ergänzen**

An `stiftung-web/components/__tests__/SpendenRechner.test.tsx` anhängen (Import-Zeile am Dateianfang um `vi, afterEach` ergänzen):

```tsx
// Ergänzung in stiftung-web/components/__tests__/SpendenRechner.test.tsx
import { vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('sendet POST an den Spenden-Endpoint und zeigt die Bestätigung mit neuem Kapitalstand', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      einrichtung: { ...einrichtung, aktuellesKapital: 3050 },
      spende: { id: 'spende-123', betrag: 50, frequenz: 'einmalig' },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);

  const user = userEvent.setup();
  render(<SpendenRechner einrichtung={einrichtung} />);
  await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

  expect(fetchMock).toHaveBeenCalledWith(
    `/api/einrichtungen/${einrichtung.slug}/spenden`,
    expect.objectContaining({ method: 'POST' })
  );
  expect(await screen.findByText(/Spielgeld/i)).toBeInTheDocument();
  expect(await screen.findByText(/3.050,00 €/)).toBeInTheDocument();
});

it('zeigt einen Fehlertext, wenn die Buchung fehlschlägt', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  const user = userEvent.setup();
  render(<SpendenRechner einrichtung={einrichtung} />);
  await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
  expect(await screen.findByText(/Spende konnte nicht gebucht werden/i)).toBeInTheDocument();
});
```

- [ ] **Step 6: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- SpendenRechner`
Expected: FAIL — Button "Jetzt spenden" existiert noch nicht.

- [ ] **Step 7: `SpendenRechner.tsx` um echten Buchungs-Flow erweitern**

In `stiftung-web/components/SpendenRechner.tsx`:

```tsx
// Import ergänzen
import { SpendenBestaetigung } from './SpendenBestaetigung';

// im Funktionskörper, nach den bestehenden useState-Aufrufen:
const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
const [neuesKapital, setNeuesKapital] = useState<number | null>(null);
const [spendeId, setSpendeId] = useState<string | null>(null);

async function handleSpenden() {
  setStatus('loading');
  try {
    const res = await fetch(`/api/einrichtungen/${einrichtung.slug}/spenden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betrag, frequenz }),
    });
    if (!res.ok) throw new Error('request_failed');
    const { einrichtung: updated, spende } = await res.json();
    setNeuesKapital(updated.aktuellesKapital);
    setSpendeId(spende.id);
    setStatus('done');
  } catch {
    setStatus('error');
  }
}

// am Ende des JSX, nach dem StatusChip-Block, ergänzen:
<button type="button" className="pill pill-primary" onClick={handleSpenden} disabled={status === 'loading'}>
  {status === 'loading' ? 'Wird gebucht …' : 'Jetzt spenden'}
</button>

{status === 'error' && (
  <p className="negative">Spende konnte nicht gebucht werden. Bitte erneut versuchen.</p>
)}

{status === 'done' && neuesKapital !== null && spendeId && (
  <SpendenBestaetigung
    betrag={betrag}
    frequenz={frequenz}
    einrichtungName={einrichtung.name}
    neuesKapital={neuesKapital}
    spendeId={spendeId}
  />
)}
```

- [ ] **Step 8: Tests erneut ausführen**

Run: `npm run test -- SpendenRechner SpendenBestaetigung`
Expected: alle PASS.

- [ ] **Step 9: Manuell im Browser verifizieren (echte End-to-End-Buchung)**

Run: `npm run dev`, Detailseite einer Einrichtung öffnen, Betrag einstellen, "Jetzt spenden" klicken.
Expected: Button zeigt kurz "Wird gebucht …", danach Bestätigungs-Card mit neuem Kapitalstand, WhatsApp-Link und aufklappbarer Quittung. Seite neu laden (F5) → Finanztopf-Fortschrittsbalken zeigt den erhöhten Wert (Beweis für echte Persistenz). Server stoppen.

- [ ] **Step 10: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/components/SpendenRechner.tsx stiftung-web/components/SpendenBestaetigung.tsx stiftung-web/components/__tests__/SpendenBestaetigung.test.tsx stiftung-web/components/__tests__/SpendenRechner.test.tsx
git commit -m "feat: echte Spielgeld-Buchung mit Share-Button und Mock-Spendenquittung"
```

---

### Task 20: Solidaritätsfonds-Seite (UI)

**Files:**
- Create: `stiftung-web/components/SolidaritaetsfondsPanel.tsx` (Client Component)
- Test: `stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx`
- Create: `stiftung-web/app/solidaritaetsfonds/page.tsx` (Server Component)
- Create: `stiftung-web/app/solidaritaetsfonds/loading.tsx`, `app/solidaritaetsfonds/error.tsx`

**Interfaces:**
- Consumes: `getFondsBestand` (Task 12), `Card`, `StatusChip`, `LoadingState`, `ErrorState` (Task 4), `formatEuro` (Task 5).
- Produces: `SolidaritaetsfondsPanel({ initialBestand }): JSX.Element` — Bestand-Anzeige, Einzahl-Formular (POST `/api/solidaritaetsfonds/spenden`), "Jetzt verteilen"-Button (POST `/api/solidaritaetsfonds/verteilen`), Ergebnis-Liste.

- [ ] **Step 1: Failing Test schreiben**

```tsx
// stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SolidaritaetsfondsPanel } from '../SolidaritaetsfondsPanel';

afterEach(() => vi.unstubAllGlobals());

describe('SolidaritaetsfondsPanel', () => {
  it('zeigt den initialen Bestand', () => {
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    expect(screen.getByText(/120,00 €/)).toBeInTheDocument();
  });

  it('zahlt ein und aktualisiert den Bestand aus der Server-Antwort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bestand: 170 }) }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /In den Fonds einzahlen/i }));
    expect(await screen.findByText(/170,00 €/)).toBeInTheDocument();
  });

  it('verteilt und zeigt das Ergebnis, setzt Bestand auf 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ verteiltGesamt: 120, verteilung: [{ slug: 'arm', name: 'Arme Kita', anteil: 120 }] }),
      })
    );
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jetzt verteilen/i }));
    expect(await screen.findByText(/Arme Kita: 120,00 €/)).toBeInTheDocument();
    expect(screen.getByText('0,00 €')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm run test -- SolidaritaetsfondsPanel`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `SolidaritaetsfondsPanel.tsx` implementieren**

```tsx
// stiftung-web/components/SolidaritaetsfondsPanel.tsx
'use client';

import { useState } from 'react';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { formatEuro } from '@/lib/calc/format';

export function SolidaritaetsfondsPanel({ initialBestand }: { initialBestand: number }) {
  const [bestand, setBestand] = useState(initialBestand);
  const [betrag, setBetrag] = useState(50);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [verteilung, setVerteilung] = useState<{ slug: string; name: string; anteil: number }[] | null>(null);

  async function handleSpenden() {
    setStatus('loading');
    try {
      const res = await fetch('/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrag }),
      });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setBestand(json.bestand);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  async function handleVerteilen() {
    setStatus('loading');
    try {
      const res = await fetch('/api/solidaritaetsfonds/verteilen', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setVerteilung(json.verteilung);
      setBestand(0);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <StatusChip tone="forecast">Spielgeld — echte Buchung, kein echtes Geld</StatusChip>
      <p className="eyebrow" style={{ marginTop: '0.75rem' }}>Aktueller Bestand</p>
      <p className="hero-number" style={{ fontSize: '2.4rem' }}>{formatEuro(bestand)}</p>

      <label style={{ display: 'block', marginTop: '1rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Allgemein spenden</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            aria-label="Betrag für den Solidaritätsfonds"
            type="number"
            min={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value) || 0)}
            style={{ width: '6rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <button type="button" className="pill pill-primary" onClick={handleSpenden} disabled={status === 'loading'}>
            In den Fonds einzahlen
          </button>
        </div>
      </label>

      <button
        type="button"
        className="pill pill-secondary"
        style={{ marginTop: '1rem' }}
        onClick={handleVerteilen}
        disabled={status === 'loading' || bestand <= 0}
      >
        Jetzt verteilen
      </button>

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}

      {verteilung && (
        <div style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Letzte Verteilung</p>
          {verteilung.length === 0 ? (
            <p className="muted">Kein Bedarf — alle Einrichtungen haben ihr Pro-Kind-Ziel erreicht.</p>
          ) : (
            <ul>
              {verteilung.map((v) => (
                <li key={v.slug}>{v.name}: {formatEuro(v.anteil)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Test erneut ausführen**

Run: `npm run test -- SolidaritaetsfondsPanel`
Expected: alle PASS.

- [ ] **Step 5: Server-Component-Seite schreiben**

```tsx
// stiftung-web/app/solidaritaetsfonds/page.tsx
import { Card } from '@/components/Card';
import { SolidaritaetsfondsPanel } from '@/components/SolidaritaetsfondsPanel';
import { getFondsBestand } from '@/lib/server/solidaritaetsfondsService';

export default async function SolidaritaetsfondsPage() {
  const bestand = await getFondsBestand();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Solidaritätsfonds</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Wer nicht gezielt an eine Einrichtung spenden möchte, spendet hier
          allgemein. Die Verteilung folgt dem Leitbild-Prinzip: Einrichtungen
          mit dem größten Pro-Kind-Abstand zu ihrem Ziel bekommen
          überproportional mehr — kein Geld bleibt ungenutzt liegen, solange
          irgendwo Bedarf besteht.
        </p>
      </div>
      <Card>
        <p className="eyebrow">Wie die Verteilung rechnet</p>
        <p className="muted">
          Bedarf pro Einrichtung = Zielkapital ÷ Kinderanzahl − aktuelles
          Kapital ÷ Kinderanzahl (mindestens 0). Der Fonds-Bestand wird
          proportional zum Bedarf aufgeteilt — wer pro Kind am wenigsten hat,
          bekommt den größten Anteil.
        </p>
      </Card>
      <SolidaritaetsfondsPanel initialBestand={bestand} />
    </div>
  );
}
```

- [ ] **Step 6: `loading.tsx` und `error.tsx` für die Route ergänzen**

```tsx
// stiftung-web/app/solidaritaetsfonds/loading.tsx
import { LoadingState } from '@/components/LoadingState';

export default function Loading() {
  return <LoadingState label="Solidaritätsfonds wird geladen …" />;
}
```

```tsx
// stiftung-web/app/solidaritaetsfonds/error.tsx
'use client';

import { ErrorState } from '@/components/ErrorState';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} reset={reset} label="Solidaritätsfonds konnte nicht geladen werden." />;
}
```

- [ ] **Step 7: Manuell im Browser verifizieren**

Run: `npm run dev`, `http://localhost:3000/solidaritaetsfonds` öffnen. Betrag eingeben, "In den Fonds einzahlen" klicken → Bestand steigt. "Jetzt verteilen" klicken → Ergebnis-Liste erscheint, Bestand auf 0. Auf `/einrichtungen` prüfen, dass die begünstigten Einrichtungen einen höheren Kapitalstand zeigen. Server stoppen.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/components/SolidaritaetsfondsPanel.tsx stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx stiftung-web/app/solidaritaetsfonds
git commit -m "feat: Solidaritätsfonds-Seite (einzahlen, verteilen, Ergebnis anzeigen), Loading-/Error-States"
```

---

### Task 21: Gesamter Testlauf, End-to-End-Smoke-Test, README

**Files:**
- Create: `stiftung-web/README.md`
- Modify: `/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/projekt-status.md`

- [ ] **Step 1: Vollständigen Testlauf ausführen**

Run: `cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/stiftung-web" && npm run test`
Expected: `pretest` setzt Test-DB zurück, alle Tests aus Task 1–20 PASS.

- [ ] **Step 2: Production-Build verifizieren**

Run: `npm run build`
Expected: Build läuft ohne TypeScript-/ESLint-Fehler durch.

- [ ] **Step 3: `README.md` schreiben**

```markdown
# Deutsche Bildungsstiftung — lokale Website

Lokale Demo-Version (Next.js + SQLite/Prisma). Kein echtes Payment, kein
echtes Geld — aber ein echtes, laufendes Backend: Spenden werden real in
einer lokalen SQLite-Datenbank gebucht ("Spielgeld"), inklusive eines aktiv
wirkenden Solidaritäts-Umverteilungsmechanismus.

## Lokal starten

\`\`\`bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
\`\`\`

Danach `http://localhost:3000` öffnen.

## Tests

\`\`\`bash
npm run test
\`\`\`

Setzt vor jedem Lauf automatisch `prisma/test.db` zurück (`pretest`-Skript)
und testet Service-Layer und API-Routes gegen eine echte SQLite-Datei —
keine gemockte Datenbank.

## Struktur

- `app/` — Seiten (Landing, Einrichtungen, Statistik, Solidaritätsfonds) + `app/api/**` (Backend-HTTP-Schnittstelle)
- `components/` — UI-Bausteine (Design-Tokens aus `app/globals.css`)
- `lib/calc/` — clientseitige Spendenrechner-Simulation + Solidaritäts-Verteilungsformel (beide pure Funktionen, DB-unabhängig)
- `lib/server/` — Backend-Service-Layer (Prisma-Zugriff, Buchungslogik, Fonds-Verteilung, Statistik)
- `prisma/` — DB-Schema und Seed-Daten (8 Einrichtungen, Tagespflege-Schwerpunkt nach Leitbild Phase 1)

## Solidaritätsfonds

Nicht zweckgebundene Spenden sammeln sich im Fonds. Eine Verteilung berechnet
pro Einrichtung den Pro-Kind-Abstand zum Ziel (`bedarfProKind`) und teilt den
Fonds-Bestand proportional dazu auf — Einrichtungen mit dem größten Rückstand
bekommen am meisten. Besteht nirgends Bedarf, bleibt der Fonds bewusst
unangetastet statt sinnlos verteilt zu werden.

## Was hier bewusst fehlt (lokale Version)

- Kein echtes Payment (Stripe/PayPal) — Buchung ist real in der DB, aber ohne echtes Zahlungsmittel ("Spielgeld").
- Kein Login/KYC — Spenden sind anonym.
- Keine Auszahlung an Einrichtungen (nur Zufluss modelliert, kein Abfluss aus der Stiftung heraus).
- Kein Arbeits-Konto/Fonds-Konto-Split — pro Einrichtung nur ein `aktuellesKapital`-Feld.

Diese Punkte sind laut Leitbild (`../leitbild.md`) die nächsten Schritte für
eine Produktions-Version.
```

- [ ] **Step 4: Manuellen End-to-End-Durchklick-Test im Browser durchführen**

Run: `npm run dev`, dann im Browser:
1. `http://localhost:3000` — Hero + CTA sichtbar.
2. "Einrichtung finden" → Liste lädt aus DB, Filter nach Typ "Tagespflege" testen.
3. Eine Einrichtung anklicken → Detailseite, Regler bewegen → Jahres-Anzeige live, kein Network-Request, QR-Code sichtbar.
4. Betrag + "Jährlich" wählen → Level-Chip erscheint. "Jetzt spenden" klicken → Bestätigung mit neuem Kapitalstand, WhatsApp-Share-Link, aufklappbarer Quittung.
5. Seite neu laden → Fortschrittsbalken zeigt den erhöhten, persistierten Wert.
6. `http://localhost:3000/statistik` — Ø-Volumen, Zufluss, simulierter Ertrag, Balkendiagramm, Top-/Bottom-Listen.
7. `http://localhost:3000/solidaritaetsfonds` — einzahlen, verteilen, Ergebnis-Liste prüfen, danach auf `/einrichtungen` verifizieren, dass die bedürftigste Einrichtung mehr bekommen hat als eine bereits gut finanzierte.

Expected: keine Konsolenfehler, alle Interaktionen wie beschrieben, Persistenz nach Reload bestätigt, Solidaritätsfonds bevorzugt nachweislich die bedürftigste Einrichtung. Beim schnellen Neuladen der vier DB-gestützten Seiten (`/einrichtungen`, `/einrichtungen/[slug]`, `/statistik`, `/solidaritaetsfonds`) ist kurz `loading.tsx` sichtbar (ggf. Netzwerk-Drosselung in DevTools nutzen, da lokale SQLite-Reads sonst zu schnell sind, um es zu sehen). Server danach stoppen.

- [ ] **Step 5: `projekt-status.md` im Repo-Root aktualisieren**

In `/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal/projekt-status.md` den Abschnitt "Aktueller Stand" ergänzen: Code-Stand liegt jetzt unter `stiftung-web/` (Next.js + Prisma/SQLite), Backend ist real und getestet (kein Mock), Solidaritätsfonds aktiv, Payment/KYC weiterhin offen.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/external/TobiCodetEndlichWieder/stiftung/.claude/worktrees/website-rebuild-lokal"
git add stiftung-web/README.md projekt-status.md
git commit -m "docs: README für lokale Ausführung + Projekt-Status aktualisiert"
```

---

## Nach Abschluss

Lokale Version lauffähig: `npm run dev` in `stiftung-web/` zeigt Landing,
Einrichtungen-Suche, Einrichtungs-Detail mit clientseitig live simuliertem
Spendenrechner (6 % Netto-Wachstum, Level-Gamification, QR-Code), einem
**echten Backend** (Spenden persistieren über Reloads hinweg, Service-Layer
und API-Routes sind gegen eine echte Test-Datenbank integrationsgetestet),
Share-Button + Mock-Spendenquittung, erweiterter Statistik und einem
**aktiv wirkenden Solidaritätsfonds**, der nicht zweckgebundene Spenden real
nach Bedarf auf die am wenigsten geförderten Einrichtungen verteilt — der
Kernmechanismus aus dem Leitbild, nicht nur eine informative Rangliste.

**Nicht Teil dieses Plans** (nächste Schritte laut Leitbild/`projekt-status.md`, brauchen eigenen Plan): echtes Payment (Stripe/PayPal), KYC-Zugangsprüfung, Spender-Konten, Arbeits-Konto/Fonds-Konto-Split, Auszahlung an Einrichtungen, Deployment/Hosting, Zukunftswert-Framing im Rechner ("50€ → 40.000€"-Story, bewusst zurückgestellt).
