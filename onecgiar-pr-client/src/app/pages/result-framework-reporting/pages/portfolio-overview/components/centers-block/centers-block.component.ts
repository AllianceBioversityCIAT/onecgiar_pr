import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideSearch, lucideX } from '@ng-icons/lucide';
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
  HEATMAP_RAMP_TOKENS,
  RankingMode,
  STATUS_CHART_TOKEN,
  STATUS_TILE_TOKEN,
  StatusColumn,
  buildHeatmapOption,
  buildRankingOption,
  buildRowsTable,
  buildSegments,
  buildSegmentsTable,
  buildShareOption,
  buildStatusDonutOption,
  percentOf,
  statusIdFromChartEvent
} from './centers-block.charts';
import { CENTER_STATUS_IDS, EntityOverviewRow, buildCenterRow, sumRows } from './centers-block.aggregate';

type LoadState = 'loading' | 'ready' | 'error';
type SortKey = 'name' | 'total' | number;

/** One line of the detail table. Center rows load one by one. */
export interface CenterRowState {
  code: string;
  acronym: string;
  fullName: string;
  link: string;
  state: LoadState;
  row: EntityOverviewRow | null;
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
 * the same figures and presentation: KPI cards, status donut + tiles, ranking (three modes) and a detail
 * table with a chart view, for the open P25 reporting phase. Read-only: it only issues GETs. Admin-only
 * because its host route (`portfolio-overview`) carries `CheckAdminGuard`.
 */
@Component({
  selector: 'app-portfolio-centers-block',
  imports: [RouterLink, PrVizChartComponent, NgIcon],
  providers: [provideIcons({ lucideSearch, lucideX, lucideArrowUp, lucideArrowDown })],
  templateUrl: './centers-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioCentersBlockComponent {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly centersService = inject(CentersService);
  private readonly phasesService = inject(PhasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly copy = PORTFOLIO_CENTERS_BLOCK_COPY;
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly phase = signal<Phases | null>(null);
  readonly phaseResolved = signal(false);
  readonly versionId = computed(() => (this.phase() ? Number(this.phase()!.id) : null));

  readonly centersListState = signal<LoadState>('loading');
  readonly centerRows = signal<CenterRowState[]>([]);
  readonly loadedCenterRows = computed(() => this.centerRows().map(c => c.row).filter((row): row is EntityOverviewRow => row !== null));
  readonly centerTotals = computed(() => sumRows(this.loadedCenterRows(), CENTER_STATUS_IDS.length));
  readonly centersPartial = computed(() => this.centerRows().some(center => center.state === 'error'));
  readonly centersLoading = computed(() => this.centerRows().some(center => center.state === 'loading'));

  readonly selectedStatus = signal<number | null>(null);
  readonly rankingMode = signal<RankingMode>('horizontal');
  readonly detailMode = signal<'table' | 'chart'>('table');
  readonly search = signal('');
  readonly sortKey = signal<SortKey>('total');
  readonly sortDesc = signal(true);

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

  readonly kpis = computed(() => {
    const centers = this.centerTotals();
    const approvedIdx = CENTER_STATUS_IDS.indexOf(6);
    return {
      bilateral: centers.total,
      bilateralApproved: percentOf(centers.counts[approvedIdx] ?? 0, centers.total),
      centersReporting: this.loadedCenterRows().filter(row => row.total > 0).length,
      centersCount: this.centerRows().length
    };
  });

  readonly donutOption = computed(() => buildStatusDonutOption(this.segments(), this.centerTotals().total, this.selectedStatus(), this.donutPalette()));
  readonly donutTable = computed(() => buildSegmentsTable(this.copy.statusTitle, this.segments()));
  readonly rankingOption = computed(() => {
    const mode = this.rankingMode();
    if (mode === 'heatmap') {
      const ramp = HEATMAP_RAMP_TOKENS.map(token => resolveCssColor(`var(${token})`));
      return buildHeatmapOption(this.loadedCenterRows(), this.columns(), ramp);
    }
    return buildRankingOption(this.loadedCenterRows(), this.columns(), this.selectedStatus(), mode);
  });
  readonly rankingTable = computed(() => buildRowsTable(this.copy.rankingCentersTitle, this.loadedCenterRows(), this.columns()));
  readonly rankingHeight = computed(() => `${Math.max(260, this.loadedCenterRows().length * (this.rankingMode() === 'vertical' ? 0 : 26) + 60)}px`);
  readonly shareOption = computed(() => buildShareOption(this.filteredDetail().map(c => c.row!).filter(Boolean), this.columns()));

  /** Rows of the detail table, filtered by the search box, sorted by the clicked header. */
  readonly filteredDetail = computed(() => {
    const term = this.search().trim().toLowerCase();
    const key = this.sortKey();
    const sign = this.sortDesc() ? -1 : 1;
    const value = (c: CenterRowState): number | string => {
      if (key === 'name') return c.acronym.toLowerCase();
      if (!c.row) return -1;
      if (key === 'total') return c.row.total;
      return c.row.counts[this.columns().findIndex(column => column.id === key)] ?? 0;
    };
    return this.centerRows()
      .filter(c => !term || c.acronym.toLowerCase().includes(term) || c.code.toLowerCase().includes(term) || c.fullName.toLowerCase().includes(term))
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb);
        return cmp * sign || a.acronym.localeCompare(b.acronym);
      });
  });
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
    if (this.selectedStatus() !== null) {
      this.sortKey.set(statusId);
      this.sortDesc.set(true);
    }
  }

  onChartClick(event: unknown): void {
    const id = statusIdFromChartEvent(event as any);
    if (id !== null) this.toggleStatus(id);
  }

  sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDesc.update(desc => !desc);
      return;
    }
    this.sortKey.set(key);
    this.sortDesc.set(key !== 'name');
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value ?? '');
  }

  /** The Results Center reads `?status=` (results-list.component); the same deep link the Portfolio overview uses. */
  resultsCenterParams(): Record<string, number> {
    const id = this.selectedStatus();
    return id === null ? {} : { status: id };
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

  retryCenter(code: string): void {
    const center = this.centerRows().find(item => item.code === code);
    if (!center || center.state === 'loading') return;
    this.loadCenter(center, this.versionId());
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
          return {
            code: center.code,
            acronym,
            fullName: center.name || acronym,
            link: buildCenterRow(center.code, acronym, []).link,
            state: 'loading' as LoadState,
            row: null
          };
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
      this.patchCenter(center.code, { state: 'ready', row: buildCenterRow(center.code, center.acronym, []) });
      return;
    }
    this.patchCenter(center.code, { state: 'loading', row: null });
    this.bilateralApi
      .GET_bilateralCenterResults(center.code, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envelope: any) =>
          this.patchCenter(center.code, { state: 'ready', row: buildCenterRow(center.code, center.acronym, envelope?.response ?? []) }),
        error: () => this.patchCenter(center.code, { state: 'error', row: null })
      });
  }

  private patchCenter(code: string, patch: Partial<CenterRowState>): void {
    this.centerRows.update(rows => rows.map(row => (row.code === code ? { ...row, ...patch } : row)));
  }
}
