import { ResolvedChartTokens } from '../../../../shared/utils/chart-tokens.util';
import {
  AXIS_LABEL_ABBREVIATIONS,
  abbreviateAxisLabel,
  portfolioStatusDonutOption,
  portfolioStatusDonutTable,
  statusPipelineOption,
  categoryOriginBarOption,
  categoryOriginBarTable,
  programRankingOption,
  programRankingTable,
  programRankingVerticalOption,
  programRankingHeatmapOption,
  programRankingHeatmapTable,
  centerBilateralOption,
  centerBilateralTable,
  matrixTableChartOption,
  matrixTableChartTable
} from './portfolio-overview.charts';
import type {
  PortfolioStatusSegment,
  CategoryOriginRow,
  ProgramRankingRow,
  CenterDistributionRow
} from './services/portfolio-overview.service';

describe('portfolio-overview.charts (POV-T-2)', () => {
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
        const table = portfolioStatusDonutTable(segments);

        expect(table.caption).toBe('Portfolio reporting status breakdown');
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
        const table = portfolioStatusDonutTable([]);
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

  describe('programRankingOption & programRankingTable (POV-R-4)', () => {
    const programRows: ProgramRankingRow[] = [
      { code: 'SP01', name: 'Plant Health', editing: 5, submittedOrQa: 15, approved: 30, total: 50 },
      { code: 'SP02', name: 'Livestock Genetics', editing: 8, submittedOrQa: 12, approved: 20, total: 40 }
    ];

    describe('programRankingOption', () => {
      it('configures a horizontal stacked bar chart with program codes on yAxis', () => {
        const option = programRankingOption(programRows, mockTokens) as {
          xAxis: { type: string };
          yAxis: { type: string; data: string[]; inverse: boolean };
        };

        expect(option.xAxis.type).toBe('value');
        expect(option.yAxis.type).toBe('category');
        expect(option.yAxis.data).toEqual(['SP01', 'SP02']);
        expect(option.yAxis.inverse).toBe(true);
      });

      it('emits three stacked bar series: Editing, Submitted / In QA, Approved', () => {
        const option = programRankingOption(programRows, mockTokens);
        const series = option.series as {
          name: string;
          type: string;
          stack: string;
          color?: string;
          itemStyle?: { color?: string };
          data: number[];
        }[];

        expect(series.length).toBe(4);

        expect(series[0].name).toBe('Editing');
        expect(series[0].stack).toBe('status');
        expect(series[0].data).toEqual([5, 8]);
        expect(series[0].color || series[0].itemStyle?.color).toBe(mockTokens.ramp[3]);

        expect(series[1].name).toBe('Submitted / In QA');
        expect(series[1].stack).toBe('status');
        expect(series[1].data).toEqual([15, 12]);
        expect(series[1].color || series[1].itemStyle?.color).toBe(mockTokens.primaryStrong);

        expect(series[2].name).toBe('Approved');
        expect(series[2].stack).toBe('status');
        expect(series[2].data).toEqual([30, 20]);
        expect(series[2].color || series[2].itemStyle?.color).toBe(mockTokens.ramp[0]);

        expect(series[3].name).toBe('Total');
      });

      it('formats tooltip showing program code, name, total, and status breakdown', () => {
        const option = programRankingOption(programRows, mockTokens);
        const tooltip = option.tooltip as { formatter: (p: unknown) => string };

        expect(tooltip.formatter({ dataIndex: 0 })).toContain('SP01 - Plant Health');
        expect(tooltip.formatter({ dataIndex: 0 })).toContain('50 total');
        expect(tooltip.formatter({ dataIndex: 1 })).toContain('SP02 - Livestock Genetics');
        expect(tooltip.formatter({ dataIndex: 1 })).toContain('40 total');
        expect(tooltip.formatter({ dataIndex: 99 })).toBe('');
      });

      it('handles empty program rows array', () => {
        const option = programRankingOption([], mockTokens);
        const series = option.series as { data: number[] }[];

        expect(series[0].data).toEqual([]);
        expect(series[1].data).toEqual([]);
        expect(series[2].data).toEqual([]);
      });
    });

    describe('programRankingTable', () => {
      it('builds table model with caption, headers, and mapped program ranking rows', () => {
        const table = programRankingTable(programRows);

        expect(table.caption).toBe('Results progress ranked by Science Program');
        expect(table.headers).toEqual(['Science Program', 'Program Name', 'Editing', 'Submitted / QA', 'Approved', 'Total']);
        expect(table.rows).toEqual([
          ['SP01', 'Plant Health', 5, 15, 30, 50],
          ['SP02', 'Livestock Genetics', 8, 12, 20, 40]
        ]);
      });
    });

    describe('programRankingVerticalOption', () => {
      it('builds vertical column chart with science programs on xAxis and value on yAxis', () => {
        const option = programRankingVerticalOption(programRows, mockTokens) as {
          xAxis: { type: string; data: string[] };
          yAxis: { type: string };
          series: { name: string; type: string; stack: string; data: number[] }[];
        };

        expect(option.xAxis.type).toBe('category');
        expect(option.xAxis.data).toEqual(['SP01', 'SP02']);
        expect(option.yAxis.type).toBe('value');
        expect(option.series.length).toBe(4);
        expect(option.series[0].name).toBe('Editing');
        expect(option.series[0].data).toEqual([5, 8]);
        expect(option.series[1].name).toBe('Submitted / In QA');
        expect(option.series[1].data).toEqual([15, 12]);
        expect(option.series[2].name).toBe('Approved');
        expect(option.series[2].data).toEqual([30, 20]);
        expect(option.series[3].name).toBe('Total');
      });
    });

    describe('programRankingHeatmapOption & programRankingHeatmapTable', () => {
      const heatmapRows = [
        { code: 'SP01', name: 'Plant Health', cells: [10, 5, 2] },
        { code: 'SP02', name: 'Livestock Genetics', cells: [8, 12, 0] }
      ];
      const categories = ['Innovation development', 'Knowledge product', 'Policy change'];

      it('builds heatmap series with mapped coordinates and visualMap in purple scale', () => {
        const option = programRankingHeatmapOption(heatmapRows, categories, mockTokens) as {
          xAxis: { type: string; data: string[] };
          yAxis: { type: string; data: string[] };
          visualMap: { min: number; max: number; inRange: { color: string[] } };
          series: { type: string; data: [number, number, number][] }[];
        };

        expect(option.xAxis.type).toBe('category');
        expect(option.xAxis.data).toEqual(['Inno-Dev', 'KP', 'Policy']);
        expect(option.yAxis.type).toBe('category');
        expect(option.yAxis.data).toEqual(['SP01', 'SP02']);

        expect(option.visualMap.max).toBe(12);
        expect(option.visualMap.inRange.color.length).toBeGreaterThan(1);

        expect(option.series[0].type).toBe('heatmap');
        expect(option.series[0].data).toEqual([
          [0, 0, 10],
          [1, 0, 5],
          [2, 0, 2],
          [0, 1, 8],
          [1, 1, 12],
          [2, 1, 0]
        ]);
      });

      it('builds accessible table model for the heatmap matrix', () => {
        const table = programRankingHeatmapTable(heatmapRows, categories);

        expect(table.caption).toBe('Science Programs results heatmap across indicator categories');
        expect(table.headers).toEqual(['Science Program', 'Program Name', 'Innovation development', 'Knowledge product', 'Policy change']);
        expect(table.rows).toEqual([
          ['SP01', 'Plant Health', 10, 5, 2],
          ['SP02', 'Livestock Genetics', 8, 12, 0]
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

  describe('matrixTableChartOption & matrixTableChartTable (POV-R-6)', () => {
    const mockRows = [
      { code: 'SP01', name: 'Plant Health', total: 15, cells: [10, 5] },
      { code: 'SP02', name: 'Breeding', total: 20, cells: [12, 8] }
    ];
    const mockCatCols = [
      { label: 'Knowledge product', shortLabel: 'KP', cellIndex: 0 },
      { label: 'Policy change', shortLabel: 'Policy', cellIndex: 1 }
    ];

    it('builds a stacked bar chart option with category series per column', () => {
      const option = matrixTableChartOption(mockRows, mockCatCols, mockTokens) as {
        xAxis: { data: string[] };
        series: { name: string; type: string; stack: string; data: number[] }[];
      };

      expect(option.xAxis.data).toEqual(['SP01', 'SP02']);
      expect(option.series.length).toBe(3);
      expect(option.series[0].name).toBe('KP');
      expect(option.series[0].data).toEqual([10, 12]);
      expect(option.series[1].name).toBe('Policy');
      expect(option.series[1].data).toEqual([5, 8]);
      expect(option.series[2].name).toBe('Total');
    });

    it('builds accessible table model for matrix chart', () => {
      const table = matrixTableChartTable(mockRows, mockCatCols);

      expect(table.caption).toContain('Progress by Science Program breakdown');
      expect(table.headers).toEqual(['Science Program', 'Program Name', 'Total', 'Knowledge product', 'Policy change']);
      expect(table.rows).toEqual([
        ['SP01', 'Plant Health', 15, 10, 5],
        ['SP02', 'Breeding', 20, 12, 8]
      ]);
    });
  });
});
