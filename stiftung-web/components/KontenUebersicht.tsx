import { formatEuroFromCent } from '@/lib/calc/format';
import type { KontenLage } from '@/lib/server/kontenService';

/**
 * Reine Kontenübersichts-Tabelle (Task 6, aus SolidaritaetsfondsPanel
 * extrahiert): fünf Konten + „davon durchlaufend" + Cap-Zeile +
 * Poolwert-Fuß. Keine Buttons, keine Aktionen — Public (nur lesen) und
 * Admin (mit AdminAktionen daneben) teilen sich diese eine Tabelle.
 */
export function KontenUebersicht({ lage }: { lage: KontenLage }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption className="eyebrow" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
          Kontenübersicht
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Konto</th>
            <th scope="col" style={{ textAlign: 'right', padding: '0.4rem' }}>Stand</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '0.4rem' }}>Einrichtungs-Depot</td>
            <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.etfMarktwertCent)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.4rem' }}>
              Verrechnungskonto
              {lage.offeneDirektausschuettungenCent > 0 && (
                <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                  davon durchlaufend: {formatEuroFromCent(lage.offeneDirektausschuettungenCent)}
                </span>
              )}
            </td>
            <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.verrechnungskontoCent)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.4rem' }}>Soli-Depot</td>
            <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.soliDepotCent)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.4rem' }}>Soli-Verrechnungskonto</td>
            <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.soliVerrechnungskontoCent)}</td>
          </tr>
          <tr>
            <td style={{ padding: '0.4rem' }}>
              Management-Konto
              <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                Cap: {formatEuroFromCent(lage.managementCapCent)}
              </span>
            </td>
            <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.managementKontoCent)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: '0.4rem', fontWeight: 700 }}>Poolwert</td>
            <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 700 }}>{formatEuroFromCent(lage.poolwertCent)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
