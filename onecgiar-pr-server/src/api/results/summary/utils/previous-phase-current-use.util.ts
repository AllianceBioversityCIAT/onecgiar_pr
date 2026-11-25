import { ResultCoreInnovUseSectionEnum } from '../../../results-framework-reporting/result_innov_section/enum/result_innov_section.enum';

/**
 * P2-3985 — the "Previous reported use" figure of the Current Use Update block, shared by the two
 * endpoints that serve it: the v2 innovation-use read (W1/W2 pool funding) and the legacy summary
 * read (W3/bilateral). It lives here, as a pure function, because `InnovationUseModule` imports
 * `SummaryModule`: injecting the v2 service into `SummaryService` would close a circular dependency.
 *
 * The rules are the ones of P2-3537 §4 (Yeck, 3 Sep 2026):
 * - only current-use rows count, never the 2030 projection rows (`section_id = 2`) that share the table. Which rows are "current use" depends on the writer:
 *   the v2 writer stamps `section_id = 1`, while the legacy one (bilateral editor,
 *   `innovation_dev.service`) leaves it NULL — so the legacy read keeps every non-2030 row, the same
 *   rule its own `getInnovationUse` applies, and the v2 read passes `currentUseRows`;
 * - IU26-R-4: organizations (role 5, active) and P25 measures (grouped by normalised unit) join the
 *   figure, each read with the same per-caller row `pick` (P-25);
 * - `null` when there is no previous phase or it reported no actors, organizations or measures —
 *   that is what tells the screen not to render the block at all.
 */
export interface PreviousPhaseCurrentUse {
  result_id: number;
  phase_year: number | null;
  total_actors: number;
  total_organizations: number;
  measures: PreviousPhaseMeasure[];
}

export interface PreviousPhaseMeasure {
  unit: string;
  quantity: number;
}

/** Raw `results_by_institution_type` row, as far as the previous-use figure reads it. */
export interface CurrentUseOrganizationRow {
  section_id?: number | string | null;
  institution_roles_id?: number | string | null;
  is_active?: boolean | number | null;
  how_many?: number | string | null;
}

/** Raw P25 `result_ip_measure` row, as far as the previous-use figure reads it. */
export interface CurrentUseMeasureRow {
  section_id?: number | string | null;
  is_active?: boolean | number | null;
  unit_of_measure?: string | null;
  quantity?: number | string | null;
}

/** Innovation Use organizations are role 5; the table also holds the result's partner rows. */
const INNOVATION_USE_ORGANIZATION_ROLE = 5;

const isActiveRow = (row: { is_active?: boolean | number | null }) =>
  row?.is_active === undefined ||
  row?.is_active === null ||
  Number(row.is_active) !== 0;

/** Sums the active role-5 organization rows that `pick` keeps. */
export function summarizeOrganizations(
  organizations: CurrentUseOrganizationRow[] | null | undefined,
  pick: (rows: any[]) => any[],
): { rows: number; total: number } {
  const rows = pick(
    (organizations ?? []).filter(
      (row) =>
        Number(row?.institution_roles_id) ===
          INNOVATION_USE_ORGANIZATION_ROLE && isActiveRow(row),
    ),
  );
  return {
    rows: rows.length,
    total: rows.reduce((sum, row) => sum + (Number(row.how_many) || 0), 0),
  };
}

/**
 * One line per unit. Units are free text (P-7), so they group by `lower(trim(unit))` and the
 * first-seen spelling (trimmed) is the label. Blank units are skipped.
 */
export function summarizeMeasures(
  measures: CurrentUseMeasureRow[] | null | undefined,
  pick: (rows: any[]) => any[],
): PreviousPhaseMeasure[] {
  const lines = new Map<string, PreviousPhaseMeasure>();
  for (const row of pick((measures ?? []).filter(isActiveRow))) {
    const label = String(row.unit_of_measure ?? '').trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const line = lines.get(key);
    if (line) line.quantity += Number(row.quantity) || 0;
    else lines.set(key, { unit: label, quantity: Number(row.quantity) || 0 });
  }
  return [...lines.values()];
}

export interface CurrentUseActorRow {
  section_id?: number | string | null;
  sex_and_age_disaggregation?: boolean | number | null;
  how_many?: number | string | null;
  women?: number | string | null;
  men?: number | string | null;
}

/** Keeps only the rows of the current-use section. */
export function currentUseRows<T extends CurrentUseActorRow>(actors: T[]): T[] {
  return (actors ?? []).filter(
    (row) => Number(row?.section_id) === ResultCoreInnovUseSectionEnum.CURRENT,
  );
}

/** Keeps every row that is not a 2030 projection row — the legacy reading of "current use". */
export function notFutureRows<T extends CurrentUseActorRow>(actors: T[]): T[] {
  return (actors ?? []).filter(
    (row) => Number(row?.section_id) !== ResultCoreInnovUseSectionEnum.FUTURE,
  );
}

/**
 * How many people one RAW `result_actors` row counts. Same rule `InnovationUseService.getActorsData`
 * applies before the v2 sum: a row whose disaggregation does not apply keeps the typed `how_many`;
 * every other row counts `women + men`.
 */
export function currentUseActorCount(row: CurrentUseActorRow): number {
  if (row?.sex_and_age_disaggregation == true) {
    return Number(row.how_many) || 0;
  }
  return (Number(row?.women) || 0) + (Number(row?.men) || 0);
}

/**
 * `pick` defaults to the legacy rule (`notFutureRows`); the v2 read passes `currentUseRows`.
 * `count` defaults to the raw-row rule. The v2 read passes its own because its rows were already
 * normalised by `getActorsData` (which also rewrites `women`/`men` from the youth columns, so
 * recounting them there would not give the same number).
 */
export function summarizePreviousPhaseCurrentUse(
  actors: CurrentUseActorRow[] | null | undefined,
  previousResultId: unknown,
  previousPhaseYear: unknown,
  count: (row: CurrentUseActorRow) => number = currentUseActorCount,
  pick: (rows: any[]) => any[] = notFutureRows,
  organizations?: CurrentUseOrganizationRow[] | null,
  measures?: CurrentUseMeasureRow[] | null,
): PreviousPhaseCurrentUse | null {
  const previousId = Number(previousResultId);
  if (!Number.isFinite(previousId) || previousId <= 0) return null;

  const rows = pick(actors ?? []);
  const orgs = summarizeOrganizations(organizations, pick);
  const measureLines = summarizeMeasures(measures, pick);
  // IU26-R-3: the block shows when the previous phase reported an actor, an organization or a measure.
  if (!rows.length && !orgs.rows && !measureLines.length) return null;

  const year = Number(previousPhaseYear);
  return {
    result_id: previousId,
    phase_year:
      previousPhaseYear != null && Number.isFinite(year) ? year : null,
    total_actors: rows.reduce((sum, row) => sum + count(row), 0),
    total_organizations: orgs.total,
    measures: measureLines,
  };
}
