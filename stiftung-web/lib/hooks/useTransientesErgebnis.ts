'use client';

import { useCallback, useState } from 'react';

// --- Remount-Restore für transiente Aktions-Ergebnisse ----------------------
// Next 14 remountet den Client-Subtree einer Route mit loading.tsx beim
// ERSTEN router.refresh() nach der Hydration (danach nicht mehr) — im echten
// Browser reproduziert (siehe Commit 4629e52: MutationObserver, kein
// Full-Reload). Frisch gesetzte useState-Stände fallen dabei auf ihre
// Initialwerte zurück; ein gerade gezeigtes Aktions-Ergebnis (Bestätigung,
// Kurs-Zeile, Kaskaden-Sequenz) verschwindet ~20 ms nach dem Erscheinen.
// RTL-Tests sehen das nie, weil sie refresh als No-op mocken — der
// Remount-Effekt entspricht dort unmount() + neuem render().
//
// Dieser Hook ersetzt useState für genau solche Ergebnisse: Der Setter
// sichert jeden Wert zusätzlich im Modul-Scope, der useState-Initializer
// restauriert ihn beim Remount.
// ponytail: Frische-Fenster statt echter Remount-Erkennung — React/Next
// bieten keinen Weg, den Refresh-Remount von einer normalen Rück-Navigation
// zu unterscheiden. Innerhalb des Fensters erscheint das Ergebnis bei
// Rückkehr auf dieselbe Seite erneut (harmlos, gleiche Daten); danach nicht
// mehr. Obsolet, sobald eine Next-Version beim refresh nicht mehr remountet.

const FRISCHE_FENSTER_MS = 10_000;

const snapshots = new Map<string, { um: number; wert: unknown }>();

// Nur für Tests: Der Modul-Scope-Speicher überlebt Testgrenzen und muss dort
// pro Test zurückgesetzt werden.
export function verwerfeTransienteErgebnisse() {
  snapshots.clear();
}

export function useTransientesErgebnis<T>(key: string): [T | null, (wert: T) => void] {
  const [wert, setWert] = useState<T | null>(() => {
    const eintrag = snapshots.get(key);
    if (!eintrag || Date.now() - eintrag.um >= FRISCHE_FENSTER_MS) return null;
    return eintrag.wert as T;
  });

  const setzeUndSichere = useCallback(
    (neu: T) => {
      snapshots.set(key, { um: Date.now(), wert: neu });
      setWert(neu);
    },
    [key]
  );

  return [wert, setzeUndSichere];
}
