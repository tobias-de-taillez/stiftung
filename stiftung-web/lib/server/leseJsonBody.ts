// Kaputtes oder nicht-objektförmiges JSON ist ein Client-Fehler (400), kein
// 500 — Routen prüfen auf null und antworten mit { error: 'invalid_json' }.
export async function leseJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
