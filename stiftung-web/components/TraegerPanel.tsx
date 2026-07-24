import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { VerifikationAntragForm } from './VerifikationAntragForm';
import type { Auszahlungspfad } from '@/lib/verrechnung/traeger';

export interface TraegerPanelProps {
  slug: string;
  traegerId: string | null;
  traegerName: string | null;
  rechtsformLabel: string;
  verifiziert: boolean;
  auszahlungspfad: Auszahlungspfad;
  offenerAntrag: boolean;
}

/**
 * Träger-/Verifikationsstatus-Panel (Task 8, entschärft: der alte Direkt-
 * KYC-Toggle und der "Einrichtung schließen"-Button sind raus — beide waren
 * Admin-Aktionen, die inzwischen unter /api/admin/* bzw. den Antragsfluss
 * gewandert sind). Reine Anzeige + Weiterleitung an VerifikationAntragForm;
 * keine eigenen Hooks mehr nötig, daher kein 'use client'.
 */
export function TraegerPanel({
  slug,
  traegerId,
  traegerName,
  rechtsformLabel,
  verifiziert,
  auszahlungspfad,
  offenerAntrag,
}: TraegerPanelProps) {
  return (
    <Card>
      <p className="eyebrow">Träger</p>
      <p>{traegerName ?? 'Träger noch nicht erfasst'}</p>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
        <StatusChip tone={verifiziert ? 'positive' : 'muted'}>
          {verifiziert ? 'Zugang abgeholt' : 'Zugang noch nicht abgeholt'}
        </StatusChip>
        <StatusChip tone="forecast">{rechtsformLabel}</StatusChip>
      </div>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        {auszahlungspfad === 'mittelweitergabe' ? 'Mittelweitergabe (§ 58 AO)' : 'Förderguthaben (§ 57 AO)'} — Der
        Auszahlungspfad hängt am Rechtsträger, nicht am Einrichtungstyp.
      </p>

      {!verifiziert && (
        <p className="muted" data-testid="unverifiziert-hinweis" style={{ fontSize: '0.85rem' }}>
          Dieser Topf wächst weiter und zahlt Solidaritätsabgabe, erhält aber keine Umverteilung und keine
          Direktförderung, bis der Zugang abgeholt ist.
        </p>
      )}

      {!verifiziert && offenerAntrag && (
        <p className="muted" data-testid="antrag-in-pruefung" style={{ marginTop: '1rem' }}>
          Antrag in Prüfung — ein Admin entscheidet.
        </p>
      )}

      {!verifiziert && !offenerAntrag && <VerifikationAntragForm traegerId={traegerId} slug={slug} />}
    </Card>
  );
}
