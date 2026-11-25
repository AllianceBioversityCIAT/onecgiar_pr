import { CURRENT_USE_UPDATE_COPY } from '../../internationalization/current-use-update.copy';

/**
 * P2-3537 §4 / P2-3985 — the rules of the Innovation Use "Current Use Update" block, as pure functions,
 * so the W1/W2 form (`shared/components/innovation-use-form`) and the W3/bilateral full metadata
 * (`pages/bilateral/.../type-innovation-use`) reconcile the same way. Each form decides on its own
 * WHETHER the block shows and how it sums its actor rows; everything after that lives here.
 *
 * `previous` is the server's `current_use_previous` (`{ result_id, phase_year, total_actors }`), `null`
 * when the block must not render.
 */
export interface CurrentUsePrevious {
  total_actors?: number | string | null;
  total_organizations?: number | string | null;
  measures?: { unit?: string | null; quantity?: number | string | null }[] | null;
  phase_year?: number | string | null;
}

/** IU26-R-4 — the previous phase's figures per category. A category with no data is `null` / empty (omitted). */
export interface PreviousUseByCategory {
  actors: number | null;
  organizations: number | null;
  measures: { unit: string; quantity: number }[];
}

/** IU26-R-7 — read-only totals per category. A category without rows is `null` / empty (no tile). */
export interface TotalsByCategory {
  actorsIndividuals: number | null;
  households: number | null;
  organizations: number | null;
  measures: { unit: string; quantity: number }[];
}

/** The round that figure comes from, for the "(FY2025)" label. `null` when unknown. */
export function previousUsePhaseYear(previous: CurrentUsePrevious | null | undefined): number | null {
  const year = Number(previous?.phase_year);
  return Number.isFinite(year) && year > 0 ? year : null;
}

const toNumber = (value: unknown): number => Number(value) || 0;
const isActiveRow = (row: any): boolean => !!row && row.is_active !== false;

/**
 * IU26-R-4 — the previous phase's current-use figures per category. A category with no data is omitted:
 * `null` for actors / organizations and no line for a unit. A measure line of 0 counts as no data
 * (the server may send quantity 0 lines).
 */
export function previousUseByCategory(previous: CurrentUsePrevious | null | undefined): PreviousUseByCategory {
  const actors = toNumber(previous?.total_actors);
  const organizations = toNumber(previous?.total_organizations);
  const measures = (previous?.measures ?? [])
    .map(m => ({ unit: String(m?.unit ?? '').trim(), quantity: toNumber(m?.quantity) }))
    .filter(m => m.unit && m.quantity > 0);
  return { actors: actors > 0 ? actors : null, organizations: organizations > 0 ? organizations : null, measures };
}

/**
 * IU26-R-7 — totals per category from the current rows; never stored. Active rows only. A category without
 * rows is `null` / empty so the caller draws no tile. Households = `count_unit === 'households'`; every other
 * actor row (individuals, null, anything else) counts as individuals. Measure units are matched by trimmed,
 * case-insensitive text and never mixed; the first spelling met labels the line; rows without a unit are skipped.
 * Row totals read `how_many` ("How many – total") and `quantity` ("Quantity – total").
 */
export function totalsByCategory(
  actors: any[] | null | undefined,
  organizations: any[] | null | undefined,
  measures: any[] | null | undefined
): TotalsByCategory {
  const activeActors = (actors ?? []).filter(isActiveRow);
  const households = activeActors.filter(a => a.count_unit === 'households');
  const individuals = activeActors.filter(a => a.count_unit !== 'households');
  const sum = (rows: any[]): number | null => (rows.length ? rows.reduce((total, row) => total + toNumber(row.how_many), 0) : null);

  const byUnit = new Map<string, { unit: string; quantity: number }>();
  (measures ?? []).filter(isActiveRow).forEach(row => {
    const unit = String(row.unit_of_measure ?? '').trim();
    if (!unit) return;
    const key = unit.toLowerCase();
    const line = byUnit.get(key) ?? { unit, quantity: 0 };
    line.quantity += toNumber(row.quantity);
    byUnit.set(key, line);
  });

  return {
    actorsIndividuals: sum(individuals),
    households: sum(households),
    organizations: sum((organizations ?? []).filter(isActiveRow)),
    measures: [...byUnit.values()]
  };
}

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** IU26-R-5 — the CUU is answered by its narrative alone (no "New users added"). */
export function isCurrentUseNarrativeAnswered(narrative: unknown): boolean {
  return !!String(narrative ?? '').trim();
}

/** IU26-R-5 — narrative present and within the word limit. */
export function isCurrentUseNarrativeComplete(narrative: unknown): boolean {
  return isCurrentUseNarrativeAnswered(narrative) && wordCount(String(narrative)) <= CURRENT_USE_UPDATE_COPY.maxNarrativeWords;
}
