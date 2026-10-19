import { readFileSync } from 'fs';
import { join } from 'path';
import { ResolvedChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import { buildProjectsOption, buildProjectsTable, ProjectsChartLabels } from './projects.charts';
import { ProjectsViewRow } from './projects.format';

const tokens: ResolvedChartTokens = { ramp: ['c1', 'c2', 'c3', 'c4'], primary: 'p', primaryStrong: 'ps', bilateralMuted: 'bm', textSecondary: 'ts', border: 'b' };
const labels: ProjectsChartLabels = { mapped: 'Mapped', withBilateral: 'With W3', w1w2: 'W1/W2', caption: 'Projects', firstColumn: 'P/A', totalLabel: 'Total' };
const rows: ProjectsViewRow[] = [
  { code: 'SP01', label: 'SP01', name: 'One', mapped: 30, withBilateralResults: 17, w1w2Contributors: 1 },
  { code: 'SP02', label: 'SP02', name: 'Two', mapped: 0, withBilateralResults: 0, w1w2Contributors: 0 }
];

describe('projects.charts', () => {
  const option: any = buildProjectsOption(rows, tokens, labels);

  it('has exactly 3 bar series and none is stacked', () => {
    expect(option.series).toHaveLength(3);
    for (const s of option.series) {
      expect(s.type).toBe('bar');
      expect('stack' in s).toBe(false);
    }
  });
  it('paints Mapped ramp[0], With W3 ramp[2], W1/W2 ramp[1] and names them from copy', () => {
    expect(option.series.map((s: any) => s.itemStyle.color)).toEqual(['c1', 'c3', 'c2']);
    expect(option.series.map((s: any) => s.color)).toEqual(['c1', 'c3', 'c2']);
    expect(option.series.map((s: any) => s.name)).toEqual(['Mapped', 'With W3', 'W1/W2']);
  });
  it('gives only the W1/W2 series a diagonal-stripe decal, with no colour literal', () => {
    expect(option.series.map((s: any) => !!s.itemStyle.decal)).toEqual([false, false, true]);
    const decal = option.series[2].itemStyle.decal;
    expect(decal.rotation).toBeCloseTo(Math.PI / 4);
    expect(decal.color).toBeUndefined();
  });
  it('keeps the series order and carries each count under its own series', () => {
    expect(option.series[0].data).toEqual([30, 0]);
    expect(option.series[1].data).toEqual([17, 0]);
    expect(option.series[2].data).toEqual([1, 0]);
  });
  it('source has no hex colour literal', () => {
    const src = readFileSync(join(__dirname, 'projects.charts.ts'), 'utf8');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
  it('shows a value label on top and carries the counts by row', () => {
    for (const s of option.series) expect(s.label).toEqual(expect.objectContaining({ show: true, position: 'top' }));
    expect(option.series[1].data).toEqual([17, 0]);
    expect(option.xAxis.data).toEqual(['SP01', 'SP02']);
  });
  it('table model has the same rows plus the total row from the totals, not a column sum', () => {
    const table = buildProjectsTable(rows, { mapped: 31, withBilateralResults: 18, w1w2Contributors: 2 }, labels);
    expect(table.headers).toEqual(['P/A', 'Mapped', 'With W3', 'W1/W2']);
    expect(table.rows).toEqual([['SP01', 30, 17, 1], ['SP02', 0, 0, 0], ['Total', 31, 18, 2]]);
  });
});
