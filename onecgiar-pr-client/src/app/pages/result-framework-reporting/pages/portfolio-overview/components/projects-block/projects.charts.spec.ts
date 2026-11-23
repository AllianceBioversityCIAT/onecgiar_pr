import { readFileSync } from 'fs';
import { join } from 'path';
import { ResolvedChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import { buildProjectsOption, buildProjectsTable, ProjectsChartLabels, projectsChartHeight, ProjectsSeriesColours } from './projects.charts';
import { ProjectsViewRow } from './projects.format';

const tokens: ResolvedChartTokens = { ramp: ['c1', 'c2', 'c3', 'c4'], primary: 'p', primaryStrong: 'ps', bilateralMuted: 'bm', textSecondary: 'ts', border: 'b' };
const labels: ProjectsChartLabels = { mapped: 'Mapped', withBilateral: 'With W3', w1w2: 'W1/W2', caption: 'Projects', firstColumn: 'P/A', totalLabel: 'Total' };
const colours: ProjectsSeriesColours = { mapped: 'm-col', withBilateral: 'w-col', w1w2: 'x-col' };
const rows: ProjectsViewRow[] = [
  { code: 'SP01', label: 'SP01 · One', fullLabel: 'SP01 · One Program', name: 'One Program', mapped: 30, withBilateralResults: 17, w1w2Contributors: 1 },
  { code: 'SP02', label: 'SP02', fullLabel: 'SP02 · Two Program', name: 'Two Program', mapped: 0, withBilateralResults: 0, w1w2Contributors: 0 }
];

describe('projects.charts', () => {
  const option: any = buildProjectsOption(rows, tokens, labels, colours);

  it('has exactly 3 bar series and none is stacked', () => {
    expect(option.series).toHaveLength(3);
    for (const s of option.series) {
      expect(s.type).toBe('bar');
      expect('stack' in s).toBe(false);
    }
  });
  it('paints the three series with the colours passed in, in order, and names them from copy', () => {
    expect(option.series.map((s: any) => s.itemStyle.color)).toEqual(['m-col', 'w-col', 'x-col']);
    expect(option.series.map((s: any) => s.color)).toEqual(['m-col', 'w-col', 'x-col']);
    expect(option.series.map((s: any) => s.name)).toEqual(['Mapped', 'With W3', 'W1/W2']);
  });
  it('uses no tokens.ramp value for any series colour (PGC-R-3)', () => {
    for (const s of option.series) {
      expect(tokens.ramp).not.toContain(s.itemStyle.color);
      expect(tokens.ramp).not.toContain(s.color);
    }
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
  it('shows a value label at the right of each bar and carries the counts by row', () => {
    for (const s of option.series) expect(s.label).toEqual(expect.objectContaining({ show: true, position: 'right' }));
    expect(option.series[1].data).toEqual([17, 0]);
  });
  // @akili-spec bugfix/inc-168459-portfolio-overview-data (POD-T-2, Scenarios 1.1 / 1.2)
  it('is horizontal: category yAxis (inverse, labels in row order, never rotated, wrapped), value xAxis with integer ticks', () => {
    expect(option.yAxis.type).toBe('category');
    expect(option.yAxis.inverse).toBe(true);
    expect(option.yAxis.data).toEqual(['SP01 · One', 'SP02']);
    expect(option.yAxis.axisLabel.rotate).toBeUndefined();
    expect(option.yAxis.axisLabel.width).toBeGreaterThan(0);
    expect(option.yAxis.axisLabel.overflow).toBe('break');
    expect(option.yAxis.axisLabel.interval).toBe(0);
    expect(option.xAxis.type).toBe('value');
    expect(option.xAxis.minInterval).toBe(1);
  });
  it('axis tooltip shows the full name and the three values for the hovered row', () => {
    expect(option.tooltip.trigger).toBe('axis');
    const out: string = option.tooltip.formatter([
      { dataIndex: 0, seriesName: 'Mapped', value: 30, marker: '' },
      { dataIndex: 0, seriesName: 'With W3', value: 17, marker: '' },
      { dataIndex: 0, seriesName: 'W1/W2', value: 1, marker: '' }
    ]);
    expect(out).toContain('SP01 · One Program');
    expect(out).toContain('Mapped');
    expect(out).toContain('30');
    expect(out).toContain('17');
    expect(out).toContain('W1/W2');
  });
  it('escapes HTML in the tooltip title', () => {
    const o: any = buildProjectsOption([{ ...rows[0], fullLabel: 'X <b>y</b>' }], tokens, labels, colours);
    expect(o.tooltip.formatter([{ dataIndex: 0, seriesName: 'Mapped', value: 1, marker: '' }])).toContain('&lt;b&gt;y&lt;/b&gt;');
  });
  it('projectsChartHeight grows with the row count and never goes under 320 px', () => {
    expect(projectsChartHeight(0)).toBeGreaterThanOrEqual(320);
    expect(projectsChartHeight(1)).toBeGreaterThanOrEqual(320);
    expect(projectsChartHeight(13)).toBeGreaterThan(projectsChartHeight(1));
    expect(projectsChartHeight(13)).toBe(13 * 44 + 80);
  });
  it('table model has the same rows plus the total row from the totals, not a column sum', () => {
    const table = buildProjectsTable(rows, { mapped: 31, withBilateralResults: 18, w1w2Contributors: 2 }, labels);
    expect(table.headers).toEqual(['P/A', 'Mapped', 'With W3', 'W1/W2']);
    expect(table.rows).toEqual([['SP01 · One Program', 30, 17, 1], ['SP02 · Two Program', 0, 0, 0], ['Total', 31, 18, 2]]);
  });
});
