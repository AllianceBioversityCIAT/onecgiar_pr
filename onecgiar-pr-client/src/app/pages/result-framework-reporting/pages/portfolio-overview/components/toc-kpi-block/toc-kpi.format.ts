import { CoverageCount, PortfolioTocCoverageProgram } from '../../../../../../shared/interfaces/portfolio-toc-coverage.interface';

export interface TocKpiViewRow {
  code: string;
  name: string;
  shortName: string;
  covered: number;
  total: number;
  /** Whole-number coverage %, or `null` when the program has no KPIs. */
  percent: number | null;
  outputs: CoverageCount;
  outcomes: CoverageCount;
}

export interface TocKpiSummary extends CoverageCount {
  percent: number | null;
}

/**
 * Coverage % per TKP-R-4: half-up whole number; 100 only when covered = total
 * (else capped at 99); 0 only when covered = 0 (else at least 1); `null` when total = 0.
 */
export function coveragePercent(covered: number, total: number): number | null {
  if (!total) return null;
  if (covered >= total) return 100;
  if (covered <= 0) return 0;
  const rounded = Math.floor((covered * 100) / total + 0.5);
  return Math.min(99, Math.max(1, rounded));
}

const CODE_PATTERN = /^([A-Za-z]+)0*(\d+)$/;

/**
 * Natural order by official code (TKP-R-5): Science Programs (`SP`) first, then every
 * other prefix (Accelerators) after them, each by prefix then numeric part. Plain
 * alphabetical order would put `A` before `S`, so the group rank is explicit.
 */
export function naturalCodeCompare(a: string, b: string): number {
  const pa = CODE_PATTERN.exec(a);
  const pb = CODE_PATTERN.exec(b);
  if (!pa || !pb) {
    if (pa) return -1;
    if (pb) return 1;
    return a.localeCompare(b);
  }
  const prefixA = pa[1].toUpperCase();
  const prefixB = pb[1].toUpperCase();
  const rankA = prefixA === 'SP' ? 0 : 1;
  const rankB = prefixB === 'SP' ? 0 : 1;
  if (rankA !== rankB) return rankA - rankB;
  if (prefixA !== prefixB) return prefixA < prefixB ? -1 : 1;
  return Number(pa[2]) - Number(pb[2]);
}

/** Rows sorted by code (never by %), with the display percent resolved. Does not mutate the input. */
export function toViewRows(programs: PortfolioTocCoverageProgram[]): TocKpiViewRow[] {
  return [...programs]
    .sort((x, y) => naturalCodeCompare(x.code, y.code))
    .map(p => ({
      code: p.code,
      name: p.name,
      shortName: p.shortName,
      covered: p.covered,
      total: p.total,
      percent: coveragePercent(p.covered, p.total),
      outputs: p.outputs,
      outcomes: p.outcomes
    }));
}

export function toSummary(portfolio: CoverageCount): TocKpiSummary {
  return { covered: portfolio.covered, total: portfolio.total, percent: coveragePercent(portfolio.covered, portfolio.total) };
}

/** Rows whose code is in `programs`; every row when the set is empty (no Program filter). Does not mutate the input. */
export function filterRowsByPrograms(rows: readonly TocKpiViewRow[], programs: ReadonlySet<string>): TocKpiViewRow[] {
  return programs.size ? rows.filter(row => programs.has(row.code)) : [...rows];
}

/** Sum of the visible rows (GLF-P-5): the summary of a Program-filtered view. */
export function sumRows(rows: readonly TocKpiViewRow[]): CoverageCount {
  return rows.reduce((acc, row) => ({ covered: acc.covered + row.covered, total: acc.total + row.total }), { covered: 0, total: 0 });
}
