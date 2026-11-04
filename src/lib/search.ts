export type SearchParams = Record<string, string | string[] | undefined>;

export function um(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim() : undefined;
}

export function inteiro(v: string | string[] | undefined): number | undefined {
  const s = um(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function escolha<T extends string>(
  v: string | string[] | undefined,
  validos: readonly T[],
): T | undefined {
  const s = um(v);
  return s && (validos as readonly string[]).includes(s) ? (s as T) : undefined;
}
