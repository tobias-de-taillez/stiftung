'use client';

import { useState } from 'react';
import { formatEuro } from '@/lib/calc/format';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { Card } from './Card';
import { Konfetti } from './Konfetti';

function rundeAufZweiNachkommastellen(wert: number): number {
  return Math.round(wert * 100) / 100;
}

export function SpendenBestaetigung({
  betrag,
  frequenz,
  einrichtungName,
  altesKapital,
  neuesKapital,
  zielKapital,
  spendeId,
}: {
  betrag: number;
  frequenz: 'einmalig' | 'jaehrlich';
  einrichtungName: string;
  altesKapital: number;
  neuesKapital: number;
  zielKapital: number;
  spendeId: string;
}) {
  const [quittungOffen, setQuittungOffen] = useState(false);
  const angezeigtesKapital = useCountUp(neuesKapital);
  const shareText = `Ich habe gerade ${formatEuro(betrag)} an ${einrichtungName} gespendet — mach mit!`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Meine Spende', text: shareText, url: shareUrl });
    } else if (typeof window !== 'undefined') {
      window.alert('Teilen wird von diesem Browser nicht unterstützt — nutze den WhatsApp-Link.');
    }
  }

  const altPct = zielKapital > 0 ? rundeAufZweiNachkommastellen(Math.min(100, Math.max(0, (altesKapital / zielKapital) * 100))) : 0;
  const neuPct = zielKapital > 0 ? rundeAufZweiNachkommastellen(Math.min(100, Math.max(0, (neuesKapital / zielKapital) * 100))) : 0;
  const istZielErreicht = neuPct >= 100;
  const formatProzent = (wert: number) => wert.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Ziel-anchored statt relatives Wachstum: (neu-alt)/alt zeigt bei großen
  // Einrichtungen "+0,0 %" und widerspricht damit dem sichtbar wachsenden
  // Balken darunter. altPct/neuPct sind bereits für den Balken berechnet.
  const zielFortschrittText = `Von ${formatProzent(altPct)} % auf ${formatProzent(neuPct)} % des Ziels`;

  return (
    <Card>
      {/* (1) Konfetti-Burst + Danke — prominent, als Erstes zu sehen */}
      <div data-testid="konfetti-danke">
        <Konfetti />
        <h2>Danke für Ihre Spende!</h2>
        <p>{formatEuro(betrag)} {frequenz === 'jaehrlich' ? 'jährlich' : 'einmalig'} für {einrichtungName}.</p>
      </div>

      {/* (2) Vorher→Nachher-Balken (Geisterbalken = alter Stand) + Ziel-Fortschritt */}
      <div data-testid="vorher-nachher" style={{ marginTop: '1.25rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>Kapitalstand-Zuwachs</p>
        <div
          className="vorher-nachher-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={zielKapital}
          aria-valuenow={Math.round(Math.min(zielKapital, Math.max(0, neuesKapital)))}
          aria-label="Kapitalstand-Fortschritt zum Ziel"
        >
          <div className="vorher-nachher-ghost" style={{ width: `${altPct}%` }} />
          <div
            className={`vorher-nachher-fill${istZielErreicht ? ' is-complete' : ''}`}
            style={{ width: `${neuPct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.4rem' }}>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {formatEuro(altesKapital)} → {formatEuro(neuesKapital)}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {zielFortschrittText}
          </p>
        </div>
      </div>

      {/* (3) Neuer Kapitalstand mit Count-up */}
      <div data-testid="kapitalstand" style={{ marginTop: '1.25rem' }}>
        <p className="muted">
          Neuer Kapitalstand im Finanztopf: <strong>{formatEuro(angezeigtesKapital)}</strong>
        </p>
      </div>

      {/* (4) Share/Quittung */}
      <div data-testid="share-quittung" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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

        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="muted"
            aria-expanded={quittungOffen}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            onClick={() => setQuittungOffen((offen) => !offen)}
          >
            {quittungOffen ? 'Spendenquittung ausblenden' : 'Spendenquittung anzeigen'}
          </button>
          {quittungOffen && (
            <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
              <p className="eyebrow">Spendenquittung (Demo)</p>
              <p>Beleg-Nr.: {spendeId}</p>
              <p>Betrag: {formatEuro(betrag)} ({frequenz === 'jaehrlich' ? 'jährlich' : 'einmalig'})</p>
              <p>Empfänger: {einrichtungName}</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>
                Demo-Dokument, nicht steuerlich gültig — echte Quittungen folgen mit dem Payment-Backend.
              </p>
              <button
                type="button"
                className="pill pill-secondary"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
              >
                Drucken / Als PDF speichern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* (5) Spielgeld-Hinweis — bewusst zuletzt, dezent statt auffälligem Chip */}
      <p className="muted" data-testid="spielgeld-hinweis" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        Spielgeld-Hinweis: Diese Spende ist eine echte Buchung in der Datenbank, aber kein echtes
        Geld. In der Live-Version folgt hier echte Zahlungsabwicklung (Stripe/PayPal) sowie bei
        Auszahlung an eine Einrichtung die verifizierte Zugangsprüfung (KYC).
      </p>
    </Card>
  );
}
