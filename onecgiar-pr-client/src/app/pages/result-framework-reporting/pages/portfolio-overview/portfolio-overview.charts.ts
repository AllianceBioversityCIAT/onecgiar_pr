// @akili-spec changes/portfolio-overview-echarts
//
// Pure chart & table builders for the Portfolio Overview dashboard.
// No DOM access, no Angular signals, no dependency injection.
// All styling and colors resolve through caller-supplied tokens.

import type { EChartsOption, VizChartTableModel } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ResolvedChartTokens } from '../../../../shared/utils/chart-tokens.util';
import type {
  PortfolioStatusSegment,
  CategoryOriginRow,
  ProgramRankingRow,
  CenterDistributionRow
} from './services/portfolio-overview.service';

/**
 * Display-only abbreviations for category and status axis labels.
 */
export const AXIS_LABEL_ABBREVIATIONS: Record<string, string> = {
  'Capacity sharing for development': 'Cap-Dev',
  'Knowledge product': 'KP',
  'Innovation development': 'Inno-Dev',
  'Innovation use': 'Inno-Use',
  'Policy change': 'Policy',
  'Other output': 'Other-Output',
  'Other outcome': 'Other-Outcome',
  'Quality Assessed': 'QAed'
};

export function abbreviateAxisLabel(value: string): string {
  return AXIS_LABEL_ABBREVIATIONS[value] ?? value;
}

/**
 * Builds the ECharts donut pie chart option for Portfolio Reporting Status (POV-R-2).
 * Uses the platform's violet scale palette, non-detaching slices, and centered total.
 */
export function portfolioStatusDonutOption(
  segments: PortfolioStatusSegment[],
  tokensOrPalette: ResolvedChartTokens | string[]
): EChartsOption {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const palette = Array.isArray(tokensOrPalette)
    ? tokensOrPalette
    : [...tokensOrPalette.ramp, tokensOrPalette.bilateralMuted, tokensOrPalette.primaryStrong];

  const data = segments
    .filter(segment => segment.count > 0)
    .map((segment, index) => ({
      name: segment.label,
      value: segment.count,
      itemStyle: {
        color: palette[index % (palette.length || 1)] || '',
        borderRadius: 4,
        borderColor: '#ffffff',
        borderWidth: 2
      }
    }));

  return {
    title: {
      text: String(total),
      subtext: 'results',
      left: 'center',
      top: 'center',
      textStyle: { fontSize: 22, fontWeight: 800, color: '#2B2838' },
      subtextStyle: { fontSize: 12, fontWeight: 500, color: '#6B6580' }
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const payload = params as { name?: string; value?: number; percent?: number };
        return `<strong>${payload.name ?? ''}</strong>: ${payload.value ?? 0} (${payload.percent ?? 0}%)`;
      }
    },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 12,
        padAngle: 3,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{c}',
          fontSize: 11,
          fontWeight: 700,
          color: '#3B0764',
          distanceToLabelLine: 4
        },
        labelLine: {
          show: true,
          length: 6,
          length2: 6,
          lineStyle: { color: '#A78BFA', width: 1.2 }
        },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(91, 33, 182, 0.3)'
          }
        },
        data
      }
    ]
  } as EChartsOption;
}

/**
 * Builds a dynamic horizontal ECharts status pipeline progress bar.
 */
export function statusPipelineOption(
  segments: PortfolioStatusSegment[],
  tokensOrPalette: ResolvedChartTokens | string[]
): EChartsOption {
  const palette = Array.isArray(tokensOrPalette)
    ? tokensOrPalette
    : [...tokensOrPalette.ramp, tokensOrPalette.bilateralMuted, tokensOrPalette.primaryStrong];

  const activeSegments = segments.filter(s => s.count > 0);
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const p = params as { seriesName?: string; value?: number };
        const percent = total > 0 ? Math.round(((p.value ?? 0) / total) * 100) : 0;
        return `<strong>${p.seriesName ?? ''}</strong>: ${p.value ?? 0} results (${percent}%)`;
      }
    },
    grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
    xAxis: { type: 'value', max: total || 1, show: false },
    yAxis: { type: 'category', data: ['Status'], show: false },
    series: activeSegments.map((segment, idx) => ({
      name: segment.label,
      type: 'bar',
      stack: 'status',
      barWidth: 16,
      data: [segment.count],
      itemStyle: {
        color: segment.fg || palette[idx % palette.length],
        borderRadius:
          idx === 0 && activeSegments.length === 1
            ? [8, 8, 8, 8]
            : idx === 0
              ? [8, 0, 0, 8]
              : idx === activeSegments.length - 1
                ? [0, 8, 8, 0]
                : [0, 0, 0, 0]
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          shadowBlur: 8,
          shadowColor: 'rgba(107, 70, 229, 0.4)'
        }
      }
    }))
  } as EChartsOption;
}

/**
 * Accessible table representation for the Portfolio Reporting Status donut.
 */
export function portfolioStatusDonutTable(segments: PortfolioStatusSegment[]): VizChartTableModel {
  return {
    caption: 'Portfolio reporting status breakdown',
    headers: ['Status', 'Results', 'Share'],
    rows: segments.map(segment => [segment.label, segment.count, `${segment.percent}%`])
  };
}

/**
 * Builds the horizontal stacked bar chart option comparing W1/W2 vs W3/Bilateral per category (POV-R-3).
 */
export function categoryOriginBarOption(
  rows: CategoryOriginRow[],
  tokens: ResolvedChartTokens
): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const payload = Array.isArray(params) ? params[0] : (params as { dataIndex?: number });
        const idx = payload?.dataIndex;
        const row = typeof idx === 'number' ? rows[idx] : undefined;
        if (!row) return '';
        return `<strong>${row.category}</strong>: ${row.total} total<br/><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${tokens.primaryStrong};margin-right:6px;"></span>W1/W2: ${row.w1w2Count}<br/><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${tokens.bilateralMuted};margin-right:6px;"></span>W3/Bilateral: ${row.bilateralCount}`;
      }
    },
    grid: { left: 80, right: 36, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border || '#EEEEF1' } },
      axisLabel: { hideOverlap: true }
    },
    yAxis: {
      type: 'category',
      data: rows.map(row => row.category),
      inverse: true,
      axisLabel: { interval: 0, formatter: abbreviateAxisLabel }
    },
    series: [
      {
        name: 'W1/W2 Portfolio',
        type: 'bar',
        stack: 'total',
        color: tokens.primaryStrong,
        itemStyle: { color: tokens.primaryStrong },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.w1w2Count)
      },
      {
        name: 'W3/Bilateral',
        type: 'bar',
        stack: 'total',
        color: tokens.bilateralMuted,
        itemStyle: { color: tokens.bilateralMuted },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.bilateralCount)
      },
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        data: rows.map(() => 0),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const total = rows[params.dataIndex]?.total;
            return total && total > 0 ? String(total) : '';
          },
          color: tokens.textSecondary || '#1E1B4B',
          fontWeight: 'bold',
          fontSize: 11,
          distance: 6
        },
        itemStyle: { color: 'transparent' },
        tooltip: { show: false }
      }
    ]
  } as EChartsOption;
}

/**
 * Accessible table representation for results by indicator category and funding origin.
 */
export function categoryOriginBarTable(rows: CategoryOriginRow[]): VizChartTableModel {
  return {
    caption: 'Results by indicator category and funding origin',
    headers: ['Indicator Category', 'W1/W2 Portfolio', 'W3/Bilateral', 'Total'],
    rows: rows.map(row => [row.category, row.w1w2Count, row.bilateralCount, row.total])
  };
}

/**
 * Builds the horizontal stacked bar chart option ranking Science Programs by status (POV-R-4).
 */
export function programRankingOption(
  rows: ProgramRankingRow[],
  tokens: ResolvedChartTokens
): EChartsOption {
  const editingColor = tokens.ramp[3];
  const submittedOrQaColor = tokens.primaryStrong;
  const approvedColor = tokens.ramp[0];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const payload = Array.isArray(params) ? params[0] : (params as { dataIndex?: number });
        const idx = payload?.dataIndex;
        const row = typeof idx === 'number' ? rows[idx] : undefined;
        if (!row) return '';
        return `<strong>${row.code} - ${row.name}</strong>: ${row.total} total<br/>` +
          `• Editing: ${row.editing}<br/>` +
          `• Submitted / QA: ${row.submittedOrQa}<br/>` +
          `• Approved: ${row.approved}`;
      }
    },
    grid: { left: 60, right: 36, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border || '#EEEEF1' } },
      axisLabel: { hideOverlap: true }
    },
    yAxis: {
      type: 'category',
      data: rows.map(row => row.code),
      inverse: true,
      axisLabel: { interval: 0, fontWeight: 600, color: tokens.primaryStrong || '#6B46E5' }
    },
    series: [
      {
        name: 'Editing',
        type: 'bar',
        stack: 'status',
        color: editingColor,
        itemStyle: { color: editingColor },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#3B0764',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.editing)
      },
      {
        name: 'Submitted / In QA',
        type: 'bar',
        stack: 'status',
        color: submittedOrQaColor,
        itemStyle: { color: submittedOrQaColor },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.submittedOrQa)
      },
      {
        name: 'Approved',
        type: 'bar',
        stack: 'status',
        color: approvedColor,
        itemStyle: { color: approvedColor },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.approved)
      },
      {
        name: 'Total',
        type: 'bar',
        stack: 'status',
        data: rows.map(() => 0),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const total = rows[params.dataIndex]?.total;
            return total && total > 0 ? String(total) : '';
          },
          color: tokens.textSecondary || '#1E1B4B',
          fontWeight: 'bold',
          fontSize: 11,
          distance: 6
        },
        itemStyle: { color: 'transparent' },
        tooltip: { show: false }
      }
    ]
  } as EChartsOption;
}

/**
 * Accessible table representation for Science Program output ranking.
 */
export function programRankingTable(rows: ProgramRankingRow[]): VizChartTableModel {
  return {
    caption: 'Results progress ranked by Science Program',
    headers: ['Science Program', 'Program Name', 'Editing', 'Submitted / QA', 'Approved', 'Total'],
    rows: rows.map(row => [row.code, row.name, row.editing, row.submittedOrQa, row.approved, row.total])
  };
}

/**
 * Builds the vertical stacked column chart option ranking Science Programs by status.
 */
export function programRankingVerticalOption(
  rows: ProgramRankingRow[],
  tokens: ResolvedChartTokens
): EChartsOption {
  const editingColor = tokens.ramp[3];
  const submittedOrQaColor = tokens.primaryStrong;
  const approvedColor = tokens.ramp[0];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const payload = Array.isArray(params) ? params[0] : (params as { dataIndex?: number });
        const idx = payload?.dataIndex;
        const row = typeof idx === 'number' ? rows[idx] : undefined;
        if (!row) return '';
        return (
          `<strong>${row.code} - ${row.name}</strong>: ${row.total} total<br/>` +
          `• Editing: ${row.editing}<br/>` +
          `• Submitted / QA: ${row.submittedOrQa}<br/>` +
          `• Approved: ${row.approved}`
        );
      }
    },
    legend: {
      show: true,
      top: 0,
      right: 16,
      textStyle: { color: tokens.textSecondary || '#6B6580', fontSize: 11 }
    },
    grid: { left: 48, right: 24, top: 36, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map(row => row.code),
      axisLabel: {
        interval: 0,
        fontWeight: 600,
        color: tokens.primaryStrong || '#6B46E5',
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border || '#EEEEF1' } },
      axisLabel: { hideOverlap: true }
    },
    series: [
      {
        name: 'Editing',
        type: 'bar',
        stack: 'status',
        color: editingColor,
        itemStyle: { color: editingColor },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#3B0764',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.editing)
      },
      {
        name: 'Submitted / In QA',
        type: 'bar',
        stack: 'status',
        color: submittedOrQaColor,
        itemStyle: { color: submittedOrQaColor },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.submittedOrQa)
      },
      {
        name: 'Approved',
        type: 'bar',
        stack: 'status',
        color: approvedColor,
        itemStyle: { color: approvedColor, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.approved)
      },
      {
        name: 'Total',
        type: 'bar',
        stack: 'status',
        data: rows.map(() => 0),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const total = rows[params.dataIndex]?.total;
            return total && total > 0 ? String(total) : '';
          },
          color: tokens.textSecondary || '#1E1B4B',
          fontWeight: 'bold',
          fontSize: 11,
          distance: 4
        },
        itemStyle: { color: 'transparent' },
        tooltip: { show: false }
      }
    ]
  } as EChartsOption;
}

/**
 * Builds the interactive Heatmap chart option displaying Science Programs vs Indicator Categories.
 */
export function programRankingHeatmapOption(
  programmeRows: { code: string; name: string; cells: number[] }[],
  categories: string[],
  tokens: ResolvedChartTokens
): EChartsOption {
  let maxVal = 1;
  const data: [number, number, number][] = [];

  programmeRows.forEach((row, progIdx) => {
    row.cells.forEach((val, catIdx) => {
      if (val > maxVal) maxVal = val;
      data.push([catIdx, progIdx, val]);
    });
  });

  return {
    tooltip: {
      position: 'top',
      confine: true,
      formatter: (params: unknown) => {
        const payload = params as { data?: [number, number, number] };
        if (!payload?.data) return '';
        const [catIdx, progIdx, count] = payload.data;
        const row = programmeRows[progIdx];
        const category = categories[catIdx];
        if (!row || !category) return '';
        return `<strong>${row.code} - ${row.name}</strong><br/>${category}: <strong>${count}</strong> results`;
      }
    },
    grid: { left: 80, right: 30, top: 20, bottom: 60, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories.map(c => abbreviateAxisLabel(c)),
      splitArea: { show: true },
      axisLabel: { interval: 0, rotate: 25, fontSize: 11, fontWeight: 600, color: tokens.textSecondary || '#6B6580' }
    },
    yAxis: {
      type: 'category',
      data: programmeRows.map(r => r.code),
      inverse: true,
      splitArea: { show: true },
      axisLabel: { interval: 0, fontWeight: 700, color: tokens.primaryStrong || '#6B46E5', fontSize: 12 }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#F5F3FF', '#DDD6FE', '#A78BFA', '#7C3AED', '#5733C4']
      },
      textStyle: { color: tokens.textSecondary || '#6B6580', fontSize: 11 }
    },
    series: [
      {
        name: 'Results Heatmap',
        type: 'heatmap',
        data,
        label: {
          show: true,
          formatter: (p: unknown) => {
            const val = (p as { data?: [number, number, number] })?.data?.[2];
            return val && val > 0 ? String(val) : '';
          },
          fontSize: 11,
          fontWeight: 600
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        }
      }
    ]
  } as EChartsOption;
}

/**
 * Accessible table representation for Science Programs heatmap.
 */
export function programRankingHeatmapTable(
  programmeRows: { code: string; name: string; cells: number[] }[],
  categories: string[]
): VizChartTableModel {
  return {
    caption: 'Science Programs results heatmap across indicator categories',
    headers: ['Science Program', 'Program Name', ...categories],
    rows: programmeRows.map(row => [row.code, row.name, ...row.cells])
  };
}

/**
 * Builds the horizontal bar chart option for bilateral results distribution (POV-R-5).
 * Responsively renders program codes on Y-axis with bar-end count labels.
 */
export function centerBilateralOption(
  rows: CenterDistributionRow[],
  tokens: ResolvedChartTokens
): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const payload = Array.isArray(params) ? params[0] : (params as { dataIndex?: number });
        const idx = payload?.dataIndex;
        const row = typeof idx === 'number' ? rows[idx] : undefined;
        if (!row) return '';
        const title = row.centerId ? `${row.centerId} - ${row.centerName}` : (row.centerName || row.centerId);
        return `<strong>${title}</strong>: ${row.count} results (${row.approvedCount} approved · ${row.percent}%)`;
      }
    },
    grid: { left: 60, right: 44, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border || '#EEEEF1' } },
      axisLabel: { hideOverlap: true }
    },
    yAxis: {
      type: 'category',
      data: rows.map(row => row.centerId || row.centerName),
      inverse: true,
      axisLabel: {
        interval: 0,
        fontWeight: 600,
        color: tokens.bilateralMuted || '#8B7CC4'
      }
    },
    series: [
      {
        name: 'Bilateral Results',
        type: 'bar',
        color: tokens.bilateralMuted,
        itemStyle: { color: tokens.bilateralMuted, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: tokens.textSecondary || '#6B6580',
          fontSize: 11,
          fontWeight: 600
        },
        data: rows.map(row => row.count)
      }
    ]
  } as EChartsOption;
}

/**
 * Accessible table representation for bilateral results by Science Program.
 */
export function centerBilateralTable(rows: CenterDistributionRow[]): VizChartTableModel {
  return {
    caption: 'Bilateral results distribution by Science Program',
    headers: ['Science Program', 'Results Count', 'Approved Count', 'Share'],
    rows: rows.map(row => [row.centerId || row.centerName, row.count, row.approvedCount, `${row.percent}%`])
  };
}

/**
 * Builds the stacked column ECharts option representing the Progress by Science Program matrix table as a chart.
 */
export function matrixTableChartOption(
  rows: { code: string; name: string; total: number; cells: number[] }[],
  categoryColumns: { label: string; shortLabel: string; cellIndex: number }[],
  tokens: ResolvedChartTokens
): EChartsOption {
  const palette = [
    tokens.primaryStrong,
    tokens.ramp[0],
    tokens.ramp[1],
    tokens.ramp[2],
    tokens.bilateralMuted,
    '#A78BFA',
    '#818CF8',
    '#C084FC',
    '#6366F1'
  ];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const payload = Array.isArray(params) ? params : [];
        if (!payload.length) return '';
        const first = payload[0] as { dataIndex?: number };
        const row = typeof first?.dataIndex === 'number' ? rows[first.dataIndex] : undefined;
        if (!row) return '';
        let html = `<strong>${row.code} - ${row.name}</strong> (Total: <strong>${row.total}</strong>)<br/>`;
        payload.forEach((p: { seriesName?: string; value?: number; color?: string }) => {
          if (typeof p.value === 'number' && p.value > 0) {
            html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <strong>${p.value}</strong><br/>`;
          }
        });
        return html;
      }
    },
    legend: {
      type: 'scroll',
      top: 0,
      textStyle: { color: tokens.textSecondary || '#6B6580', fontSize: 11 }
    },
    grid: { left: 48, right: 24, top: 40, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map(r => r.code),
      axisLabel: {
        interval: 0,
        fontWeight: 700,
        color: tokens.primaryStrong || '#6B46E5',
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border || '#EEEEF1' } },
      axisLabel: { hideOverlap: true }
    },
    series: [
      ...categoryColumns.map((col, idx) => ({
        name: col.shortLabel || col.label,
        type: 'bar',
        stack: 'matrix',
        color: palette[idx % palette.length],
        itemStyle: { color: palette[idx % palette.length] },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => (p?.value && p.value > 1 ? String(p.value) : ''),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 10
        },
        data: rows.map(row => row.cells[col.cellIndex] ?? 0)
      })),
      {
        name: 'Total',
        type: 'bar',
        stack: 'matrix',
        data: rows.map(() => 0),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const total = rows[params.dataIndex]?.total;
            return total && total > 0 ? String(total) : '';
          },
          color: tokens.textSecondary || '#1E1B4B',
          fontWeight: 'bold',
          fontSize: 11,
          distance: 4
        },
        itemStyle: { color: 'transparent' },
        tooltip: { show: false }
      }
    ]
  } as EChartsOption;
}

/**
 * Accessible table representation for matrix table chart.
 */
export function matrixTableChartTable(
  rows: { code: string; name: string; total: number; cells: number[] }[],
  categoryColumns: { label: string; cellIndex: number }[]
): VizChartTableModel {
  return {
    caption: 'Progress by Science Program breakdown by indicator category',
    headers: ['Science Program', 'Program Name', 'Total', ...categoryColumns.map(c => c.label)],
    rows: rows.map(row => [
      row.code,
      row.name,
      row.total,
      ...categoryColumns.map(c => row.cells[c.cellIndex] ?? 0)
    ])
  };
}
