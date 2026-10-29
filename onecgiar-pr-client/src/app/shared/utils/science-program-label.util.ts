export type ScienceProgramNameFields = {
  official_code?: string | null;
  name?: string | null;
  initiative_name?: string | null;
  short_name?: string | null;
};

const clean = (value: unknown): string => (value === null || value === undefined ? '' : `${value}`.trim());

/**
 * Single P/A label rule: `SP01 - Sustainable Farming`.
 * The name is the first non-blank candidate (blank/whitespace counts as missing).
 * Never yields `undefined`/`null` text nor a dangling separator; nothing usable -> ''.
 */
export function scienceProgramLabel(
  code: string | null | undefined,
  ...nameCandidates: Array<string | null | undefined>
): string {
  const cleanCode = clean(code);
  const name = nameCandidates.map(clean).find(candidate => candidate !== '') ?? '';
  return cleanCode && name ? `${cleanCode} - ${name}` : cleanCode || name;
}

/**
 * Display label for a Science Program option, composed at the single point where the list is loaded
 * (see `pr-filter-multiselect` `sameValue()` note in the AOW HLO create modal).
 */
export function withScienceProgramLabel<T extends ScienceProgramNameFields>(sp: T): T & { sp_label: string } {
  return { ...sp, sp_label: scienceProgramLabel(sp?.official_code, sp?.name, sp?.initiative_name, sp?.short_name) };
}
