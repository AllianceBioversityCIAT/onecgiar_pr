import { ResolvedChartTokens } from '../../../../shared/utils/chart-tokens.util';
import {
  AXIS_LABEL_ABBREVIATIONS,
  abbreviateAxisLabel,
  portfolioStatusDonutOption,
  portfolioStatusDonutTable,
  statusPipelineOption,
  categoryOriginBarOption,
  categoryOriginBarTable,
  centerBilateralOption,
  centerBilateralTable,
  truncateProgramAxisLabel,
  PROGRAM_AXIS_LABEL_MAX_CHARS
} from './portfolio-overview.charts';
import type {
  PortfolioStatusSegment,
  CategoryOriginRow,
  CenterDistributionRow
} from './services/portfolio-overview.service';

describe('portfolio-overview.charts (POV-T-2)', () => {
  describe('truncateProgramAxisLabel', () => {
    it('returns the label unchanged when it fits within the limit', () => {
      expect(truncateProgramAxisLabel('Climate Action', 18)).toBe('Climate Action');
    });

    it('appends ellipsis when the programme name exceeds the limit', () => {
      const longName =
        'Accelerated varietal improvement and seed delivery of legumes and dryland cereals in Africa (AVISA)';
      expect(truncateProgramAxisLabel(longName, PROGRAM_AXIS_LABEL_MAX_CHARS.matrix)).toBe(
        'Accelerated var...'
      );
    });
  });

  const mockTokens: ResolvedChartTokens = {
    ramp: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
    primary: '#8b5cf6',
    primaryStrong: '#6d28d9',
    bilateralMuted: '#64748b',
    textSecondary: '#6b7280',
    border: '#e5e7eb'
  };

  describe('AXIS_LABEL_ABBREVIATIONS & abbreviateAxisLabel', () => {
    it('abbreviates known category and status labels', () => {
      expect(abbreviateAxisLabel('Capacity sharing for development')).toBe('Cap-Dev');
      expect(abbreviateAxisLabel('Knowledge product')).toBe('KP');
      expect(abbreviateAxisLabel('Innovation development')).toBe('Inno-Dev');
      expect(abbreviateAxisLabel('Innovation use')).toBe('Inno-Use');
      expect(abbreviateAxisLabel('Policy change')).toBe('Policy');
      expect(abbreviateAxisLabel('Other output')).toBe('Other-Output');
      expect(abbreviateAxisLabel('Other outcome')).toBe('Other-Outcome');
      expect(abbreviateAxisLabel('Quality Assessed')).toBe('QAed');
    });

    it('returns the input unchanged for unknown strings', () => {
      expect(abbreviateAxisLabel('Custom Category')).toBe('Custom Category');
      expect(abbreviateAxisLabel('Editing')).toBe('Editing');
      expect(abbreviateAxisLabel('')).toBe('');
    });

    it('contains all expected key-value pairs in AXIS_LABEL_ABBREVIATIONS dictionary', () => {
      expect(AXIS_LABEL_ABBREVIATIONS['Knowledge product']).toBe('KP');
      expect(AXIS_LABEL_ABBREVIATIONS['Capacity sharing for development']).toBe('Cap-Dev');
    });
  });

  describe('portfolioStatusDonutOption & portfolioStatusDonutTable (POV-R-2)', () => {
    const segments: PortfolioStatusSegment[] = [
      { key: 'editing', label: 'Editing', count: 12, percent: 30, bg: '#fef3c7', fg: '#d97706' },
      { key: 'in-qa', label: 'In QA', count: 8, percent: 20, bg: '#ede9fe', fg: '#7c3aed' },
      { key: 'submitted', label: 'Submitted', count: 10, percent: 25, bg: '#e0e7ff', fg: '#4338ca' },
      { key: 'approved', label: 'Approved', count: 10, percent: 25, bg: '#dcfce7', fg: '#16a34a' },
      { key: 'rejected', label: 'Rejected', count: 0, percent: 0, bg: '#fee2e2', fg: '#dc2626' },
      { key: 'discontinued', label: 'Discontinued', count: 0, percent: 0, bg: '#f3f4f6', fg: '#6b7280' }
    ];

    describe('portfolioStatusDonutOption', () => {
      it('builds donut pie series with radius [62%, 88%] and center [50%, 50%]', () => {
        const option = portfolioStatusDonutOption(segments, mockTokens);
        const series = (option.series as { type: string; radius: string[]; center: string[] }[])[0];

        expect(series.type).toBe('pie');
        expect(series.radius).toEqual(['52%', '74%']);
        expect(series.center).toEqual(['50%', '50%']);
      });

      it('filters out zero-count segments from the visual pie data', () => {
        const option = portfolioStatusDonutOption(segments, mockTokens);
        const series = (option.series as { data: { name: string; value: number }[] }[])[0];

        expect(series.data.length).toBe(4);
        expect(series.data.map(d => d.name)).toEqual(['Editing', 'In QA', 'Submitted', 'Approved']);
        expect(series.data.map(d => d.value)).toEqual([12, 8, 10, 10]);
      });

      it('sets center title with total results count and "results" label', () => {
        const option = portfolioStatusDonutOption(segments, mockTokens);
        const title = option.title as { text: string; subtext: string; left: string; top: string };

        expect(title.text).toBe('40');
        expect(title.subtext).toBe('results');
        expect(title.left).toBe('center');
        expect(title.top).toBe('center');
      });

      it('derives slice colors from palette ramp', () => {
        const option = portfolioStatusDonutOption(segments, mockTokens);
        const series = (option.series as { data: { itemStyle?: { color?: string } }[] }[])[0];

        expect(series.data[0].itemStyle?.color).toBe(mockTokens.ramp[0]);
        expect(series.data[1].itemStyle?.color).toBe(mockTokens.ramp[1]);
        expect(series.data[2].itemStyle?.color).toBe(mockTokens.ramp[2]);
        expect(series.data[3].itemStyle?.color).toBe(mockTokens.ramp[3]);
      });

      it('supports custom palette array passed directly', () => {
        const customPalette = ['#111', '#222', '#333'];
        const option = portfolioStatusDonutOption(segments, customPalette);
        const series = (option.series as { data: { itemStyle?: { color?: string } }[] }[])[0];

        expect(series.data[0].itemStyle?.color).toBe('#111');
        expect(series.data[1].itemStyle?.color).toBe('#222');
      });

      it('formats tooltip showing name, value, and percentage', () => {
        const option = portfolioStatusDonutOption(segments, mockTokens);
        const tooltip = option.tooltip as { formatter: (p: unknown) => string };

        expect(tooltip.formatter({ name: 'Editing', value: 12, percent: 30 })).toContain('Editing');
        expect(tooltip.formatter({ name: 'Editing', value: 12, percent: 30 })).toContain('12 (30%)');
      });

      it('handles empty segments array without throwing', () => {
        const option = portfolioStatusDonutOption([], mockTokens);
        const title = option.title as { text: string };
        const series = (option.series as { data: unknown[] }[])[0];

        expect(title.text).toBe('0');
        expect(series.data).toEqual([]);
      });
    });

    describe('statusPipelineOption', () => {
      it('builds a horizontal stacked bar with all non-zero status segments', () => {
        const option = statusPipelineOption(segments, mockTokens) as {
          series: { name: string; type: string; stack: string; data: number[] }[];
        };

        expect(option.series.length).toBe(4);
        expect(option.series[0].name).toBe('Editing');
        expect(option.series[0].data).toEqual([12]);
        expect(option.series[1].name).toBe('In QA');
        expect(option.series[1].data).toEqual([8]);
      });
    });

    describe('portfolioStatusDonutTable', () => {
      it('builds table model with caption, headers, and all segment rows including zero-count', () => {
        const table = portfolioStatusDonutTable(segments, 'X');

        expect(table.caption).toBe('X');
        expect(table.headers).toEqual(['Status', 'Results', 'Share']);
        expect(table.rows).toEqual([
          ['Editing', 12, '30%'],
          ['In QA', 8, '20%'],
          ['Submitted', 10, '25%'],
          ['Approved', 10, '25%'],
          ['Rejected', 0, '0%'],
          ['Discontinued', 0, '0%']
        ]);
      });

      it('handles empty array producing empty rows', () => {
        const table = portfolioStatusDonutTable([], 'X');
        expect(table.rows).toEqual([]);
      });
    });
  });

  describe('categoryOriginBarOption & categoryOriginBarTable (POV-R-3)', () => {
    const categoryRows: CategoryOriginRow[] = [
      { category: 'Knowledge product', w1w2Count: 25, bilateralCount: 15, total: 40 },
      { category: 'Capacity sharing for development', w1w2Count: 20, bilateralCount: 10, total: 30 },
      { category: 'Innovation development', w1w2Count: 10, bilateralCount: 5, total: 15 }
    ];

    describe('categoryOriginBarOption', () => {
      it('configures a horizontal stacked bar chart with yAxis category data and abbreviation formatter', () => {
        const option = categoryOriginBarOption(categoryRows, mockTokens) as {
          xAxis: { type: string; splitLine?: { show: boolean } };
          yAxis: { type: string; data: string[]; inverse: boolean; axisLabel?: { formatter: (v: string) => string } };
        };

        expect(option.xAxis.type).toBe('value');
        expect(option.xAxis.splitLine?.show).toBe(true);
        expect(option.yAxis.type).toBe('category');
        expect(option.yAxis.data).toEqual([
          'Knowledge product',
          'Capacity sharing for development',
          'Innovation development'
        ]);
        expect(option.yAxis.inverse).toBe(true);
        expect(option.yAxis.axisLabel?.formatter('Knowledge product')).toBe('KP');
        expect(option.yAxis.axisLabel?.formatter('Capacity sharing for development')).toBe('Cap-Dev');
      });

      it('emits two bar series stacked on total: W1/W2 Portfolio and W3/Bilateral with respective tokens', () => {
        const option = categoryOriginBarOption(categoryRows, mockTokens);
        const series = option.series as {
          name: string;
          type: string;
          stack: string;
          color?: string;
          itemStyle?: { color?: string };
          data: number[];
        }[];

        expect(series.length).toBe(3);

        expect(series[0].name).toBe('W1/W2 Portfolio');
        expect(series[0].type).toBe('bar');
        expect(series[0].stack).toBe('total');
        expect(series[0].color || series[0].itemStyle?.color).toBe(mockTokens.primaryStrong);
        expect(series[0].data).toEqual([25, 20, 10]);

        expect(series[1].name).toBe('W3/Bilateral');
        expect(series[1].type).toBe('bar');
        expect(series[1].stack).toBe('total');
        expect(series[1].color || series[1].itemStyle?.color).toBe(mockTokens.bilateralMuted);
        expect(series[1].data).toEqual([15, 10, 5]);

        expect(series[2].name).toBe('Total');
      });

      it('formats tooltip with category, total count, and W1/W2 vs Bilateral breakdown', () => {
        const option = categoryOriginBarOption(categoryRows, mockTokens);
        const tooltip = option.tooltip as { formatter: (p: unknown) => string };

        expect(tooltip.formatter({ dataIndex: 0 })).toContain('Knowledge product');
        expect(tooltip.formatter({ dataIndex: 0 })).toContain('40 total');
        expect(tooltip.formatter([{ dataIndex: 1 }])).toContain('Capacity sharing for development');
        expect(tooltip.formatter([{ dataIndex: 1 }])).toContain('30 total');
        expect(tooltip.formatter({ dataIndex: 99 })).toBe('');
      });

      it('handles empty rows array without error', () => {
        const option = categoryOriginBarOption([], mockTokens);
        const series = option.series as { data: number[] }[];

        expect(series[0].data).toEqual([]);
        expect(series[1].data).toEqual([]);
      });
    });

    describe('categoryOriginBarTable', () => {
      it('builds table model with caption, headers, and mapped category origin rows', () => {
        const table = categoryOriginBarTable(categoryRows);

        expect(table.caption).toBe('Results by indicator category and funding origin');
        expect(table.headers).toEqual(['Indicator Category', 'W1/W2 Portfolio', 'W3/Bilateral', 'Total']);
        expect(table.rows).toEqual([
          ['Knowledge product', 25, 15, 40],
          ['Capacity sharing for development', 20, 10, 30],
          ['Innovation development', 10, 5, 15]
        ]);
      });
    });
  });

  describe('centerBilateralOption & centerBilateralTable (POV-R-5)', () => {
    const centerRows: CenterDistributionRow[] = [
      { centerId: 'CIAT', centerName: 'Alliance Bioversity-CIAT', count: 45, approvedCount: 30, percent: 45 },
      { centerId: 'CIMMYT', centerName: 'CIMMYT', count: 35, approvedCount: 25, percent: 35 }
    ];

    describe('centerBilateralOption', () => {
      it('configures a single horizontal bar chart with center names on yAxis', () => {
        const option = centerBilateralOption(centerRows, mockTokens) as {
          xAxis: { type: string };
          yAxis: { type: string; data: string[]; inverse: boolean };
          series: { name: string; type: string; color?: string; itemStyle?: { color?: string }; data: number[] }[];
        };

        expect(option.xAxis.type).toBe('value');
        expect(option.yAxis.type).toBe('category');
        expect(option.yAxis.data).toEqual(['CIAT', 'CIMMYT']);
        expect(option.yAxis.inverse).toBe(true);

        expect(option.series.length).toBe(1);
        expect(option.series[0].name).toBe('Bilateral Results');
        expect(option.series[0].type).toBe('bar');
        expect(option.series[0].color || option.series[0].itemStyle?.color).toBe(mockTokens.bilateralMuted);
        expect(option.series[0].data).toEqual([45, 35]);
      });

      it('falls back to centerName on yAxis if centerId is empty', () => {
        const noIdRows: CenterDistributionRow[] = [
          { centerId: '', centerName: 'Alliance Bioversity-CIAT', count: 20, approvedCount: 15, percent: 20 }
        ];
        const option = centerBilateralOption(noIdRows, mockTokens) as {
          yAxis: { data: string[] };
        };

        expect(option.yAxis.data).toEqual(['Alliance Bioversity-CIAT']);
      });

      it('formats tooltip showing program / center name, count, approved count, and percentage share', () => {
        const option = centerBilateralOption(centerRows, mockTokens);
        const tooltip = option.tooltip as { formatter: (p: unknown) => string };

        expect(tooltip.formatter({ dataIndex: 0 })).toContain('45 results (30 approved · 45%)');
        expect(tooltip.formatter({ dataIndex: 1 })).toContain('35 results (25 approved · 35%)');
        expect(tooltip.formatter({ dataIndex: 99 })).toBe('');
      });

      it('handles empty center rows array', () => {
        const option = centerBilateralOption([], mockTokens);
        const series = option.series as { data: number[] }[];

        expect(series[0].data).toEqual([]);
      });
    });

    describe('centerBilateralTable', () => {
      it('builds table model with caption, headers, and mapped center distribution rows', () => {
        const table = centerBilateralTable(centerRows);

        expect(table.caption).toBe('Bilateral results distribution by Science Program');
        expect(table.headers).toEqual(['Science Program', 'Results Count', 'Approved Count', 'Share']);
        expect(table.rows).toEqual([
          ['CIAT', 45, 30, '45%'],
          ['CIMMYT', 35, 25, '35%']
        ]);
      });
    });
  });
});
