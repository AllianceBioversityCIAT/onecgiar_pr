import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, viewChild } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { ResultFrameworkReportingHomeService } from '../../services/result-framework-reporting-home.service';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { REPORTED_STATUS_IDS, STATUS_META } from '../../status-meta';

interface StatusSlice {
  statusId: number;
  label: string;
  fullLabel: string;
  count: number;
  chartVar: string;
  chipClass: string;
  dotClass: string;
}

interface SPProgressRow {
  code: string;
  name: string;
  total: number;
  reported: number;
  pct: number;
}

@Component({
  selector: 'app-result-framework-reporting-insights',
  templateUrl: './result-framework-reporting-insights.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' }
})
export class ResultFrameworkReportingInsightsComponent implements OnDestroy {
  readonly homeService = inject(ResultFrameworkReportingHomeService);

  private readonly donutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statusDonutCanvas');
  private readonly barCanvas = viewChild<ElementRef<HTMLCanvasElement>>('spBarCanvas');
  private donutChart?: Chart<'doughnut'>;
  private barChart?: Chart<'bar'>;

  // Page-wide preference (shared with the SP cards): compact = stat + status chips only, no charts
  readonly compact = computed(() => this.homeService.compactView());

  readonly isLoading = computed(() => this.homeService.isLoadingSPLists());

  readonly totalResults = computed(() => this.homeService.mySPsList().reduce((sum, sp) => sum + (sp?.totalResults ?? 0), 0));

  readonly totalPrograms = computed(() => this.homeService.mySPsList().length);

  readonly hasData = computed(() => this.totalResults() > 0);

  // Aggregated distribution of MY results by workflow status (all my SPs, all versions of the phase).
  readonly statusSlices = computed<StatusSlice[]>(() => {
    const counts = new Map<number, { name: string; count: number }>();

    for (const sp of this.homeService.mySPsList()) {
      for (const version of sp?.versions ?? []) {
        for (const status of version?.statuses ?? []) {
          const prev = counts.get(status.statusId);
          counts.set(status.statusId, { name: status.statusName, count: (prev?.count ?? 0) + status.count });
        }
      }
    }

    return [...counts.entries()]
      .map(([statusId, { name, count }]) => {
        const meta = STATUS_META[statusId];
        return {
          statusId,
          label: meta?.label ?? name,
          fullLabel: name,
          count,
          chartVar: meta?.chartVar ?? '--pr-color-accents-3',
          chipClass: meta?.chipClass ?? 'bg-[var(--pr-color-accents-1)] text-[var(--pr-color-accents-6)]',
          dotClass: meta?.dotClass ?? 'bg-[var(--pr-color-accents-3)]',
          order: meta?.order ?? 99
        };
      })
      .sort((a, b) => a.order - b.order)
      .map(({ order, ...slice }) => slice);
  });

  // Submission progress per program: results already Submitted or Quality Assessed vs total.
  readonly spProgressRows = computed<SPProgressRow[]>(() =>
    this.homeService
      .mySPsList()
      .filter(sp => (sp?.totalResults ?? 0) > 0)
      .map(sp => {
        const reported = this.countReported(sp);
        const total = sp.totalResults ?? 0;
        return {
          code: sp.initiativeCode,
          name: sp.initiativeShortName ?? sp.initiativeName,
          total,
          reported,
          pct: total > 0 ? Math.round((reported / total) * 100) : 0
        };
      })
      .sort((a, b) => b.total - a.total)
  );

  readonly barChartHeight = computed(() => this.spProgressRows().length * 34 + 20);

  constructor() {
    effect(() => {
      const canvas = this.donutCanvas()?.nativeElement;
      const slices = this.statusSlices();
      this.donutChart?.destroy();
      this.donutChart = undefined;
      if (!canvas || slices.length === 0) return;
      this.donutChart = this.renderDonut(canvas, slices);
    });

    effect(() => {
      const canvas = this.barCanvas()?.nativeElement;
      const rows = this.spProgressRows();
      this.barChart?.destroy();
      this.barChart = undefined;
      if (!canvas || rows.length === 0) return;
      this.barChart = this.renderBars(canvas, rows);
    });
  }

  ngOnDestroy(): void {
    this.donutChart?.destroy();
    this.barChart?.destroy();
  }

  private countReported(sp: SPProgress): number {
    let reported = 0;
    for (const version of sp?.versions ?? []) {
      for (const status of version?.statuses ?? []) {
        if (REPORTED_STATUS_IDS.includes(status.statusId)) reported += status.count;
      }
    }
    return reported;
  }

  // Resolve a --pr-* token to its actual color so canvas charts stay on design tokens.
  private cssColor(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#c7c9d1';
  }

  private renderDonut(canvas: HTMLCanvasElement, slices: StatusSlice[]): Chart<'doughnut'> {
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: slices.map(s => s.fullLabel),
        datasets: [
          {
            data: slices.map(s => s.count),
            backgroundColor: slices.map(s => this.cssColor(s.chartVar)),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          datalabels: { display: false } as never,
          tooltip: {
            callbacks: {
              label: context => ` ${context.parsed} ${context.label}`
            }
          }
        }
      }
    });
  }

  private renderBars(canvas: HTMLCanvasElement, rows: SPProgressRow[]): Chart<'bar'> {
    const brand = this.cssColor('--pr-color-primary-300');
    const track = this.cssColor('--pr-color-accents-2');
    const ink = this.cssColor('--pr-color-accents-6');

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.code),
        datasets: [
          {
            data: rows.map(r => r.pct),
            backgroundColor: brand,
            borderRadius: 4,
            barThickness: 12
          },
          {
            data: rows.map(r => 100 - r.pct),
            backgroundColor: track,
            borderRadius: 4,
            barThickness: 12
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 8 } },
        scales: {
          x: { stacked: true, display: false, max: 100 },
          y: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: ink, font: { size: 11, weight: 500 } }
          }
        },
        plugins: {
          legend: { display: false },
          datalabels: { display: false } as never,
          tooltip: {
            filter: item => item.datasetIndex === 0,
            callbacks: {
              label: context => {
                const row = rows[context.dataIndex];
                return ` ${row.name}: ${row.reported}/${row.total} Submitted or QAed (${row.pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}
