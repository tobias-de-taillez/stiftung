// bigint überlebt NextResponse.json() nicht. An der API-Grenze werden alle
// bigint-Felder in number konvertiert — mit hartem Safe-Integer-Check, damit
// ein Überlauf laut knallt statt still zu runden.
type Serialisiert<T> = T extends bigint
  ? number
  : T extends Date
    ? Date
    : T extends Array<infer U>
      ? Array<Serialisiert<U>>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- K wird nur zum Matchen gebraucht, nicht im Ergebnistyp
    : T extends Map<infer K, infer V>
        ? Record<string, Serialisiert<V>>
        : T extends object
          ? { [K in keyof T]: Serialisiert<T[K]> }
          : T;

export function serialisiere<T>(wert: T): Serialisiert<T> {
  if (typeof wert === 'bigint') {
    const zahl = Number(wert);
    if (!Number.isSafeInteger(zahl)) {
      throw new RangeError(`serialisiere: ${wert} überschreitet Number.MAX_SAFE_INTEGER`);
    }
    return zahl as Serialisiert<T>;
  }
  if (wert instanceof Date || wert === null || typeof wert !== 'object') {
    return wert as Serialisiert<T>;
  }
  if (Array.isArray(wert)) {
    return wert.map((e) => serialisiere(e)) as Serialisiert<T>;
  }
  if (wert instanceof Map) {
    return Object.fromEntries([...wert.entries()].map(([k, v]) => [String(k), serialisiere(v)])) as Serialisiert<T>;
  }
  return Object.fromEntries(
    Object.entries(wert as Record<string, unknown>).map(([k, v]) => [k, serialisiere(v)])
  ) as Serialisiert<T>;
}
