### Task 33: Live-Ticker + Spenderzähler

**Files:** Create: `stiftung-web/app/api/spenden/letzte/route.ts` (+ Test), `components/SpendenTicker.tsx` (+ Test); Modify: `app/page.tsx`, `app/statistik/page.tsx`, `lib/server/einrichtungenService.ts` (+ Test).

**Akzeptanzkriterien:**
- `GET /api/spenden/letzte` → letzte 10 Spenden anonymisiert (`{ betrag, einrichtungName, quelle, vorMinuten }`) — quelle 'solidaritaet' wird als „Solidaritätsfonds-Verteilung" gelabelt, KEINE personenbezogenen Daten (existieren eh nicht).
- Ticker-Komponente („Vor 2 Min: 50 € für Kita Regenbogen") auf Landing + Statistik, Polling alle 15 s, Empty-State („Sei die erste Spende!"), neue Einträge gleiten animiert herein.
- Spenderzähler in der Landing-Live-Zeile („N Spenden bisher" aus count).
- DB-Test für die Route (5-Tabellen-Reset-Regel gilt).

