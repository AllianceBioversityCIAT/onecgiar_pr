import { ResultCoreInnovUseSectionEnum } from '../../../results-framework-reporting/result_innov_section/enum/result_innov_section.enum';

/**
 * P2-3985 — the "Previous reported use" figure of the Current Use Update block, shared by the two
 * endpoints that serve it: the v2 innovation-use read (W1/W2 pool funding) and the legacy summary
 * read (W3/bilateral). It lives here, as a pure function, because `InnovationUseModule` imports
 * `SummaryModule`: injecting the v2 service into `SummaryService` would close a circular dependency.
 *
 * The rules are the ones of P2-3537 §4 (Yeck, 3 Sep 2026):
 * - only the current-use actors count, never organisations, measures or the 2030 projection rows
 *   (`section_id = 2`) that share the table. Which rows are "current use" depends on the writer:
 *   the v2 writer stamps `section_id = 1`, while the legacy one (bilateral editor,
 *   `innovation_dev.service`) leaves it NULL — so the legacy read keeps every non-2030 row, the same
 *   rule its own `getInnovationUse` applies, and the v2 read passes `currentUseRows`;
 * - `null` when there is no previous phase or it reported no actors — that is what tells the screen
 *   not to render the block at all.
 */
export interface PreviousPhaseCurrentUse {
  result_id: number;
  phase_year: number | null;
  total_actors: number;
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
  pick: (rows: CurrentUseActorRow[]) => CurrentUseActorRow[] = notFutureRows,
): PreviousPhaseCurrentUse | null {
  const previousId = Number(previousResultId);
  if (!Number.isFinite(previousId) || previousId <= 0) return null;

  const rows = pick(actors ?? []);
  if (!rows.length) return null;

  const year = Number(previousPhaseYear);
  return {
    result_id: previousId,
    phase_year:
      previousPhaseYear != null && Number.isFinite(year) ? year : null,
    total_actors: rows.reduce((sum, row) => sum + count(row), 0),
  };
}
