import { PortfolioTocCoverageProgram } from '../../../../../../shared/interfaces/portfolio-toc-coverage.interface';
import { coveragePercent, naturalCodeCompare, toSummary, toViewRows } from './toc-kpi.format';

const program = (code: string, covered: number, total: number): PortfolioTocCoverageProgram => ({
  code,
  shortName: `${code} short`,
  name: `${code} name`,
  total,
  covered,
  outputs: { total: Math.floor(total / 2), covered: Math.floor(covered / 2) },
  outcomes: { total: total - Math.floor(total / 2), covered: covered - Math.floor(covered / 2) }
});

describe('toc-kpi.format (TKP-T-3)', () => {
  describe('coveragePercent (S-4.1 display maths)', () => {
    it.each([
      ['SP01', 100, 250, 40],
      ['SP02', 0, 40, 0],
      ['SP03', 199, 200, 99],
      ['SP04', 1, 300, 1],
      ['A3', 0, 0, null],
      ['full', 40, 40, 100],
      ['half-up .5', 1, 8, 13],
      ['just below half', 1, 9, 11],
      ['0/0 is not 0', 0, 0, null]
    ])('%s: %i of %i -> %p', (_label, covered, total, expected) => {
      expect(coveragePercent(covered as number, total as number)).toBe(expected);
    });
  });

  describe('naturalCodeCompare (S-5.1)', () => {
    const sorted = (codes: string[]) => [...codes].sort(naturalCodeCompare);

    it('orders non-padded numbers naturally, not lexically', () => {
      expect(sorted(['SP10', 'SP9', 'SP2'])).toEqual(['SP2', 'SP9', 'SP10']);
    });
    it('orders padded numbers', () => {
      expect(sorted(['SP10', 'SP09', 'SP02', 'SP01', 'SP13'])).toEqual(['SP01', 'SP02', 'SP09', 'SP10', 'SP13']);
    });
    it('puts SP codes before Accelerators although A < S alphabetically', () => {
      expect(sorted(['A3', 'SP13', 'A1', 'SP01'])).toEqual(['SP01', 'SP13', 'A1', 'A3']);
    });
    it('orders Accelerators naturally by code', () => {
      expect(sorted(['A10', 'A2', 'A1'])).toEqual(['A1', 'A2', 'A10']);
    });
  });

  describe('toViewRows', () => {
    const programs = [program('A3', 0, 0), program('SP10', 90, 100), program('SP02', 10, 100), program('SP09', 50, 100)];

    it('sorts by code, never by percent (S-5.1)', () => {
      expect(toViewRows(programs).map(r => r.code)).toEqual(['SP02', 'SP09', 'SP10', 'A3']);
    });

    it('does not mutate the input', () => {
      const copy = [...programs];
      toViewRows(programs);
      expect(programs).toEqual(copy);
    });

    it('carries counts, split and percent (null for zero-KPI)', () => {
      const rows = toViewRows([program('SP01', 100, 250), program('SP03', 199, 200), program('A3', 0, 0)]);
      expect(rows[0]).toEqual({
        code: 'SP01',
        name: 'SP01 name',
        shortName: 'SP01 short',
        covered: 100,
        total: 250,
        percent: 40,
        outputs: { total: 125, covered: 50 },
        outcomes: { total: 125, covered: 50 }
      });
      expect(rows[1].percent).toBe(99);
      expect(rows[2].percent).toBeNull();
    });

    it('returns an empty list for no programs', () => {
      expect(toViewRows([])).toEqual([]);
    });
  });

  describe('toSummary', () => {
    it('reads 300 / 790 as 38%', () => {
      expect(toSummary({ covered: 300, total: 790 })).toEqual({ covered: 300, total: 790, percent: 38 });
    });
    it('is null percent when the portfolio has no KPIs', () => {
      expect(toSummary({ covered: 0, total: 0 })).toEqual({ covered: 0, total: 0, percent: null });
    });
    it('applies the clamps', () => {
      expect(toSummary({ covered: 999, total: 1000 }).percent).toBe(99);
    });
  });
});
