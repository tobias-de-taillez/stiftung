'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { StatusChip } from './StatusChip';
import { WachstumsIllustration } from './WachstumsIllustration';
import { formatEuroFromCent } from '@/lib/calc/format';
import type { EinrichtungMitTopf } from '@/lib/server/uebersichtService';

type TypFilter = 'alle' | 'tagespflege' | 'kita' | 'schule';

export function EinrichtungenFilter({ einrichtungen }: { einrichtungen: EinrichtungMitTopf[] }) {
  const [suche, setSuche] = useState('');
  const [typ, setTyp] = useState<TypFilter>('alle');

  const gefiltert = useMemo(() => {
    return einrichtungen.filter((e) => {
      const passtTyp = typ === 'alle' || e.typ === typ;
      const begriff = suche.trim().toLowerCase();
      const passtSuche =
        begriff === '' ||
        e.name.toLowerCase().includes(begriff) ||
        e.ort.toLowerCase().includes(begriff);
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

      {gefiltert.length === 0 && (
        <Card><p>Keine Einrichtung gefunden. Suche oder Filter anpassen.</p></Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {gefiltert.map((e) => (
          <Link key={e.id} href={`/einrichtungen/${e.slug}`} style={{ textDecoration: 'none' }}>
            <Card>
              <p className="eyebrow">{e.typ}</p>
              {/*
                Wachstums-Illustration (Task 36, klein) direkt neben dem
                Namen — dieselbe Bedeutung wie der ProgressBar-Balken
                darunter, nur bedeutungstragend statt rein numerisch.
              */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.25rem 0' }}>
                <WachstumsIllustration
                  aktuellesKapital={e.topfwertCent}
                  zielKapital={e.zielKapitalCent}
                  groesse="klein"
                />
                <h2 style={{ margin: 0 }}>{e.name}</h2>
              </div>
              <p className="muted" style={{ margin: '0 0 0.75rem' }}>{e.ort} · {e.kinderAnzahl} Kinder</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
                <StatusChip tone={e.verifiziert ? 'positive' : 'muted'}>
                  {e.verifiziert ? 'Zugang abgeholt' : 'Zugang noch nicht abgeholt'}
                </StatusChip>
                <StatusChip tone="forecast">
                  {e.auszahlungspfad === 'mittelweitergabe' ? 'Mittelweitergabe (§ 58 AO)' : 'Förderguthaben (§ 57 AO)'}
                </StatusChip>
              </div>
              <ProgressBar
                value={e.topfwertCent}
                max={e.zielKapitalCent}
                label={`${formatEuroFromCent(e.topfwertCent)} von ${formatEuroFromCent(e.zielKapitalCent)}`}
              />
            </Card>
          </Link>
        ))}
        <Link href="/einrichtungen/neu" style={{ textDecoration: 'none' }}>
          <Card>
            <p className="muted" style={{ margin: 0 }}>
              Deine Einrichtung fehlt? Leg sie an — sobald du spendest, hilft der Solidaritätsfonds mit.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
