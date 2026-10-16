// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-4)
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan/button';
import { HlmTabsImports } from '@spartan/tabs';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PrVizChartComponent } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { PortfolioBilateralProjects } from '../../../../../../shared/interfaces/portfolio-bilateral-projects.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { resolveChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import { buildProjectsOption, buildProjectsTable, ProjectsChartLabels } from './projects.charts';
import { ProjectsViewRow, shareOfMapped, toCenterRows, toProgramRows } from './projects.format';

type LoadStatus = 'loading' | 'error' | 'ready';
export type ProjectsDimension = 'program' | 'center';
export type ProjectsView = 'chart' | 'table';

/** Rows of the loading skeleton. A fixed number: the real count is unknown until the response lands. */
const SKELETON_ROWS = [0, 1, 2, 3] as const;

/**
 * W3/Bilateral projects, by P/A and by Center (spec changes/portfolio-overview-revamp/w3-projects-section).
 * Owns its data path (WPS-DD-7): ONE request per `versionId` and per Retry click, switch-latest, independent of
 * the page's own request. Read-only: the only controls are the dimension tabs, the Chart | Table switch and Retry.
 */
@Component({
  selector: 'app-portfolio-projects-block',
  imports: [HlmTabsImports, HlmButtonImports, PrVizChartComponent],
  templateUrl: './projects-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioProjectsBlockComponent {
  private readonly api = inject(ResultsApiService);
  private readonly centersService = inject(CentersService);

  /** Version (phase) of the page rows. `null` leaves the choice to the server (the open phase). */
  readonly versionId = input<number | null>(null);

  readonly copy = PORTFOLIO_OVERVIEW_COPY.projects;
  readonly skeletonRows = SKELETON_ROWS;

  readonly status = signal<LoadStatus>('loading');
  readonly dimension = signal<ProjectsDimension>('program');
  readonly view = signal<ProjectsView>('chart');
  private readonly data = signal<PortfolioBilateralProjects | null>(null);
  /** code -> catalogue label, the same source and rule as the Centers block (WPS-DD-8). */
  private readonly centerLabels = signal<Record<string, string>>({});

  readonly year = computed(() => this.data()?.phaseYear ?? '');
  readonly totals = computed(() => this.data()?.totals ?? { mapped: 0, withBilateralResults: 0, w1w2Contributors: 0 });
  readonly unmapped = computed(() => this.data()?.unmappedWithBilateralResults ?? 0);
  /** WPS-R-9 Empty: the mapped total is 0. */
  readonly isEmpty = computed(() => !(this.totals().mapped > 0));
  readonly withBilateralPercent = computed(() => shareOfMapped(this.totals().withBilateralResults, this.totals().mapped));
  readonly w1w2Percent = computed(() => shareOfMapped(this.totals().w1w2Contributors, this.totals().mapped));

  readonly rows = computed<ProjectsViewRow[]>(() => {
    const data = this.data();
    if (!data) return [];
    if (this.dimension() === 'program') return toProgramRows(data.byProgram ?? []);
    const labels = this.centerLabels();
    return toCenterRows(data.byCenter ?? [], code => labels[code], this.copy.unassigned);
  });

  readonly firstColumn = computed(() => (this.dimension() === 'program' ? this.copy.colProgram : this.copy.colCenter));
  readonly tableCaption = computed(() => (this.dimension() === 'program' ? this.copy.tableCaptionProgram : this.copy.tableCaptionCenter));

  private readonly chartLabels = computed<ProjectsChartLabels>(() => ({
    mapped: this.copy.kpiMapped,
    withBilateral: this.copy.kpiWithBilateral,
    w1w2: this.copy.kpiW1w2,
    caption: this.tableCaption(),
    firstColumn: this.firstColumn(),
    totalLabel: this.copy.totalLabel
  }));

  readonly chartOption = computed(() => buildProjectsOption(this.rows(), resolveChartTokens(), this.chartLabels()));
  readonly chartTable = computed(() => buildProjectsTable(this.rows(), this.totals(), this.chartLabels()));

  private readonly load$ = new Subject<number | null>();

  constructor() {
    // switchMap drops the previous in-flight call; the error is caught INSIDE it so the stream outlives a failure.
    // The error is deliberately not kept: nothing of it (message, status, URL) may reach the template (S-9.1).
    this.load$
      .pipe(
        switchMap(versionId =>
          this.api.GET_PortfolioBilateralProjects(versionId ?? undefined).pipe(
            map(envelope => ({ ok: true as const, data: envelope?.response ?? null })),
            catchError(() => of({ ok: false as const }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.data.set(result.ok ? result.data : null);
        this.status.set(result.ok && result.data ? 'ready' : 'error');
      });

    // untracked: the request must depend on `versionId` only, never on the signals fetch() touches.
    effect(() => {
      const versionId = this.versionId();
      untracked(() => this.fetch(versionId));
    });

    void this.loadCenterLabels();
  }

  /** Re-requests after a failure. Only acts in the error state, so a double click is still one request. */
  retry(): void {
    if (this.status() !== 'error') return;
    this.fetch(this.versionId());
  }

  setDimension(value: string): void {
    if (value === 'program' || value === 'center') this.dimension.set(value);
  }

  /** Selected segment gets a neutral fill and weight; the other stays plain ghost. */
  viewClass(value: ProjectsView): string {
    return this.view() === value ? '!bg-[var(--pr-color-accents-2)] font-semibold' : '';
  }

  setView(value: ProjectsView): void {
    this.view.set(value);
  }

  private fetch(versionId: number | null): void {
    this.status.set('loading');
    this.load$.next(versionId);
  }

  /** Same label rule as the Centers block (`acronym || name || code`); on failure the formatter falls back to the institution acronym. */
  private async loadCenterLabels(): Promise<void> {
    try {
      const centers: { code: string; acronym?: string; name?: string }[] = (await this.centersService.getData()) ?? [];
      const labels: Record<string, string> = {};
      for (const center of centers) if (center?.code) labels[center.code] = center.acronym || center.name || center.code;
      this.centerLabels.set(labels);
    } catch {
      this.centerLabels.set({});
    }
  }
}
