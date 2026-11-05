import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
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
  statusIdFromChartEvent
} from './centers-block.charts';
import { BilateralCenterResult } from '../../../../../bilateral/services/bilateral-center-result.interface';
import { DimensionIndex, EMPTY_SELECTION, PortfolioFilterSelection, isActive, notAffectedBy } from '../../services/portfolio-filters';
import { CENTER_BASE_STATUS_IDS, CENTER_STATUS_IDS, CenterOrigin, applyGlobal, buildCenterRow, byOrigin, dedupeById, hasLeadProgram, isW3Row, originCounts } from './centers-block.aggregate';

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
 * the same figures and presentation: the KPI card and status donut + tiles, for the open P25 reporting phase.
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

  /** GLF-T-7: the page's global selection, the dimensions index and the version that index was built for. All optional. */
  readonly selection = input<PortfolioFilterSelection>(EMPTY_SELECTION);
  readonly dimensionIndex = input<DimensionIndex | null>(null);
  readonly dimensionsVersionId = input<number | null>(null);
  /** V-1 gate: the deck's W3/Bilateral total (same selection) and the version it was read for; null while the deck cannot say. */
  readonly deckW3Total = input<number | null>(null);
  readonly deckVersionId = input<number | null>(null);

  readonly phase = signal<Phases | null>(null);
  readonly phaseResolved = signal(false);
  readonly versionId = computed(() => (this.phase() ? Number(this.phase()!.id) : null));

  readonly centersListState = signal<LoadState>('loading');
  readonly centerRows = signal<CenterRowState[]>([]);
  /** PCA-R-4: every loaded Center's W3 rows under the global selection, one row per result (a shared result counts once). */
  private readonly distinctRows = computed(() => dedupeById(this.globalCenters().flatMap(center => center.w3Rows)));
  /** Status counts of the distinct rows of the selected origin (CNR-3), for the donut and the tiles. */
  private readonly statusRow = computed(() => buildCenterRow('all', '', byOrigin(this.distinctRows(), this.origin())));
  /** CBT-R-3 / DD-3: the base tiles always; Quality Assessed / Submitted / Discontinued when their count is > 0 or they are selected. Deck order. */
  readonly visibleStatusIds = computed<number[]>(() => {
    const counts = this.statusRow().counts;
    const selected = this.selectedStatus();
    return CENTER_STATUS_IDS.filter((id, index) => CENTER_BASE_STATUS_IDS.includes(id) || counts[index] > 0 || id === selected);
  });
  /** Counts of the visible ids, in the same order (`buildSegments` pairs by index); `total` is the distinct row count, so the counts add up to it. */
  readonly statusTotals = computed(() => {
    const row = this.statusRow();
    return { total: row.total, counts: this.visibleStatusIds().map(id => row.counts[CENTER_STATUS_IDS.indexOf(id as (typeof CENTER_STATUS_IDS)[number])]) };
  });
  readonly centersPartial = computed(() => this.centerRows().some(center => center.state === 'error'));
  readonly centersLoading = computed(() => this.centerRows().some(center => center.state === 'loading'));

  /**
   * V-1 gate: W3 results the deck counts that no Center returns (deck total minus the distinct Centers total).
   * Comparable only when both read the same phase and the same selection (no global filter active), every Center loaded
   * and none failed (the partial note already explains that gap). Otherwise 0, so no note.
   */
  readonly noCenterCount = computed(() => {
    const deck = this.deckW3Total();
    if (deck === null || this.centersListState() !== 'ready' || this.centersLoading() || this.centersPartial()) return 0;
    if (this.versionId() === null || this.versionId() !== this.deckVersionId() || this.notAffected().length > 0) return 0;
    // PCA-R-4 "deck and Centers agree": only with no global filter. The deck applies Center per result, the block per Center feed.
    if (isActive(this.selection())) return 0;
    return Math.max(0, deck - this.kpis().bilateral);
  });

  /** Project is honoured only when this block's phase is the version the dimensions index was built for (GLF-R-8, A-3). */
  readonly honoursProject = computed(() => this.versionId() !== null && this.versionId() === this.dimensionsVersionId());
  /** GLF-R-9: the active dimensions this block does not honour (Project between cycles). */
  readonly notAffected = computed(() => notAffectedBy('centers', this.selection(), this.honoursProject() ? [] : ['project']));
  readonly notAffectedText = computed(() => {
    const list = this.notAffected();
    return list.length ? this.copy.notAffected(list.map(d => this.copy.dimensions[d]).join(', ')) : '';
  });
  /** States the Center selection leaves in (all of them when none is selected). In memory only: requests never change. */
  private readonly visibleCenterRows = computed(() => {
    const codes = this.selection().center;
    return codes.size > 0 ? this.centerRows().filter(center => codes.has(center.code)) : this.centerRows();
  });
  /** Loaded Centers with their W3 rows under the global selection, before origin and status tile (DD-9). */
  private readonly globalCenters = computed(() => {
    const selection = this.selection();
    const index = this.dimensionIndex();
    const honoursProject = this.honoursProject();
    return this.visibleCenterRows()
      .filter((center): center is CenterRowState & { w3Rows: BilateralCenterResult[] } => center.w3Rows !== null)
      .map(center => ({ ...center, w3Rows: applyGlobal(center.w3Rows, selection, index, honoursProject) }));
  });

  readonly selectedStatus = signal<number | null>(null);
  readonly origin = signal<CenterOrigin>('all');

  /** Status columns with the colour the charts paint. */
  readonly columns = computed<StatusColumn[]>(() =>
    this.visibleStatusIds().map(id => ({ id, label: resultStatusLabel(id), color: resolveCssColor(`var(${STATUS_CHART_TOKEN[id] ?? '--pr-text-subtle'})`) }))
  );
  /** Same columns in the tile colours (tiles, dots) — the Portfolio overview uses a separate set there. */
  private readonly tileColumns = computed<StatusColumn[]>(() => this.columns().map(column => ({ ...column, color: resolveCssColor(this.statusDot(column.id)) })));
  private readonly donutPalette = computed(() => DONUT_PALETTE_TOKENS.map(token => resolveCssColor(`var(${token})`)));

  readonly activeState = computed<LoadState>(() =>
    this.centersListState() === 'ready' && this.centersLoading() && !this.globalCenters().length ? 'loading' : this.centersListState()
  );
  readonly segments = computed(() => buildSegments(this.tileColumns(), this.statusTotals()));

  /** CNR-DD-4: the KPI card reads ALL distinct W3 rows under the global selection, whatever the origin filter says. */
  readonly kpis = computed(() => {
    const counts = originCounts(this.distinctRows());
    return { bilateral: counts.total, bilateralNew: counts.new, bilateralReplicated: counts.replicated };
  });

  readonly donutOption = computed(() => buildStatusDonutOption(this.segments(), this.statusTotals().total, this.selectedStatus(), this.donutPalette()));
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
          this.patchCenter(center.code, { state: 'ready', w3Rows: ((envelope?.response ?? []) as BilateralCenterResult[]).filter(isW3Row).filter(hasLeadProgram) }),
        error: () => this.patchCenter(center.code, { state: 'error', w3Rows: null })
      });
  }

  private patchCenter(code: string, patch: Partial<CenterRowState>): void {
    this.centerRows.update(rows => rows.map(row => (row.code === code ? { ...row, ...patch } : row)));
  }
}
