import { NewValidationsDto } from './dto/new-validations.dto';

/**
 * `changes/my-work-board` (MWB-R-8, MWB-DD-1): the cap on how many eligible results per
 * `roles/filter` request get a completeness fold computed, bounding the added cost of the
 * opt-in `include_completeness` flag to at most this many `validateResultById` calls.
 */
export const MWB_COMPLETENESS_CAP = 60;

export interface CompletenessFold {
  complete: number;
  total: number;
  missing: string[];
}

// @akili-spec changes/my-work-board
/**
 * Pure fold over one result's v2 validation rows into the `n of m` + missing-sections shape the
 * "My work" board card renders. Reuses the P2-3552 `Number(value) === 1` rule verbatim (never
 * `Boolean`) so a stringified '0' reads as missing rather than painting the section green.
 * `missing` preserves the order the procedure returned the rows in.
 */
export function foldCompleteness(
  rows: NewValidationsDto[] | null | undefined,
): CompletenessFold {
  const list = rows ?? [];
  const isValid = (value: unknown): boolean => Number(value) === 1;

  const missing = list
    .filter((row) => !isValid(row.validation))
    .map((row) => row.section_name);

  return {
    complete: list.length - missing.length,
    total: list.length,
    missing,
  };
}
