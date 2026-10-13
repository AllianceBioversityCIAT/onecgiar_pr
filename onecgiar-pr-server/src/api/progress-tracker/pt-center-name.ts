/**
 * Center names exactly as the Progress Tracker spells them (live PT prod, 2026-10-13).
 *
 * PT `/resolve` treats `center` as a soft ranking signal, not a hard filter: sending
 * `CIAT` still returns `CIAT (Alliance)` candidates but can rank a different indicator
 * first. So the value sent has to be PT's own spelling, never the PRMS/CLARISA acronym.
 */
export const PT_CENTER_NAMES = [
  'CIAT (Alliance)',
  'Bioversity (Alliance)',
  'IFPRI',
  'ILRI',
  'CIMMYT',
  'IITA',
  'IWMI',
  'CIP',
  'ICARDA',
  'WorldFish',
  'IRRI',
  'ICRISAT',
  'AfricaRice',
  'Unknown Center',
  'SO',
] as const;

/** Upper-cased, whitespace collapsed — the key every lookup below is made on. */
function aliasKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

const PT_NAME_BY_KEY = new Map<string, string>(
  PT_CENTER_NAMES.map((name) => [aliasKey(name), name]),
);

/**
 * PRMS-side spellings of the Alliance that are not already PT names.
 *
 * ⚠️ Ambiguity: the merged entity (`ABC`, `Alliance`, `Alliance of Bioversity (International)
 * and CIAT`, `CIAT-Bioversity`) could be either PT center. It is sent as `CIAT (Alliance)`
 * here. Note that `api/bilateral/constants/w3-center-alias.constants.ts` resolves the same
 * pre-split spellings to the **Bioversity** side (`CENTER-02`) to keep history in place, so
 * the two modules deliberately disagree on these aliases. Only the CIAT-side and
 * Bioversity-side spellings are unambiguous.
 */
const ALLIANCE_ALIASES: Record<string, string> = {
  CIAT: 'CIAT (Alliance)',
  'CIAT ALLIANCE': 'CIAT (Alliance)',
  ABC: 'CIAT (Alliance)',
  ALLIANCE: 'CIAT (Alliance)',
  'CIAT-BIOVERSITY': 'CIAT (Alliance)',
  'ALLIANCE OF BIOVERSITY AND CIAT': 'CIAT (Alliance)',
  'ALLIANCE OF BIOVERSITY INTERNATIONAL AND CIAT': 'CIAT (Alliance)',
  BIOVERSITY: 'Bioversity (Alliance)',
  'BIOVERSITY ALLIANCE': 'Bioversity (Alliance)',
  'BIOVERSITY INTERNATIONAL': 'Bioversity (Alliance)',
};

/**
 * Maps a PRMS/CLARISA center acronym to the Progress Tracker's center name.
 *
 * Known PT names pass through case-insensitively (returned in PT's casing); Alliance
 * spellings map per {@link ALLIANCE_ALIASES}; anything else is returned trimmed and
 * unchanged — PT only uses it to rank, so an unknown value degrades ranking, never breaks
 * the call. Empty input stays `''`.
 */
export function toPtCenterName(prmsCenter: string | null | undefined): string {
  const trimmed = (prmsCenter ?? '').trim();
  if (!trimmed) return '';

  const key = aliasKey(trimmed);
  return PT_NAME_BY_KEY.get(key) ?? ALLIANCE_ALIASES[key] ?? trimmed;
}
