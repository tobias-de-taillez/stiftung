'use client';

import { useState } from 'react';
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
  const [quittungOffen, setQuittungOffen] = useState(false);
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
    </Card>
  );
}
