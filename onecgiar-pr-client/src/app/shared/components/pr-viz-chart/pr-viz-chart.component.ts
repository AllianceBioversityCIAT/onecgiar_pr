import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild
} from '@angular/core';
import * as echarts from 'echarts/core';
import {
  BarChart,
  BarSeriesOption,
  PieChart,
  PieSeriesOption,
  HeatmapChart,
  HeatmapSeriesOption,
  LineChart,
  LineSeriesOption,
  RadarChart,
  RadarSeriesOption,
  TreeChart,
  TreeSeriesOption,
  GraphChart,
  GraphSeriesOption
} from 'echarts/charts';
import {
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
  GridComponent,
  GridComponentOption,
  DatasetComponent,
  DatasetComponentOption,
  LegendComponent,
  LegendComponentOption,
  VisualMapComponent,
  VisualMapComponentOption,
  RadarComponent,
  RadarComponentOption
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { UniversalTransition, LabelLayout } from 'echarts/features';
import type { ECElementEvent } from 'echarts/core';

export const REGISTERED_ECHARTS_MODULES = [
  SVGRenderer,
  BarChart,
  PieChart,
  HeatmapChart,
  LineChart,
  RadarChart,
  TreeChart,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
  UniversalTransition,
  LabelLayout
];

echarts.use(REGISTERED_ECHARTS_MODULES);

/**
 * P2-3744 — one activatable control inside the chart's visually-hidden data table.
 *
 * `event` is the payload the component emits through its existing `chartClick` output when the
 * control is activated. It MUST be the payload an equivalent MOUSE click on that segment produces,
 * so the consumer keeps a single resolver for both input devices and the two paths cannot drift.
 * `label` is the control's accessible name — the cell value alone ("12") says nothing out of
 * context.
 */
export interface VizChartTableAction {
  label: string;
  event: VizChartTableActionEvent;
}

/**
 * The subset of an `ECElementEvent` the platform's click resolvers actually read. Typed narrowly
 * on purpose: a `Record<string, unknown>` would widen `dataIndex` to `unknown` and stop consumers
 * from feeding the payload straight into the resolver they already use for the mouse — which is
 * exactly the parity this design depends on.
 */
export interface VizChartTableActionEvent {
  data?: unknown;
  value?: unknown;
  name?: string;
  seriesId?: string;
  seriesName?: string;
  seriesIndex?: number;
  dataIndex?: number;
}

export interface VizChartTableModel {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: string;
  /**
   * P2-3744 — OPTIONAL activation grid, row-major and index-aligned with `rows` (so
   * `actions[r][c]` belongs to `rows[r][c]`). Its presence is the capability gate: a chart that
   * supplies no `actions` renders exactly the DOM it rendered before this capability existed —
   * no control, no focus stop, no style change. A `null`/absent entry means "this cell has no
   * destination" and renders as plain text.
   */
  actions?: (VizChartTableAction | null | undefined)[][];
}

export type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | PieSeriesOption
  | HeatmapSeriesOption
  | LineSeriesOption
  | RadarSeriesOption
  | TreeSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
  | LegendComponentOption
  | VisualMapComponentOption
  | RadarComponentOption
>;

@Component({
  selector: 'app-pr-viz-chart',
  standalone: true,
  templateUrl: './pr-viz-chart.component.html',
  styleUrl: './pr-viz-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrVizChartComponent implements AfterViewInit, OnDestroy {
  readonly options = input<EChartsOption | null>(null);
  readonly tableModel = input<VizChartTableModel | null>(null);
  readonly chartTitle = input<string>('');
  readonly height = input<string>('300px');
  readonly loading = input<boolean>(false);
  readonly requireTable = input<boolean>(true);

  readonly chartClick = output<ECElementEvent>();
  readonly chartInit = output<echarts.ECharts>();

  readonly chartContainer = viewChild<ElementRef<HTMLElement>>('chartContainer');

  private chart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private viewInitialized = false;

  constructor() {
    effect(() => {
      this.options();
      this.tableModel();
      this.requireTable();

      if (!this.viewInitialized) {
        return;
      }

      this.applyChartOptions();
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.initResizeObserver();
    this.viewInitialized = true;
    this.applyChartOptions();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    if (this.chart && !this.chart.isDisposed()) {
      this.chart.dispose();
      this.chart = undefined;
    }
  }

  resize(): void {
    if (this.chart && !this.chart.isDisposed()) {
      this.chart.resize();
    }
  }

  /**
   * P2-3744 — the action registered for a data-table cell, or `null`. Reading the grid defensively
   * (optional chaining all the way down) is deliberate: `actions` is a plain data structure built
   * by consumers, so a ragged or shorter grid must degrade to "plain text cell", never throw.
   */
  actionAt(model: VizChartTableModel, rowIndex: number, columnIndex: number): VizChartTableAction | null {
    return model?.actions?.[rowIndex]?.[columnIndex] ?? null;
  }

  /**
   * P2-3744 — keyboard/AT activation. Emits through the SAME `chartClick` output the echarts mouse
   * listener emits (see `initChart`), with the payload the action carries. There is deliberately no
   * second output for keyboard use: one output, one resolver in the consumer, no drift.
   */
  activateTableAction(action: VizChartTableAction): void {
    this.chartClick.emit(action.event as unknown as ECElementEvent);
  }

  getInstance(): echarts.ECharts | undefined {
    return this.chart;
  }

  private initChart(): void {
    const container = this.chartContainer()?.nativeElement;
    if (!container) {
      return;
    }

    this.chart = echarts.init(container, undefined, { renderer: 'svg' });
    this.chart.on('click', (params: ECElementEvent) => {
      this.chartClick.emit(params);
    });
    this.chartInit.emit(this.chart);
  }

  private initResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const container = this.chartContainer()?.nativeElement;
    if (!container) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);
  }

  private applyChartOptions(): void {
    if (!this.chart || this.chart.isDisposed()) {
      return;
    }

    const opts = this.options();
    const table = this.tableModel();
    const reqTable = this.requireTable();

    if (!opts || (reqTable && !table)) {
      this.chart.clear();
      return;
    }

    const isReducedMotion = this.checkReducedMotion();
    const finalOptions: EChartsOption = isReducedMotion
      ? { ...(opts as object), animation: false }
      : opts;

    this.chart.setOption(finalOptions as echarts.EChartsCoreOption, true);
  }

  private checkReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
