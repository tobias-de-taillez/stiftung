import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SpendenRechner } from '@/components/SpendenRechner';
import { TraegerPanel } from '@/components/TraegerPanel';
import { WachstumsIllustration } from '@/components/WachstumsIllustration';
import { formatEuroFromCent } from '@/lib/calc/format';
import { EINRICHTUNGS_LEVELS, einrichtungsLevel } from '@/lib/data/levels';
import { einrichtungDetail } from '@/lib/server/uebersichtService';
import { aktuelleWidmung } from '@/lib/server/spendenService';

// Spendenhistorie und Finanztopf-Stand müssen live sein (Task 34) — ohne
// force-dynamic würde Next diese [slug]-Route trotz dynamischer Params unter
// dem Full Route Cache ablegen können, weil hier nur über Prisma (nicht
// fetch()) gelesen wird. Gleiches Muster wie app/statistik/page.tsx.
export const dynamic = 'force-dynamic';

// Buchungs-Label je typ (Spec: Buchungsjournal, siehe lib/server/kontenService.ts
// buche()-Aufrufer für die vollständige Liste möglicher typ-Werte).
const BUCHUNGS_LABELS: Record<string, string> = {
  spende: 'Spende',
  erstbefuellung: 'Erstbefüllung aus dem Solidaritätsfonds',
  kaskade_umverteilung: 'aus dem Solidaritätsfonds',
  kaskade_direktspende: 'Direktförderung ausgezahlt',
  kaskade_abgabe: 'Solidaritätsabgabe',
  direktausschuettung_eingang: 'Direktspende (wird ausgezahlt)',
  auszahlungslauf: 'Auszahlung',
  schliessung: 'Schließung',
};

export default async function EinrichtungDetailPage({ params }: { params: { slug: string } }) {
  const [detail, widmung] = await Promise.all([einrichtungDetail(params.slug), aktuelleWidmung()]);
  if (!detail) {
    notFound();
  }
  const einrichtung = detail!;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/einrichtungen/${einrichtung.slug}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 180 });

  // Einrichtungs-Level (Task 30): Bronze→Diamant als Zwischenziele des
  // Finanztopfs selbst, definiert als Anteil des Zielkapitals. einrichtungsLevel
  // ist reine Verhältnisrechnung — Cent rein, Cent raus: fehlenderBetrag muss
  // deshalb über formatEuroFromCent formatiert werden, nicht formatEuro.
  const level = einrichtungsLevel(einrichtung.topfwertCent, einrichtung.zielKapitalCent);
  const levelMarker = EINRICHTUNGS_LEVELS.map((stufe) => ({
    position: stufe.anteil * 100,
    label: stufe.name,
  }));

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <p className="eyebrow">{einrichtung.typ}</p>
        <h1>{einrichtung.name}</h1>
        <p className="muted">{einrichtung.ort} · {einrichtung.kinderAnzahl} Kinder</p>
      </div>

      <Card>
        <p className="eyebrow">Finanztopf</p>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <WachstumsIllustration
            aktuellesKapital={einrichtung.topfwertCent}
            zielKapital={einrichtung.zielKapitalCent}
            groesse="gross"
          />
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <ProgressBar
              value={einrichtung.topfwertCent}
              max={einrichtung.zielKapitalCent}
              label={`${formatEuroFromCent(einrichtung.topfwertCent)} von ${formatEuroFromCent(einrichtung.zielKapitalCent)} (Ziel: finanzielle Unabhängigkeit)`}
              marker={levelMarker}
            />
            {level.current && <p className="muted">Aktuelles Level: {level.current.name}</p>}
            {level.next && (
              <p className="muted">
                Nächstes Ziel: {level.next.name} — noch {formatEuroFromCent(level.fehlenderBetrag)}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <p className="eyebrow">Spendenrechner</p>
        <SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmung.wortlaut} />
      </Card>

      <TraegerPanel
        slug={einrichtung.slug}
        traegerId={einrichtung.traegerId}
        traegerName={einrichtung.traegerName}
        rechtsformLabel={einrichtung.rechtsformLabel}
        verifiziert={einrichtung.verifiziert}
        auszahlungspfad={einrichtung.auszahlungspfad}
        topfwertCent={einrichtung.topfwertCent}
      />

      <Card>
        <p className="eyebrow">Transparenz</p>
        <p>{`Förderung pro Kind: ${formatEuroFromCent(einrichtung.foerderungProKindCent)}`}</p>
        <p className="muted">{`Unterstützungen insgesamt: ${einrichtung.anzahlUnterstuetzungen}`}</p>
        {einrichtung.buchungen.length === 0 ? (
          <p className="muted">Noch keine Spenden für diese Einrichtung.</p>
        ) : (
          <ul style={{ display: 'grid', gap: '0.5rem', listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
            {einrichtung.buchungen.map((b) => (
              <li key={b.id}>
                {`${b.createdAt.toLocaleDateString('de-DE')} · ${BUCHUNGS_LABELS[b.typ] ?? b.typ} · ${formatEuroFromCent(b.betragCent)}`}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="eyebrow">Für Vorträge & Events</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR-Code zu ${einrichtung.name}`}
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
