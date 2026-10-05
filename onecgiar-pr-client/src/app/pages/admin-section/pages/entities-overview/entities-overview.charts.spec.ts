import {
  StatusColumn,
  buildHeatmapOption,
  buildRankingOption,
  buildSegments,
  buildShareOption,
  buildStatusDonutOption,
  percentOf,
  statusIdFromChartEvent
} from './entities-overview.charts';
import { EntityOverviewRow } from './entities-overview.aggregate';

describe('entities-overview charts (P2-3858 rework)', () => {
  const columns: StatusColumn[] = [
    { id: 1, label: 'Editing', color: 'orange' },
    { id: 5, label: 'Pending review', color: 'blue' }
  ];
  const rows: EntityOverviewRow[] = [
    { code: 'A', name: 'Alpha', link: '/a', total: 3, counts: [1, 2] },
    { code: 'B', name: 'Beta', link: '/b', total: 5, counts: [5, 0] },
    { code: 'C', name: 'Gamma', link: '/c', total: 0, counts: [0, 0] }
  ];

  it('percentOf rounds to one decimal and never divides by zero', () => {
    expect(percentOf(1, 3)).toBe(33.3);
    expect(percentOf(4, 0)).toBe(0);
  });

  it('segments carry count and share of the total', () => {
    expect(buildSegments(columns, { total: 8, counts: [6, 2] })).toEqual([
      { id: 1, label: 'Editing', color: 'orange', count: 6, percent: 75 },
      { id: 5, label: 'Pending review', color: 'blue', count: 2, percent: 25 }
    ]);
  });

  it('donut fades the slices that are not the selected status and keeps the status id on each slice', () => {
    const option: any = buildStatusDonutOption(buildSegments(columns, { total: 8, counts: [6, 2] }), 8, 5);
    const data = option.series[0].data;
    expect(data.map((d: any) => d.statusId)).toEqual([1, 5]);
    expect(data[0].itemStyle.opacity).toBeLessThan(1);
    expect(data[1].itemStyle.opacity).toBe(1);
    expect(option.title.text).toBe('8');
  });

  it('horizontal ranking puts the largest entity at the top (last category) with one series per status + a total label', () => {
    const option: any = buildRankingOption(rows, columns, null, 'horizontal');
    expect(option.yAxis.data).toEqual(['Gamma', 'Alpha', 'Beta']);
    expect(option.series.map((s: any) => s.id)).toEqual(['status-1', 'status-5', 'total-label']);
    expect(option.series[2].data).toEqual([0, 3, 5]);
  });

  it('a selected status keeps only that series and ranks by it', () => {
    const option: any = buildRankingOption(rows, columns, 5, 'vertical');
    expect(option.xAxis.data).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(option.series.map((s: any) => s.id)).toEqual(['status-5', 'total-label']);
    expect(option.series[0].data).toEqual([2, 0, 0]);
  });

  it('heatmap has one cell per entity × status', () => {
    const option: any = buildHeatmapOption(rows, columns, ['#eee', '#333']);
    expect(option.series[0].data).toHaveLength(rows.length * columns.length);
    expect(option.visualMap.max).toBe(5);
  });

  it('share view stacks each entity to 100 % without dividing by an empty total', () => {
    const option: any = buildShareOption(rows, columns);
    const alpha = option.yAxis.data.indexOf('Alpha');
    expect(option.series[0].data[alpha] + option.series[1].data[alpha]).toBeCloseTo(100, 0);
    const gamma = option.yAxis.data.indexOf('Gamma');
    expect(option.series[0].data[gamma]).toBe(0);
  });

  it('reads the status of a clicked slice or bar, and nothing from the total label', () => {
    expect(statusIdFromChartEvent({ data: { statusId: 6 } })).toBe(6);
    expect(statusIdFromChartEvent({ seriesId: 'status-7' })).toBe(7);
    expect(statusIdFromChartEvent({ seriesId: 'total-label' })).toBeNull();
    expect(statusIdFromChartEvent(null)).toBeNull();
  });
});
