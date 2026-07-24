// Selbsttest der Invarianten-Utility: baut absichtlich kaputte Zustände —
// deshalb hier KEIN afterEach(pruefeInvarianten).
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedKontenstand, createTestEinrichtung, pruefeInvarianten } from './testDb';

beforeEach(resetDb);

describe('pruefeInvarianten (Test-Utility)', () => {
  it('ist bei leerer DB und bei konsistentem Seed still', async () => {
    await expect(pruefeInvarianten()).resolves.toBeUndefined();
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    await createTestEinrichtung({ topfCent: 10_000n });
    await expect(pruefeInvarianten()).resolves.toBeUndefined();
  });

  it('schlägt fehl, wenn ein Konto negativ ist', async () => {
    await seedKontenstand({ verrechnungskontoCent: -1n });
    await expect(pruefeInvarianten()).rejects.toThrow(/verrechnungskontoCent ist negativ/);
  });

  it('schlägt fehl, wenn das Soli-Depot negativ ist', async () => {
    await seedKontenstand({ soliDepotCent: -500n });
    await expect(pruefeInvarianten()).rejects.toThrow(/soliDepotCent ist negativ/);
  });
});
