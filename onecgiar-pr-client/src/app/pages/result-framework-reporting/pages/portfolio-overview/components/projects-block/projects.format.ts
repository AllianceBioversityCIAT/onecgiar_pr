// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-3, WPS-DD-6, WPS-DD-8)
import {
  ProjectCounts,
  ProjectsByCenter,
  ProjectsByProgram
} from '../../../../../../shared/interfaces/portfolio-bilateral-projects.interface';
import { naturalCodeCompare } from '../toc-kpi-block/toc-kpi.format';

/** One row of the block (chart and table), already ordered and labelled. */
export interface ProjectsViewRow extends ProjectCounts {
  /** Official code; `null` for the Unassigned Center bucket. */
  code: string | null;
  label: string;
  name: string;
}

/**
 * Share of mapped projects (WPS-R-8): one decimal, half-up; `'100.0'` only when equal to mapped;
 * `'0.0'` only when the count is 0, otherwise clamped to [0.1, 99.9]; `null` when mapped is 0.
 * Integer arithmetic only, so half-up is exact (no float drift on .x5 ties).
 */
export function shareOfMapped(count: number, mapped: number): string | null {
  if (!(mapped > 0)) return null;
  if (count >= mapped) return '100.0';
  if (count <= 0) return '0.0';
  const tenths = Math.floor((count * 2000 + mapped) / (2 * mapped));
  const clamped = Math.min(999, Math.max(1, tenths));
  return `${Math.floor(clamped / 10)}.${clamped % 10}`;
}

/** P/A rows in natural code order (WPS-R-7), never by figure. Does not mutate the input. */
export function toProgramRows(rows: readonly ProjectsByProgram[]): ProjectsViewRow[] {
  return [...rows]
    .sort((a, b) => naturalCodeCompare(a.code, b.code))
    .map(r => ({
      code: r.code,
      label: r.code,
      name: r.name,
      mapped: r.mapped,
      withBilateralResults: r.withBilateralResults,
      w1w2Contributors: r.w1w2Contributors
    }));
}

/**
 * Center rows (WPS-R-7, WPS-DD-8): label = catalogue acronym for the code (`labelFor`, the mapping the
 * Centers block uses), else the institution acronym, else the code. Sorted A->Z by label, Unassigned
 * (code `null`) last. Never ordered by a figure.
 */
export function toCenterRows(
  rows: readonly ProjectsByCenter[],
  labelFor: (code: string) => string | null | undefined,
  unassignedLabel = 'Unassigned'
): ProjectsViewRow[] {
  const view = rows.map(r => {
    const label = r.code === null ? unassignedLabel : labelFor(r.code) || r.acronym || r.code;
    return {
      code: r.code,
      label,
      name: r.name || label,
      mapped: r.mapped,
      withBilateralResults: r.withBilateralResults,
      w1w2Contributors: r.w1w2Contributors
    };
  });
  return view.sort((a, b) => {
    if (a.code === null || b.code === null) return a.code === b.code ? 0 : a.code === null ? 1 : -1;
    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) || a.code.localeCompare(b.code);
  });
}

/** WPS-R-4 footnote, singular / plural (JD-15). */
export function footnoteText(n: number): string {
  return n === 1
    ? '1 project has W3/Bilateral results but no approved P/A mapping, so it is not counted.'
    : `${n} projects have W3/Bilateral results but no approved P/A mapping, so they are not counted.`;
}
