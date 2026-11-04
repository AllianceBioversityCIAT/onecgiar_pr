/**
 * Word count for the impact "contribution statement" (requirements §3, IRS-R-5; design §5).
 *
 * A word is a maximal run of non-whitespace characters after trimming. Must stay in sync with the
 * SQL in `validation_impact_level_info_P25` (collapse `[[:space:]]+`, then count separators + 1).
 *
 * "Whitespace" is MySQL ICU `[[:space:]]`, not JS `\s`: they agree on U+00A0 and U+3000 (both
 * separate words) but differ on U+0085 (SQL-only whitespace, so it is added) and U+FEFF (JS-only
 * whitespace, so it is excluded and is part of a word). `String.prototype.trim` also strips U+FEFF,
 * hence no `trim()`: empty segments produced by leading/trailing separators are filtered instead.
 * Empty / whitespace-only => 0.
 */
const SEPARATORS = /(?:(?!﻿)\s|\u0085)+/u;

export function countWords(text: string | null | undefined): number {
  if (text === null || text === undefined) return 0;
  return String(text)
    .split(SEPARATORS)
    .filter((segment) => segment.length > 0).length;
}
