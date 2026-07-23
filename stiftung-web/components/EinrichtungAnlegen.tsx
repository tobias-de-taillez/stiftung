'use client';

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { formatEuroFromCent } from '@/lib/calc/format';

type Typ = 'tagespflege' | 'kita' | 'schule';

interface AnlageErgebnis {
  dedup: boolean;
  slug: string;
  erstbefuellungCent: number;
  einrichtung: { name: string; topfwertCent: number; zielKapitalCent: number };
}

// Debounce-Fenster für den Zusage-Fetch (Spec §3.0): kein Persistenz-Call,
// nur eine live berechnete Anzeige — die Wartezeit erspart einen Request pro
// Tastenanschlag im Betragsfeld.
const ZUSAGE_DEBOUNCE_MS = 400;

const feldStyle: CSSProperties = {
  padding: '0.6rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--cream)',
};

/**
 * Neue-Einrichtung-Formular (Task 17, Spec §3.0).
 *
 * Stufe 1 (dieses Formular) lebt ausschließlich im Browser-State: kein
 * Draft, kein localStorage, kein Persistenz-Call vor der Spende — nur der
 * lesende GET auf /api/erstbefuellung für die Live-Zusage, der nichts
 * bucht. Erst der Submit (Stufe 2) löst den einzigen schreibenden Call aus
 * (POST /api/einrichtungen), der Einrichtung + Erstbefüllung + Spende in
 * einer Transaktion bucht.
 */
export function EinrichtungAnlegen() {
  const [name, setName] = useState('');
  const [typ, setTyp] = useState<Typ>('kita');
  const [ort, setOrt] = useState('');
  const [kinderAnzahl, setKinderAnzahl] = useState(10);
  const [betrag, setBetrag] = useState(25);

  const [zusageCent, setZusageCent] = useState<number | null>(null);
  const [zusageLaedt, setZusageLaedt] = useState(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<AnlageErgebnis | null>(null);

  // Live-Zusage: debounced GET, bucht nichts (Spec §3.0 "Darstellungspflicht").
  useEffect(() => {
    const betragCent = Math.round(betrag * 100);
    if (!Number.isFinite(betragCent) || betragCent <= 0) {
      setZusageCent(null);
      setZusageLaedt(false);
      return;
    }

    let abgebrochen = false;
    setZusageLaedt(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/erstbefuellung?spendeCent=${betragCent}`);
        if (!res.ok) throw new Error('zusage_fehlgeschlagen');
        const json = await res.json();
        if (!abgebrochen) setZusageCent(json.zusageCent);
      } catch {
        if (!abgebrochen) setZusageCent(null);
      } finally {
        if (!abgebrochen) setZusageLaedt(false);
      }
    }, ZUSAGE_DEBOUNCE_MS);

    return () => {
      abgebrochen = true;
      clearTimeout(timeout);
    };
  }, [betrag]);

  const betragCent = Math.round(betrag * 100);
  const formularGueltig = name.trim() !== '' && ort.trim() !== '' && kinderAnzahl >= 1 && betragCent > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formularGueltig) return;
    setStatus('loading');
    setFehler(null);
    try {
      const res = await fetch('/api/einrichtungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, typ, ort, kinderAnzahl, betragCent }),
      });
      if (!res.ok) throw new Error('anlage_fehlgeschlagen');
      const json: AnlageErgebnis = await res.json();
      setErgebnis(json);
      setStatus('idle');
    } catch {
      // Formulardaten bleiben erhalten — sie leben nur im Browser (Spec
      // §3.0), es gibt keinen Draft, den ein Fehlschlag zerstören könnte.
      setStatus('error');
      setFehler('Anlage konnte nicht gebucht werden. Bitte erneut versuchen.');
    }
  }

  if (ergebnis?.dedup) {
    return (
      <Card>
        <p>Diese Einrichtung gibt es schon — deine Spende ist in ihren bestehenden Topf geflossen.</p>
        <Link href={`/einrichtungen/${ergebnis.slug}`} className="pill pill-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Zur Einrichtung
        </Link>
      </Card>
    );
  }

  if (ergebnis) {
    // Weicht die tatsächlich gebuchte Erstbefüllung von der zuletzt
    // angezeigten Zusage ab (Fonds hat sich zwischen Anzeige und Buchung
    // bewegt, Spec §3.0), macht der Satz das explizit statt es zu verschweigen.
    const abweichung = zusageCent !== null && ergebnis.erstbefuellungCent !== zusageCent;
    return (
      <Card>
        <h2>{ergebnis.einrichtung.name} ist angelegt!</h2>
        <p>
          Ihr Finanztopf startet mit {formatEuroFromCent(ergebnis.einrichtung.topfwertCent)} — davon hat der
          Solidaritätsfonds {formatEuroFromCent(ergebnis.erstbefuellungCent)} beigesteuert.
        </p>
        {abweichung && (
          <p className="muted">
            Der Fonds-Stand hat sich seit der Anzeige bewegt — gebucht wurden{' '}
            {formatEuroFromCent(ergebnis.erstbefuellungCent)}.
          </p>
        )}
        <Link href={`/einrichtungen/${ergebnis.slug}`} className="pill pill-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Zur Einrichtung
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Name der Einrichtung</span>
          <input
            aria-label="Name der Einrichtung"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...feldStyle, width: '100%' }}
          />
        </label>

        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Typ</span>
          <select
            aria-label="Typ"
            value={typ}
            onChange={(e) => setTyp(e.target.value as Typ)}
            style={feldStyle}
          >
            <option value="tagespflege">Tagespflege</option>
            <option value="kita">Kita</option>
            <option value="schule">Schule</option>
          </select>
        </label>

        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Ort</span>
          <input
            aria-label="Ort"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            style={{ ...feldStyle, width: '100%' }}
          />
        </label>

        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Kinderzahl</span>
          <input
            aria-label="Kinderzahl"
            type="number"
            min={1}
            value={kinderAnzahl}
            onChange={(e) => setKinderAnzahl(Number(e.target.value) || 0)}
            style={{ ...feldStyle, width: '6rem' }}
          />
        </label>

        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Spendenbetrag</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              aria-label="Spendenbetrag"
              type="number"
              min={1}
              value={betrag}
              onChange={(e) => setBetrag(Number(e.target.value) || 0)}
              style={{ ...feldStyle, width: '6rem' }}
            />
            <span>€</span>
          </div>
        </label>

        <div aria-live="polite">
          {zusageLaedt ? (
            <p className="muted" role="status">Zusage wird berechnet …</p>
          ) : zusageCent !== null ? (
            <p>
              {zusageCent === 0
                ? 'Der Solidaritätsfonds ist gerade leer — deine Spende legt trotzdem los.'
                : `Sobald du spendest, legt der Solidaritätsfonds ${formatEuroFromCent(zusageCent)} dazu.`}
            </p>
          ) : null}
        </div>

        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Verbindlich ist der Stand zum Zeitpunkt deiner Spende — der Fonds bewegt sich.
        </p>

        {status === 'error' && fehler && (
          <p className="negative" role="alert">{fehler}</p>
        )}

        <button type="submit" className="pill pill-primary" disabled={status === 'loading' || !formularGueltig}>
          {status === 'loading' ? 'Wird gebucht …' : 'Jetzt spenden und Einrichtung anlegen'}
        </button>
      </form>
    </Card>
  );
}
