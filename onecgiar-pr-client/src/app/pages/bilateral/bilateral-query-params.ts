// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-R-13, COV-R-14, COV-DD-3, COV-DD-11)
import { ParamMap, Params } from '@angular/router';

/**
 * Shared query-param contract for the four Bilateral center tabs (Overview, Results, Reporting,
 * Draft Results) — `design.md` §6.2, `COV-DD-3`. Ten keys, all optional; unknown or malformed
 * values never throw — they are dropped to the documented default and reported in `stripped` so
 * the caller can rewrite the URL (`COV-R-13`).
 */
export const BILATERAL_PHASE_QUERY_PARAM = 'phase';
export const BILATERAL_STATUS_QUERY_PARAM = 'status';
export const BILATERAL_PROJECT_QUERY_PARAM = 'project';
export const BILATERAL_PROGRAM_QUERY_PARAM = 'program';
export const BILATERAL_TYPE_QUERY_PARAM = 'type';
export const BILATERAL_ROLE_QUERY_PARAM = 'role';
export const BILATERAL_SOURCE_QUERY_PARAM = 'source';
export const BILATERAL_METHOD_QUERY_PARAM = 'method';
export const BILATERAL_SEARCH_QUERY_PARAM = 'search';
export const BILATERAL_MULTI_QUERY_PARAM = 'multi';

/** `status_id` → key table (`COV-R-13`/`COV-R-7`). Editing 1 · QA 2 · Submitted 3 · Discontinued 4
 *  · Pending 5 · Approved 6 · Rejected 7. */
export const STATUS_KEY_TO_ID = {
  editing: 1,
  qa: 2,
  submitted: 3,
  discontinued: 4,
  pending: 5,
  approved: 6,
  rejected: 7,
} as const;

export type StatusKey = keyof typeof STATUS_KEY_TO_ID;

/** Inverse of `STATUS_KEY_TO_ID` — `status_id` → `StatusKey`. */
export const STATUS_ID_TO_KEY: Record<number, StatusKey> = Object.fromEntries(
  (Object.entries(STATUS_KEY_TO_ID) as [StatusKey, number][]).map(([key, id]) => [id, key]),
) as Record<number, StatusKey>;

const ROLE_VALUES = ['lead', 'contributing'] as const;
const SOURCE_VALUES = ['w3', 'w1w2'] as const;
const METHOD_VALUES = ['ai', 'manual'] as const;
/** Additive token accepted (but never emitted by default) on `role`/`source`/`method` — parses to
 *  `null` (= both) while still counting the key as `present` (`COV-DD-3` amendment). */
const ALL_TOKEN = 'all';

export type BilateralRole = (typeof ROLE_VALUES)[number];
export type BilateralSource = (typeof SOURCE_VALUES)[number];
export type BilateralMethod = (typeof METHOD_VALUES)[number];

/** The ten contract keys, for `present`. */
export type ContractKey =
  | 'phase'
  | 'status'
  | 'project'
  | 'program'
  | 'type'
  | 'role'
  | 'source'
  | 'method'
  | 'search'
  | 'multi';

/** Parsed, normalized state — every tab reads/writes through this shape (`COV-DD-3`). */
export interface BilateralQueryParams {
  phase: number | null;
  status: StatusKey[];
  project: number[];
  program: string[];
  type: number[];
  role: BilateralRole | null;
  source: BilateralSource | null;
  method: BilateralMethod | null;
  search: string;
  multi: boolean;
}

/** `COV-DD-3` "Clarification (execute, COV-T-2)": the Results tab's byte-identical no-param
 *  default (W3 + Lead). Merged in ONLY by `applyResultsTabDefaults`, never by
 *  `filterCenterResults`/`parseBilateralQueryParams` themselves. */
export const RESULTS_TAB_DEFAULT_PARAMS: Pick<BilateralQueryParams, 'source' | 'role'> = {
  source: 'w3',
  role: 'lead',
};

const PROGRAM_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

function isStatusKey(token: string): token is StatusKey {
  return Object.prototype.hasOwnProperty.call(STATUS_KEY_TO_ID, token);
}

function parsePositiveIntToken(token: string): number | null {
  if (!/^\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function parseProgramToken(token: string): string | null {
  return PROGRAM_CODE_PATTERN.test(token) ? token : null;
}

/** Splits a comma-joined multi-value param, trims blanks, validates each token, dedupes valid
 *  values (first occurrence wins), and reports every invalid token as `key=token` — never the
 *  whole raw value — so one bad token does not obscure the rest. Blank tokens (from `a,,b` or a
 *  trailing comma) are silently dropped, not reported. */
function parseMultiValue<T>(
  key: string,
  raw: string | null,
  parseToken: (token: string) => T | null,
  stripped: string[],
): T[] {
  if (!raw) return [];
  const values: T[] = [];
  const seen = new Set<string>();
  for (const rawToken of raw.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;
    const parsed = parseToken(token);
    if (parsed === null) {
      stripped.push(`${key}=${token}`);
      continue;
    }
    const dedupeKey = String(parsed);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    values.push(parsed);
  }
  return values;
}

/** Parses `role`/`source`/`method`: a real enum value, the additive `all` token (→ `null`, "both",
 *  but still `present`), empty/absent (→ `null`, NOT `present`), or anything else (stripped). */
function parseEnumTokenWithAll<T extends string>(
  key: ContractKey,
  raw: string | null,
  allowed: readonly T[],
  stripped: string[],
  present: ContractKey[],
): T | null {
  if (raw === null || raw === '') return null;
  if (raw === ALL_TOKEN) {
    present.push(key);
    return null;
  }
  if ((allowed as readonly string[]).includes(raw)) {
    present.push(key);
    return raw as T;
  }
  stripped.push(`${key}=${raw}`);
  return null;
}

function parsePhaseToken(raw: string | null, stripped: string[]): number | null {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  stripped.push(`${BILATERAL_PHASE_QUERY_PARAM}=${raw}`);
  return null;
}

function parseMultiFlag(raw: string | null, stripped: string[]): boolean {
  if (raw === null || raw === '') return false;
  if (raw === '1') return true;
  stripped.push(`${BILATERAL_MULTI_QUERY_PARAM}=${raw}`);
  return false;
}

/** The result of `parseBilateralQueryParams`: the normalized state, every raw token that was
 *  dropped (`stripped`, each entry `key=token` — one entry per bad token, never the whole raw
 *  value for a multi-value key), and every key that carried at least one VALID value (`present`,
 *  incl. the additive `all` token on `role`/`source`/`method` — an invalid or absent value never
 *  adds its key here). */
export interface ParsedBilateralQueryParams {
  params: BilateralQueryParams;
  stripped: string[];
  present: ContractKey[];
}

/**
 * Parses a route `ParamMap` into `BilateralQueryParams`. Unknown/missing values fall back to the
 * documented default (`COV-R-13`'s table); every dropped raw token is reported in `stripped` as
 * `key=token` so the caller can rewrite the URL to drop it; every key that carried a valid value
 * is listed in `present` (see `ParsedBilateralQueryParams`).
 */
export function parseBilateralQueryParams(map: ParamMap): ParsedBilateralQueryParams {
  const stripped: string[] = [];
  const present: ContractKey[] = [];

  const phase = parsePhaseToken(map.get(BILATERAL_PHASE_QUERY_PARAM), stripped);
  if (phase !== null) present.push('phase');

  const status = parseMultiValue(
    BILATERAL_STATUS_QUERY_PARAM,
    map.get(BILATERAL_STATUS_QUERY_PARAM),
    token => (isStatusKey(token) ? token : null),
    stripped,
  );
  if (status.length) present.push('status');

  const project = parseMultiValue(
    BILATERAL_PROJECT_QUERY_PARAM,
    map.get(BILATERAL_PROJECT_QUERY_PARAM),
    parsePositiveIntToken,
    stripped,
  );
  if (project.length) present.push('project');

  const program = parseMultiValue(
    BILATERAL_PROGRAM_QUERY_PARAM,
    map.get(BILATERAL_PROGRAM_QUERY_PARAM),
    parseProgramToken,
    stripped,
  );
  if (program.length) present.push('program');

  const type = parseMultiValue(
    BILATERAL_TYPE_QUERY_PARAM,
    map.get(BILATERAL_TYPE_QUERY_PARAM),
    parsePositiveIntToken,
    stripped,
  );
  if (type.length) present.push('type');

  const role = parseEnumTokenWithAll('role', map.get(BILATERAL_ROLE_QUERY_PARAM), ROLE_VALUES, stripped, present);
  const source = parseEnumTokenWithAll(
    'source',
    map.get(BILATERAL_SOURCE_QUERY_PARAM),
    SOURCE_VALUES,
    stripped,
    present,
  );
  const method = parseEnumTokenWithAll(
    'method',
    map.get(BILATERAL_METHOD_QUERY_PARAM),
    METHOD_VALUES,
    stripped,
    present,
  );

  const searchRaw = map.get(BILATERAL_SEARCH_QUERY_PARAM);
  const search = searchRaw ? searchRaw.trim() : '';
  if (search) present.push('search');

  const multi = parseMultiFlag(map.get(BILATERAL_MULTI_QUERY_PARAM), stripped);
  if (multi) present.push('multi');

  return {
    params: { phase, status, project, program, type, role, source, method, search, multi },
    stripped,
    present,
  };
}

/**
 * Serializes `BilateralQueryParams` to a `Params` object carrying ONLY non-default keys: no
 * `status=` for an empty selection, no `role`/`source`/`method` when `null` (unless
 * `opts.explicitDefaults`), `multi` only when `true`. Callers merge this with
 * `queryParamsHandling: 'merge'`; a key omitted here is a key the caller must null out explicitly
 * if it needs to be removed from an existing URL.
 *
 * `opts.explicitDefaults` (`COV-DD-3` amendment): when `true`, `role`/`source` are serialized as
 * the additive `all` token instead of being omitted when `null` — this is how the Overview marks
 * its deep links as carrying an explicit "both" scope (`COV-T-5`), so the Results tab's
 * `applyResultsTabDefaults` does not layer its own W3/Lead default on top. `method` is NEVER
 * serialized as `all` — it has no Results-tab default to guard against.
 */
export function serializeBilateralQueryParams(
  params: BilateralQueryParams,
  opts?: { explicitDefaults?: boolean },
): Params {
  const out: Params = {};
  if (params.phase !== null) out[BILATERAL_PHASE_QUERY_PARAM] = String(params.phase);
  if (params.status.length) out[BILATERAL_STATUS_QUERY_PARAM] = params.status.join(',');
  if (params.project.length) out[BILATERAL_PROJECT_QUERY_PARAM] = params.project.join(',');
  if (params.program.length) out[BILATERAL_PROGRAM_QUERY_PARAM] = params.program.join(',');
  if (params.type.length) out[BILATERAL_TYPE_QUERY_PARAM] = params.type.join(',');

  if (params.role !== null) out[BILATERAL_ROLE_QUERY_PARAM] = params.role;
  else if (opts?.explicitDefaults) out[BILATERAL_ROLE_QUERY_PARAM] = ALL_TOKEN;

  if (params.source !== null) out[BILATERAL_SOURCE_QUERY_PARAM] = params.source;
  else if (opts?.explicitDefaults) out[BILATERAL_SOURCE_QUERY_PARAM] = ALL_TOKEN;

  if (params.method !== null) out[BILATERAL_METHOD_QUERY_PARAM] = params.method;

  if (params.search.trim()) out[BILATERAL_SEARCH_QUERY_PARAM] = params.search;
  if (params.multi) out[BILATERAL_MULTI_QUERY_PARAM] = '1';
  return out;
}

/**
 * `true` iff `parsed.present` contains a valid contract key OTHER than `phase`. `phase` is
 * excluded deliberately (`COV-DD-2`/`COV-DD-3` amendment): it is shell context, not a filter, so a
 * header tab click carrying only `?phase=` must still resolve to "no contract key" for
 * `applyResultsTabDefaults`'s purposes.
 */
export function hasAnyContractParam(parsed: { present: readonly ContractKey[] }): boolean {
  return parsed.present.some(key => key !== 'phase');
}

/**
 * `COV-DD-3` amendment: merges `RESULTS_TAB_DEFAULT_PARAMS` into `parsed` ONLY when
 * `hasAnyContractParam(parsed)` is `false` — i.e. `present` is empty or contains only `phase` —
 * otherwise returns `parsed` unchanged. A plain `?phase=36` tab-link click still gets the W3/Lead
 * default; `?phase=36&role=all&source=all` (the Overview's explicit-scope deep link) does not. The
 * Results tab (`COV-T-7`) filters through this; the Overview never does.
 */
export function applyResultsTabDefaults(parsed: ParsedBilateralQueryParams): ParsedBilateralQueryParams {
  if (hasAnyContractParam(parsed)) return parsed;
  return {
    params: { ...parsed.params, ...RESULTS_TAB_DEFAULT_PARAMS },
    stripped: parsed.stripped,
    present: parsed.present,
  };
}
