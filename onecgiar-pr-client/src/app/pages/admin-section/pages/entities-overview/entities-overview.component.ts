import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideSearch, lucideX } from '@ng-icons/lucide';
import { PrVizChartComponent } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
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
} from './entities-overview.charts';
import { take } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { CenterDto } from '../../../../shared/interfaces/center.dto';
import { resultStatusLabel } from '../../../../shared/constants/result-status-tokens';
import { ADMIN_ENTITIES_OVERVIEW_COPY } from '../../../../internationalization/admin-entities-overview.copy';
import {
  CENTER_STATUS_IDS,
  EntityOverviewRow,
  PROGRAM_STATUS_IDS,
  buildCenterRow,
  buildProgramRows,
  sumRows
} from './entities-overview.aggregate';

type LoadState = 'loading' | 'ready' | 'error';
export type EntityView = 'programs' | 'centers';
type SortKey = 'name' | 'total' | number;

/** One line of the detail table, whichever view is active. Center rows load one by one. */
export interface DetailRow {
  code: string;
  badge: string | null;
  name: string;
  title: string;
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

interface CenterRowState {
  code: string;
  acronym: string;
  fullName: string;
  link: string;
  state: LoadState;
  row: EntityOverviewRow | null;
}

/**
 * P2-3858 (INC-163934-2) — Admin › All P/As and Centers: a draft of one page with the Overview numbers of
 * every Program/Accelerator and every CGIAR Center, for the open P25 reporting phase. Admin-only through
 * the `admin-module` parent route's `CheckAdminGuard`. Read-only: it only issues GETs.
 */
@Component({
  selector: 'app-entities-overview',
  imports: [RouterLink, PrVizChartComponent, NgIcon],
  providers: [provideIcons({ lucideSearch, lucideX, lucideArrowUp, lucideArrowDown })],
  templateUrl: './entities-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntitiesOverviewComponent {
  private readonly api = inject(ApiService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly centersService = inject(CentersService);
  private readonly phasesService = inject(PhasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly copy = ADMIN_ENTITIES_OVERVIEW_COPY;
  readonly programStatusIds = PROGRAM_STATUS_IDS;
  readonly centerStatusIds = CENTER_STATUS_IDS;
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly phase = signal<Phases | null>(null);
  readonly phaseResolved = signal(false);
  readonly versionId = computed(() => (this.phase() ? Number(this.phase()!.id) : null));

  readonly programsState = signal<LoadState>('loading');
  readonly programRows = signal<EntityOverviewRow[]>([]);
  readonly programTotals = computed(() => sumRows(this.programRows(), PROGRAM_STATUS_IDS.length));

  readonly centersListState = signal<LoadState>('loading');
  readonly centerRows = signal<CenterRowState[]>([]);
  readonly centerTotals = computed(() =>
    sumRows(
      this.centerRows()
        .map(center => center.row)
        .filter((row): row is EntityOverviewRow => row !== null),
      CENTER_STATUS_IDS.length
    )
  );
  readonly centersPartial = computed(() => this.centerRows().some(center => center.state === 'error'));
  readonly centersLoading = computed(() => this.centerRows().some(center => center.state === 'loading'));

  // ── Rework 5-Oct-2026: the Portfolio overview's visual language over these same figures ─────────────
  readonly view = signal<EntityView>('programs');
  readonly selectedStatus = signal<number | null>(null);
  readonly rankingMode = signal<RankingMode>('horizontal');
  readonly detailMode = signal<'table' | 'chart'>('table');
  readonly search = signal('');
  readonly sortKey = signal<SortKey>('total');
  readonly sortDesc = signal(true);

  /** Status columns of the active view, with the colour the charts paint (resolved once per view). */
  readonly columns = computed<StatusColumn[]>(() => {
    const ids = this.view() === 'programs' ? PROGRAM_STATUS_IDS : CENTER_STATUS_IDS;
    return ids.map(id => ({ id, label: resultStatusLabel(id), color: resolveCssColor(`var(${STATUS_CHART_TOKEN[id] ?? '--pr-text-subtle'})`) }));
  });
  /** Same columns in the tile colours (tiles, dots, pipeline) — the Portfolio overview uses a separate set there. */
  private readonly tileColumns = computed<StatusColumn[]>(() => this.columns().map(column => ({ ...column, color: resolveCssColor(this.statusDot(column.id)) })));
  private readonly donutPalette = computed(() => DONUT_PALETTE_TOKENS.map(token => resolveCssColor(`var(${token})`)));

  readonly activeState = computed<LoadState>(() =>
    this.view() === 'programs' ? this.programsState() : this.centersListState() === 'ready' && this.centersLoading() && !this.loadedCenterRows().length ? 'loading' : this.centersListState()
  );
  readonly loadedCenterRows = computed(() => this.centerRows().map(c => c.row).filter((row): row is EntityOverviewRow => row !== null));
  readonly activeRows = computed(() => (this.view() === 'programs' ? this.programRows() : this.loadedCenterRows()));
  readonly activeTotals = computed(() => (this.view() === 'programs' ? this.programTotals() : this.centerTotals()));
  readonly segments = computed(() => buildSegments(this.tileColumns(), this.activeTotals()));

  readonly kpis = computed(() => {
    const programs = this.programTotals();
    const centers = this.centerTotals();
    const submittedIdx = PROGRAM_STATUS_IDS.indexOf(3);
    const approvedIdx = CENTER_STATUS_IDS.indexOf(6);
    return {
      total: programs.total + centers.total,
      w1w2: programs.total,
      w1w2Submitted: percentOf(programs.counts[submittedIdx] ?? 0, programs.total),
      bilateral: centers.total,
      bilateralApproved: percentOf(centers.counts[approvedIdx] ?? 0, centers.total),
      programsReporting: this.programRows().filter(row => row.total > 0).length,
      programsCount: this.programRows().length,
      centersReporting: this.loadedCenterRows().filter(row => row.total > 0).length,
      centersCount: this.centerRows().length
    };
  });

  readonly donutOption = computed(() => buildStatusDonutOption(this.segments(), this.activeTotals().total, this.selectedStatus(), this.donutPalette()));
  readonly donutTable = computed(() => buildSegmentsTable(this.copy.statusTitle, this.segments()));
  readonly rankingOption = computed(() => {
    const mode = this.rankingMode();
    if (mode === 'heatmap') {
      const ramp = HEATMAP_RAMP_TOKENS.map(token => resolveCssColor(`var(${token})`));
      return buildHeatmapOption(this.activeRows(), this.columns(), ramp);
    }
    return buildRankingOption(this.activeRows(), this.columns(), this.selectedStatus(), mode);
  });
  readonly rankingTable = computed(() => buildRowsTable(this.rankingTitle(), this.activeRows(), this.columns()));
  readonly rankingHeight = computed(() => `${Math.max(260, this.activeRows().length * (this.rankingMode() === 'vertical' ? 0 : 26) + 60)}px`);
  readonly shareOption = computed(() => buildShareOption(this.filteredDetail().map(d => d.row!).filter(Boolean), this.columns()));
  readonly rankingTitle = computed(() => (this.view() === 'programs' ? this.copy.rankingProgramsTitle : this.copy.rankingCentersTitle));

  /** Rows of the detail table: the active view, filtered by the search box, sorted by the clicked header. */
  readonly detailRows = computed<DetailRow[]>(() =>
    this.view() === 'programs'
      ? this.programRows().map(row => ({ code: row.code, badge: row.code, name: row.name, title: row.name, link: row.link, state: 'ready' as LoadState, row }))
      : this.centerRows().map(c => ({ code: c.code, badge: null, name: c.acronym, title: c.fullName, link: c.link, state: c.state, row: c.row }))
  );
  readonly filteredDetail = computed(() => {
    const term = this.search().trim().toLowerCase();
    const key = this.sortKey();
    const sign = this.sortDesc() ? -1 : 1;
    const value = (d: DetailRow): number | string => {
      if (key === 'name') return d.name.toLowerCase();
      if (!d.row) return -1;
      if (key === 'total') return d.row.total;
      return d.row.counts[this.columns().findIndex(column => column.id === key)] ?? 0;
    };
    return this.detailRows()
      .filter(d => !term || d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term) || d.title.toLowerCase().includes(term))
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        const cmp = typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb);
        return cmp * sign || a.name.localeCompare(b.name);
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

  setView(view: EntityView): void {
    if (this.view() === view) return;
    this.view.set(view);
    this.selectedStatus.set(null);
    this.search.set('');
    this.sortKey.set('total');
    this.sortDesc.set(true);
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

    // Both tables load once the phase is known (or known to be missing). The loads run untracked so the
    // signals they read (the centres catalogue among them) never re-trigger this effect into a second fetch.
    effect(() => {
      if (!this.phaseResolved()) return;
      const versionId = this.versionId();
      untracked(() => {
        this.loadPrograms(versionId);
        void this.loadCenters(versionId);
      });
    });
  }

  retryPrograms(): void {
    if (this.programsState() === 'loading') return;
    this.loadPrograms(this.versionId());
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

  private loadPrograms(versionId: number | null): void {
    this.programsState.set('loading');
    this.api.resultsSE
      .GET_ScienceProgramsProgress(versionId ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ response }) => {
          this.programRows.set(buildProgramRows(response, versionId));
          this.programsState.set('ready');
        },
        error: () => this.programsState.set('error')
      });
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
