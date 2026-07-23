import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EinrichtungAnlegen } from '../EinrichtungAnlegen';

afterEach(() => {
  vi.unstubAllGlobals();
});

// Fetch-Stub, der nach URL/Method verzweigt (wie im SolidaritaetsfondsPanel-
// Test, nur dass hier zwei verschiedene Endpunkte im selben Testlauf
// angesprochen werden: GET /api/erstbefuellung für die Zusage, POST
// /api/einrichtungen für die tatsächliche Buchung).
function stubFetch({
  zusageCent,
  postResponse,
  postOk = true,
}: {
  zusageCent: number;
  postResponse?: unknown;
  postOk?: boolean;
}) {
  const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.startsWith('/api/erstbefuellung')) {
      return Promise.resolve({ ok: true, json: async () => ({ zusageCent }) });
    }
    if (typeof url === 'string' && url.startsWith('/api/einrichtungen') && opts?.method === 'POST') {
      return Promise.resolve({ ok: postOk, json: async () => postResponse });
    }
    return Promise.reject(new Error(`unerwarteter fetch: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ERFOLG_RESPONSE = {
  dedup: false,
  slug: 'kita-sonnenschein-kiel',
  erstbefuellungCent: 2_500,
  einrichtung: { name: 'Kita Sonnenschein', topfwertCent: 12_500, zielKapitalCent: 800_000 },
};

const DEDUP_RESPONSE = {
  dedup: true,
  slug: 'kita-sonnenschein-kiel',
  erstbefuellungCent: 0,
  einrichtung: { name: 'Kita Sonnenschein', topfwertCent: 20_000, zielKapitalCent: 800_000 },
};

async function fuelleFormularAus(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Name der Einrichtung/i), 'Kita Sonnenschein');
  await user.type(screen.getByLabelText(/^Ort$/i), 'Kiel');
}

describe('EinrichtungAnlegen', () => {
  it('zeigt die Zusage-Copy exakt nach dem debounced Zusage-Fetch', async () => {
    stubFetch({ zusageCent: 2_500 });
    render(<EinrichtungAnlegen />);
    // formatEuroFromCent nutzt Intl.NumberFormat — das Leerzeichen vor "€"
    // ist dort ein schmales/geschütztes Leerzeichen, kein normales. Ein
    // exakter String-Match würde an diesem Whitespace-Zeichen scheitern,
    // nicht am eigentlichen Verhalten (Muster wie in SpendenTicker.test).
    expect(
      await screen.findByText(/^Sobald du spendest, legt der Solidaritätsfonds\s*25,00\s*€\s*dazu\.$/)
    ).toBeInTheDocument();
  });

  it('zeigt den Leer-Text, wenn der Solidaritätsfonds 0 zusagt — nie als Kontostand formuliert', async () => {
    stubFetch({ zusageCent: 0 });
    render(<EinrichtungAnlegen />);
    expect(
      await screen.findByText('Der Solidaritätsfonds ist gerade leer — deine Spende legt trotzdem los.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Aktueller Stand/i)).not.toBeInTheDocument();
  });

  it('zeigt die Verbindlichkeits-Hinweiszeile', async () => {
    stubFetch({ zusageCent: 2_500 });
    render(<EinrichtungAnlegen />);
    expect(
      await screen.findByText('Verbindlich ist der Stand zum Zeitpunkt deiner Spende — der Fonds bewegt sich.')
    ).toBeInTheDocument();
  });

  it('ruft vor dem Submit keinen POST auf /api/einrichtungen — nur den Zusage-GET', async () => {
    const fetchMock = stubFetch({ zusageCent: 2_500 });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    // Der GET-Fetch für die Zusage ist erlaubt und erwartet (Stufe-1-Anzeige,
    // bucht nichts) — erst wenn er sichtbar ist, ist der Debounce sicher
    // durchgelaufen und wir können zuverlässig auf "kein POST" prüfen.
    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);

    expect(fetchMock.mock.calls.some(([, opts]) => (opts as RequestInit | undefined)?.method === 'POST')).toBe(
      false
    );
    expect(
      fetchMock.mock.calls.every(([url]) => typeof url === 'string' && url.startsWith('/api/erstbefuellung'))
    ).toBe(true);
  });

  it('bucht bei Submit über POST /api/einrichtungen und zeigt die Erfolgs-Ansicht mit Link zur Detailseite', async () => {
    const fetchMock = stubFetch({ zusageCent: 2_500, postResponse: ERFOLG_RESPONSE });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.click(screen.getByRole('button', { name: /spenden/i }));

    expect(await screen.findByText(/125,00\s*€/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Kita Sonnenschein|Zur Einrichtung|zur Detailseite/i });
    expect(link).toHaveAttribute('href', '/einrichtungen/kita-sonnenschein-kiel');

    const postCall = fetchMock.mock.calls.find(([url]) => typeof url === 'string' && url.startsWith('/api/einrichtungen'));
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toMatchObject({ name: 'Kita Sonnenschein', ort: 'Kiel', typ: 'kita' });
    expect(body.betragCent).toBeGreaterThan(0);
    expect(body.kinderAnzahl).toBeGreaterThanOrEqual(1);
  });

  it('zeigt bei dedup:true die Doppelanlage-Copy statt der Erfolgs-Ansicht, mit Link zur bestehenden Einrichtung', async () => {
    stubFetch({ zusageCent: 2_500, postResponse: DEDUP_RESPONSE });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.click(screen.getByRole('button', { name: /spenden/i }));

    expect(
      await screen.findByText('Diese Einrichtung gibt es schon — deine Spende ist in ihren bestehenden Topf geflossen.')
    ).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/einrichtungen/kita-sonnenschein-kiel');
  });

  it('zeigt den Abweichungs-Satz, wenn die gebuchte Erstbefüllung von der zuletzt angezeigten Zusage abweicht', async () => {
    // Zusage stand bei 2.500 Cent, gebucht wurden aber nur 1.000 (Fonds hat
    // sich zwischen Anzeige und Buchung bewegt — Spec §3.0).
    stubFetch({
      zusageCent: 2_500,
      postResponse: { ...ERFOLG_RESPONSE, erstbefuellungCent: 1_000 },
    });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.click(screen.getByRole('button', { name: /spenden/i }));

    expect(
      await screen.findByText(/Der Fonds-Stand hat sich seit der Anzeige bewegt\s*—\s*gebucht wurden\s*10,00\s*€\.?/)
    ).toBeInTheDocument();
  });

  it('zeigt keinen Abweichungs-Satz, wenn gebuchte Erstbefüllung und Zusage übereinstimmen', async () => {
    stubFetch({ zusageCent: 2_500, postResponse: ERFOLG_RESPONSE }); // erstbefuellungCent: 2_500 === zusageCent
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.click(screen.getByRole('button', { name: /spenden/i }));

    await screen.findByText(/125,00\s*€/); // Erfolgs-Ansicht ist da
    expect(screen.queryByText(/Der Fonds-Stand hat sich seit der Anzeige bewegt/)).not.toBeInTheDocument();
  });

  it('zeigt ein Fehlerbanner bei POST-Fehler und behält die eingegebenen Formulardaten', async () => {
    stubFetch({ zusageCent: 2_500, postOk: false, postResponse: { error: 'invalid_anlage' } });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.click(screen.getByRole('button', { name: /spenden/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Formular lebt nur im Browser (Spec §3.0) — bei einem fehlgeschlagenen
    // POST bleiben die eingegebenen Daten erhalten, damit nichts erneut
    // eingetippt werden muss.
    expect(screen.getByLabelText(/Name der Einrichtung/i)).toHaveValue('Kita Sonnenschein');
    expect(screen.getByLabelText(/^Ort$/i)).toHaveValue('Kiel');
  });

  it('bucht keinen Persistenz-Call vor dem Submit — Formular-State existiert nur im Browser', async () => {
    const fetchMock = stubFetch({ zusageCent: 2_500 });
    const user = userEvent.setup();
    render(<EinrichtungAnlegen />);

    await screen.findByText(/Sobald du spendest/);
    await fuelleFormularAus(user);
    await user.clear(screen.getByLabelText(/Kinderzahl/i));
    await user.type(screen.getByLabelText(/Kinderzahl/i), '12');

    // Auch nach mehreren Feldänderungen: kein einziger POST, solange nicht
    // abgesendet wurde.
    expect(fetchMock.mock.calls.some(([, opts]) => (opts as RequestInit | undefined)?.method === 'POST')).toBe(
      false
    );
  });
});
