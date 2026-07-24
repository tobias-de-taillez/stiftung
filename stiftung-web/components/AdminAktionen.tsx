'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { KaskadenErgebnis } from './KaskadenErgebnis';
import { formatEuroFromCent } from '@/lib/calc/format';
import type { KontenLage } from '@/lib/server/kontenService';
import type { KaskadenlaufErgebnis } from '@/lib/server/kaskadeService';

// Logik/Copy 1:1 aus dem heutigen SolidaritaetsfondsPanel übernommen (Task
// 6) — nur die URLs zeigen jetzt auf /api/admin/*, die Handler dort prüfen
// pruefeAdminSession (Task 3). Kein lokaler Kontenlage-Spiegel: `lage` kommt
// als Prop vom Server, router.refresh() holt nach jeder Aktion einen
// frischen Stand.
type MarktjahrErgebnis = { einrichtungsDepotDeltaCent: number; soliDepotDeltaCent: number };
type AuszahlungErgebnis = { summeCent: number; anzahl: number };

// --- Remount-Restore für die transienten Aktions-Ergebnisse ------------------
// Next 14 remountet den Client-Subtree einer Seite beim ERSTEN router.refresh()
// nach der Hydration (danach nicht mehr) — Kurs-Zeile, Kaskaden-Ergebnis und
// Auszahlungslauf-Zeile fielen auf null zurück und verschwänden ~20 ms nach
// dem Erscheinen. RTL-Tests sehen das nie, weil sie refresh als No-op mocken.
// Deshalb werden die Ergebnisse VOR dem refresh() außerhalb des React-Baums
// (Modul-Scope) gesichert und beim Remount über die useState-Initializer
// wiederhergestellt — dasselbe Muster wie der BuchungsSnapshot in
// SpendenRechner.tsx (Task-16-Report).
// ponytail: Frische-Fenster statt echter Remount-Erkennung — React/Next bieten
// keinen Weg, den Refresh-Remount von einer normalen Rück-Navigation zu
// unterscheiden. Innerhalb des Fensters erscheint das Ergebnis bei Rückkehr
// auf die Seite erneut (harmlos, gleiche Daten); danach nicht mehr. Obsolet,
// sobald eine Next-Version beim refresh nicht mehr remountet.
interface ErgebnisSnapshot {
  gebuchtUm: number;
  marktjahrErgebnis: MarktjahrErgebnis | null;
  kaskadeErgebnis: KaskadenlaufErgebnis | null;
  auszahlungErgebnis: AuszahlungErgebnis | null;
}

const RESTORE_FENSTER_MS = 10_000;

let letztesErgebnis: ErgebnisSnapshot | null = null;

// Nur für Tests: Der Modul-Scope-Snapshot überlebt Testgrenzen und muss dort
// pro Test zurückgesetzt werden.
export function verwerfeLetztesErgebnis() {
  letztesErgebnis = null;
}

function restauriereErgebnis(): ErgebnisSnapshot | null {
  if (letztesErgebnis && Date.now() - letztesErgebnis.gebuchtUm < RESTORE_FENSTER_MS) {
    return letztesErgebnis;
  }
  return null;
}

async function postJson(url: string, body?: unknown, method: 'POST' | 'PUT' = 'POST'): Promise<Response> {
  return fetch(url, {
    method,
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

export function AdminAktionen({ lage }: { lage: KontenLage }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [capBetrag, setCapBetrag] = useState(lage.managementCapCent / 100);

  // Lazy-Initializer: läuft genau einmal pro Mount — beim Refresh-Remount
  // liefert er den Snapshot der gerade ausgeführten Aktion zurück (s. o.).
  // Kein Slug-Guard nötig: die Komponente existiert genau einmal (Admin-Seite).
  const [restauriert] = useState(() => restauriereErgebnis());
  const [marktjahrErgebnis, setMarktjahrErgebnis] = useState<MarktjahrErgebnis | null>(
    restauriert?.marktjahrErgebnis ?? null
  );
  const [kaskadeErgebnis, setKaskadeErgebnis] = useState<KaskadenlaufErgebnis | null>(
    restauriert?.kaskadeErgebnis ?? null
  );
  const [auszahlungErgebnis, setAuszahlungErgebnis] = useState<AuszahlungErgebnis | null>(
    restauriert?.auszahlungErgebnis ?? null
  );

  async function handleMarktjahr() {
    setStatus('loading');
    try {
      const res = await postJson('/api/admin/marktjahr');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      const neuesErgebnis = {
        einrichtungsDepotDeltaCent: json.einrichtungsDepotDeltaCent,
        soliDepotDeltaCent: json.soliDepotDeltaCent,
      };
      setMarktjahrErgebnis(neuesErgebnis);
      setStatus('idle');
      // Snapshot VOR dem refresh() sichern: Der erste refresh() nach der
      // Hydration remountet diesen Subtree (s. Kommentar am Modul-Kopf) —
      // der Remount restauriert die Ergebnisse aus genau diesem Snapshot.
      letztesErgebnis = { gebuchtUm: Date.now(), marktjahrErgebnis: neuesErgebnis, kaskadeErgebnis, auszahlungErgebnis };
      // Der Kurs wird nur gestellt, nicht gebucht — kein Topf ändert sich
      // (Spec §2). router.refresh() holt trotzdem den frischen Poolwert/
      // Fondswert für die Kontenübersicht.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleJahresabschluss() {
    setStatus('loading');
    try {
      const res = await postJson('/api/admin/jahresabschluss');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setKaskadeErgebnis(json);
      setStatus('idle');
      // Snapshot VOR dem refresh() — s. handleMarktjahr oben.
      letztesErgebnis = { gebuchtUm: Date.now(), marktjahrErgebnis, kaskadeErgebnis: json, auszahlungErgebnis };
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleAuszahlungslauf() {
    setStatus('loading');
    try {
      const res = await postJson('/api/admin/auszahlungslauf');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      const neuesErgebnis = { summeCent: json.summeCent, anzahl: json.anzahl };
      setAuszahlungErgebnis(neuesErgebnis);
      setStatus('idle');
      // Snapshot VOR dem refresh() — s. handleMarktjahr oben.
      letztesErgebnis = { gebuchtUm: Date.now(), marktjahrErgebnis, kaskadeErgebnis, auszahlungErgebnis: neuesErgebnis };
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleCapSpeichern() {
    setStatus('loading');
    try {
      const capCent = Math.round(capBetrag * 100);
      const res = await postJson('/api/admin/cap', { capCent }, 'PUT');
      if (!res.ok) throw new Error('failed');
      await res.json();
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <p className="eyebrow">Admin-Aktionen</p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <button type="button" className="pill pill-secondary" onClick={handleMarktjahr} disabled={status === 'loading'}>
          Marktjahr simulieren (+7 % Kurs)
        </button>
        <button type="button" className="pill pill-secondary" onClick={handleJahresabschluss} disabled={status === 'loading'}>
          Jahresabschluss ausführen (Kaskade)
        </button>
        <button type="button" className="pill pill-secondary" onClick={handleAuszahlungslauf} disabled={status === 'loading'}>
          Auszahlungslauf (Monat)
        </button>
      </div>

      <label style={{ display: 'block', marginTop: '1.5rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Management-Cap ändern</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            aria-label="Management-Cap in Euro"
            type="number"
            min={0}
            value={capBetrag}
            onChange={(e) => setCapBetrag(Number(e.target.value) || 0)}
            style={{ width: '7rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <button type="button" className="pill pill-secondary" onClick={handleCapSpeichern} disabled={status === 'loading'}>
            Cap speichern
          </button>
        </div>
      </label>

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}

      {marktjahrErgebnis && (
        <p style={{ marginTop: '1rem' }}>
          {`Kurs: Einrichtungs-Depot +${formatEuroFromCent(marktjahrErgebnis.einrichtungsDepotDeltaCent)}, Soli-Depot +${formatEuroFromCent(marktjahrErgebnis.soliDepotDeltaCent)} — kein einziger Topf wurde geschrieben.`}
        </p>
      )}

      {kaskadeErgebnis && <KaskadenErgebnis key={kaskadeErgebnis.nummer} {...kaskadeErgebnis} />}

      {auszahlungErgebnis && (
        <p style={{ marginTop: '1rem' }}>
          {auszahlungErgebnis.anzahl > 0
            ? `${formatEuroFromCent(auszahlungErgebnis.summeCent)} in ${auszahlungErgebnis.anzahl} Auszahlungen überwiesen.`
            : 'Nichts offen.'}
        </p>
      )}
    </Card>
  );
}
