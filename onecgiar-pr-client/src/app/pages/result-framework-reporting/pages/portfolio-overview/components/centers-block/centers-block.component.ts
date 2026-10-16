import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmSeparatorImports } from '@spartan/separator';
import { take } from 'rxjs';
import { PrVizChartComponent } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { Phases } from '../../../../../../shared/interfaces/phasesList.interface';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';
import { resultStatusLabel } from '../../../../../../shared/constants/result-status-tokens';
import { PORTFOLIO_CENTERS_BLOCK_COPY } from '../../../../../../internationalization/portfolio-centers-block.copy';
import {
  DONUT_PALETTE_TOKENS,
  STATUS_CHART_TOKEN,
  STATUS_TILE_TOKEN,
  StatusColumn,
  buildSegments,
  buildSegmentsTable,
  buildStatusDonutOption,
  percentOf,
  statusIdFromChartEvent
} from './centers-block.charts';
import { BilateralCenterResult } from '../../../../../bilateral/services/bilateral-center-result.interface';
import { CENTER_STATUS_IDS, CenterOrigin, EntityOverviewRow, buildCenterRow, byOrigin, isW3Row, originCounts, sumRows } from './centers-block.aggregate';

type LoadState = 'loading' | 'ready' | 'error';

/** Load state of one Center. Center rows load one by one. */
export interface CenterRowState {
  code: string;
  acronym: string;
  state: LoadState;
  /** W3 rows of the Center (CNR-1); `null` while loading or failed. */
  w3Rows: BilateralCenterResult[] | null;
}

/** Resolves a `var(--token)` to the colour ECharts can paint; '' outside a browser (jsdom). */
function resolveCssColor(value: string): string {
  const match = /^var\((--[^)]+)\)$/.exec(value.trim());
  if (!match || typeof document === 'undefined') return value;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || value;
}

/**
 * P2-3928 — the CGIAR Centers (W3/Bilateral) block of the Portfolio overview. Built for P2-3858 as Admin ›
 * All P/As and Centers; moved here as one more section (Ángel, 7-Oct-2026: "La respuesta son las 3") with
 * the same figures and presentation: KPI cards and status donut + tiles, for the open P25 reporting phase.
 * Read-only: it only issues GETs. Admin-only because its host route (`portfolio-overview`) carries `CheckAdminGuard`.
 */
@Component({
  selector: 'app-portfolio-centers-block',
  imports: [RouterLink, PrVizChartComponent, HlmSeparatorImports],
  templateUrl: './centers-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioCentersBlockComponent {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly centersService = inject(CentersService);
  private readonly phasesService = inject(PhasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly copy = PORTFOLIO_CENTERS_BLOCK_COPY;

  readonly phase = signal<Phases | null>(null);
  readonly phaseResolved = signal(false);
  readonly versionId = computed(() => (this.phase() ? Number(this.phase()!.id) : null));

  readonly centersListState = signal<LoadState>('loading');
  readonly centerRows = signal<CenterRowState[]>([]);
  /** Per-Center row over the W3 rows of the selected origin (CNR-3); Centers still loading or failed are absent. */
  readonly viewRows = computed<EntityOverviewRow[]>(() => {
    const origin = this.origin();
    return this.centerRows()
      .filter((center): center is CenterRowState & { w3Rows: BilateralCenterResult[] } => center.w3Rows !== null)
      .map(center => buildCenterRow(center.code, center.acronym, byOrigin(center.w3Rows, origin)));
  });
  readonly loadedCenterRows = computed(() => this.viewRows());
  readonly centerTotals = computed(() => sumRows(this.loadedCenterRows(), CENTER_STATUS_IDS.length));
  readonly centersPartial = computed(() => this.centerRows().some(center => center.state === 'error'));
  readonly centersLoading = computed(() => this.centerRows().some(center => center.state === 'loading'));

  readonly selectedStatus = signal<number | null>(null);
  readonly origin = signal<CenterOrigin>('all');

  /** Status columns with the colour the charts paint. */
  readonly columns = computed<StatusColumn[]>(() =>
    CENTER_STATUS_IDS.map(id => ({ id, label: resultStatusLabel(id), color: resolveCssColor(`var(${STATUS_CHART_TOKEN[id] ?? '--pr-text-subtle'})`) }))
  );
  /** Same columns in the tile colours (tiles, dots) — the Portfolio overview uses a separate set there. */
  private readonly tileColumns = computed<StatusColumn[]>(() => this.columns().map(column => ({ ...column, color: resolveCssColor(this.statusDot(column.id)) })));
  private readonly donutPalette = computed(() => DONUT_PALETTE_TOKENS.map(token => resolveCssColor(`var(${token})`)));

  readonly activeState = computed<LoadState>(() =>
    this.centersListState() === 'ready' && this.centersLoading() && !this.loadedCenterRows().length ? 'loading' : this.centersListState()
  );
  readonly segments = computed(() => buildSegments(this.tileColumns(), this.centerTotals()));

  /** CNR-DD-4: the KPI card reads ALL W3 rows, whatever the origin filter says. */
  readonly kpis = computed(() => {
    const loaded = this.centerRows().filter((center): center is CenterRowState & { w3Rows: BilateralCenterResult[] } => center.w3Rows !== null);
    const all = loaded.flatMap(center => center.w3Rows);
    const counts = originCounts(all);
    const approved = all.filter(row => Number(row.status_id) === 6).length;
    return {
      bilateral: counts.total,
      bilateralNew: counts.new,
      bilateralReplicated: counts.replicated,
      bilateralApproved: percentOf(approved, counts.total),
      centersReporting: loaded.filter(center => center.w3Rows.length > 0).length,
      centersCount: this.centerRows().length
    };
  });

  readonly donutOption = computed(() => buildStatusDonutOption(this.segments(), this.centerTotals().total, this.selectedStatus(), this.donutPalette()));
  readonly donutTable = computed(() => buildSegmentsTable(this.copy.statusTitle, this.segments()));
  readonly selectedLabel = computed(() => {
    const id = this.selectedStatus();
    return id === null ? null : resultStatusLabel(id);
  });

  /** Tile / dot colour of a status: the Portfolio overview's tile set. Bars use STATUS_CHART_TOKEN. */
  statusDot(statusId: number): string {
    return `var(${STATUS_TILE_TOKEN[statusId] ?? '--pr-text-subtle'})`;
  }

  toggleStatus(statusId: number): void {
    this.selectedStatus.update(current => (current === statusId ? null : statusId));
  }

  /** Selects an origin, or goes back to 'all' when it is already selected. Never touches the status (CNR-4). */
  toggleOrigin(origin: CenterOrigin): void {
    this.origin.update(current => (current === origin ? 'all' : origin));
  }

  clearFilters(): void {
    this.selectedStatus.set(null);
    this.origin.set('all');
  }

  /** Origin label and status label joined; null when neither filter is set. */
  readonly activeFilterLabel = computed<string | null>(() => {
    const origin = this.origin();
    const parts = [origin === 'new' ? this.copy.originNew : origin === 'replicated' ? this.copy.originReplicated : null, this.selectedLabel()].filter(
      (part): part is string => !!part
    );
    return parts.length ? parts.join(this.copy.filterSeparator) : null;
  });

  /** CNR-7: Results Center cannot filter by origin, so the link only exists when the origin is 'all'. */
  readonly showResultsCenterLink = computed(() => this.selectedStatus() !== null && this.origin() === 'all');

  onChartClick(event: unknown): void {
    const id = statusIdFromChartEvent(event as any);
    if (id !== null) this.toggleStatus(id);
  }

  /** The Results Center reads `?status=` (results-list.component); `funding=bilateral` keeps it on W3/Bilateral results (CNR-7). */
  resultsCenterParams(): Record<string, number | string> {
    const id = this.selectedStatus();
    return id === null ? {} : { funding: 'bilateral', status: id };
  }

  constructor() {
    this.resolvePhase();

    // The table loads once the phase is known (or known to be missing). The load runs untracked so the
    // signals it reads (the centres catalogue among them) never re-trigger this effect into a second fetch.
    effect(() => {
      if (!this.phaseResolved()) return;
      const versionId = this.versionId();
      untracked(() => void this.loadCenters(versionId));
    });
  }

  retryCentersList(): void {
    if (this.centersListState() === 'loading') return;
    void this.loadCenters(this.versionId());
  }

  /** Re-requests every Center in the error state. loadCenter flips each to 'loading' at once, so a second tap finds none. */
  retryFailedCenters(): void {
    if (this.centersListState() !== 'ready') return;
    const versionId = this.versionId();
    this.centerRows()
      .filter(center => center.state === 'error')
      .forEach(center => this.loadCenter(center, versionId));
  }

  private resolvePhase(): void {
    const pick = (phases: Phases[]) => {
      const p25 = phases.filter(phase => phase.obj_portfolio?.acronym === 'P25');
      const open = p25.find(phase => phase.status) ?? [...p25].sort((a, b) => (b.phase_year ?? 0) - (a.phase_year ?? 0))[0] ?? null;
      this.phase.set(open);
      this.phaseResolved.set(true);
    };

    if (this.phasesService.phases.reporting.length) {
      pick(this.phasesService.phases.reporting);
      return;
    }
    this.phasesService
      .getPhasesObservable()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: pick, error: () => pick([]) });
  }

  private async loadCenters(versionId: number | null): Promise<void> {
    this.centersListState.set('loading');
    try {
      const centers: CenterDto[] = await this.centersService.getData();
      const states: CenterRowState[] = (centers ?? [])
        .filter(center => !!center?.code)
        .map(center => {
          const acronym = center.acronym || center.name || center.code;
          return { code: center.code, acronym, state: 'loading' as LoadState, w3Rows: null };
        })
        .sort((a, b) => a.acronym.localeCompare(b.acronym, undefined, { sensitivity: 'base' }));
      this.centerRows.set(states);
      this.centersListState.set('ready');
      states.forEach(center => this.loadCenter(center, versionId));
    } catch {
      this.centersListState.set('error');
    }
  }

  private loadCenter(center: CenterRowState, versionId: number | null): void {
    if (versionId === null) {
      this.patchCenter(center.code, { state: 'ready', w3Rows: [] });
      return;
    }
    this.patchCenter(center.code, { state: 'loading', w3Rows: null });
    this.bilateralApi
      .GET_bilateralCenterResults(center.code, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envelope: any) =>
          this.patchCenter(center.code, { state: 'ready', w3Rows: ((envelope?.response ?? []) as BilateralCenterResult[]).filter(isW3Row) }),
        error: () => this.patchCenter(center.code, { state: 'error', w3Rows: null })
      });
  }

  private patchCenter(code: string, patch: Partial<CenterRowState>): void {
    this.centerRows.update(rows => rows.map(row => (row.code === code ? { ...row, ...patch } : row)));
  }
}
