// @akili-spec bilateral/center-overview-tab (COV-T-5, COV-R-2..COV-R-12, COV-R-17..COV-R-19,
// COV-DD-2, COV-DD-3, COV-DD-7, COV-DD-8, COV-DD-9, COV-DD-10)
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  Signal,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { PrVizChartComponent } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ECElementEvent } from 'echarts/core';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralOverviewService, BilateralOverviewEntry } from '../../services/bilateral-overview.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { resolveChartTokens } from '../../../../shared/utils/chart-tokens.util';
import {
  BILATERAL_METHOD_QUERY_PARAM,
  BILATERAL_PHASE_QUERY_PARAM,
  BILATERAL_PROGRAM_QUERY_PARAM,
  BILATERAL_PROJECT_QUERY_PARAM,
  BILATERAL_ROLE_QUERY_PARAM,
  BILATERAL_SEARCH_QUERY_PARAM,
  BILATERAL_SOURCE_QUERY_PARAM,
  BILATERAL_STATUS_QUERY_PARAM,
  BILATERAL_TYPE_QUERY_PARAM,
  BilateralQueryParams,
  StatusKey,
  parseBilateralQueryParams,
  serializeBilateralQueryParams,
} from '../../bilateral-query-params';
import { filterCenterResults } from '../../bilateral-result-filter';
import {
  OverviewAttentionRow,
  OverviewModel,
  OverviewProjectBar,
  OverviewStatusTile,
  PENDING_AGE_DAYS,
  buildOverviewModel,
} from './bilateral-overview.aggregate';
import {
  NO_PROJECT_CATEGORY_LABEL,
  OVERVIEW_PROJECT_BAR_LIMIT,
  OverviewChartOptions,
  STATUS_TILE_LABELS,
  byProjectOption,
  byProjectTable,
  bySpOption,
  bySpTable,
  byTypeOption,
  byTypeTable,
  paceOption,
  paceTable,
  resolveChartClick,
  statusMeterOption,
  statusMeterTable,
  visibleProjectBars,
  visibleTypeRows,
} from './bilateral-overview.charts';
import { OverviewControlsComponent, OverviewFilterOption } from './components/overview-controls/overview-controls.component';

/** The nine contract keys the Overview reads and writes (`multi` is Reporting-only). */
const OVERVIEW_MANAGED_QUERY_PARAMS = [
  BILATERAL_PHASE_QUERY_PARAM,
  BILATERAL_STATUS_QUERY_PARAM,
  BILATERAL_PROJECT_QUERY_PARAM,
  BILATERAL_PROGRAM_QUERY_PARAM,
  BILATERAL_TYPE_QUERY_PARAM,
  BILATERAL_ROLE_QUERY_PARAM,
  BILATERAL_SOURCE_QUERY_PARAM,
  BILATERAL_METHOD_QUERY_PARAM,
  BILATERAL_SEARCH_QUERY_PARAM,
] as const;

const EMPTY_ENTRY: BilateralOverviewEntry = {
  results: null,
  projects: null,
  resultsError: null,
  projectsError: null,
  loading: false,
};

function emptyParams(): BilateralQueryParams {
  return {
    phase: null,
    status: [],
    project: [],
    program: [],
    type: [],
    role: null,
    source: null,
    method: null,
    search: '',
    multi: false,
  };
}

/** The four Needs-attention rows' copy, keyed by the model's row key (`COV-R-8`). */
const ATTENTION_ROW_COPY: Record<OverviewAttentionRow['key'], { title: string; hint: string }> = {
  editing: { title: 'Results still in Editing', hint: 'Created but not submitted for review' },
  rejected: { title: 'Rejected by the Science Program', hint: 'Need rework and resubmission' },
  aiDrafts: { title: 'AI draft results awaiting review', hint: 'Extracted candidates not yet promoted or discarded' },
  pendingOver14: {
    title: `Pending review for more than ${PENDING_AGE_DAYS} days`,
    hint: 'Waiting on the SP — consider following up',
  },
};

/** The five status tiles' sub-copy and pill token pair (`COV-R-7`; pills only — `COV-DD-5`). */
const STATUS_TILE_META: Record<OverviewStatusTile['key'], { hint: string; pillClass: string }> = {
  editing: {
    hint: 'not yet submitted',
    pillClass: 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]',
  },
  pending: {
    hint: 'waiting on the SP',
    pillClass: 'bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]',
  },
  submittedQa: {
    hint: 'W1/W2 workflow',
    pillClass: 'bg-[var(--pr-status-submitted-bg)] text-[var(--pr-status-submitted-fg)]',
  },
  approved: {
    hint: 'by the Science Program',
    pillClass: 'bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)]',
  },
  rejected: { hint: 'rework required', pillClass: 'bg-[var(--pr-danger-soft)] text-[var(--pr-danger)]' },
};

/**
 * The Bilateral Center **Overview** tab (`design.md` §6.2). It owns the URL ↔ state sync, calls
 * `BilateralOverviewService`, derives the scoped row set through the SHARED `filterCenterResults`
 * predicate and renders the KPI deck plus six cards.
 *
 * **It computes no figure itself** (`COV-DD-1`): every number on screen comes out of
 * `bilateral-overview.aggregate.ts`, and every deep link out of `serializeBilateralQueryParams` —
 * which is what makes the destination tab's visible count equal the figure by construction rather
 * than by coincidence (`COV-R-13`).
 */
@Component({
  selector: 'app-bilateral-overview',
  standalone: true,
  imports: [RouterLink, BilateralPageHeaderComponent, PrVizChartComponent, OverviewControlsComponent],
  templateUrl: './bilateral-overview.component.html',
  styleUrl: './bilateral-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pr-viewport-page' },
})
export class BilateralOverviewComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly phasesService = inject(PhasesService);
  private readonly overviewService = inject(BilateralOverviewService);
  private readonly aiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);

  private readonly controls = viewChild(OverviewControlsComponent);

  /** Fixed reference "today" so aging math cannot shift mid-session. */
  private readonly today = new Date();

  readonly phases = signal<Phases[]>([]);
  readonly params = signal<BilateralQueryParams>(emptyParams());
  readonly showAllProjects = signal(false);

  readonly attentionRowCopy = ATTENTION_ROW_COPY;
  readonly kpiSkeletonSlots = [1, 2, 3, 4, 5];
  readonly attentionSkeletonSlots = [1, 2, 3, 4];
  readonly statusTileMeta = STATUS_TILE_META;
  readonly statusTileLabels = STATUS_TILE_LABELS;
  readonly noProjectLabel = NO_PROJECT_CATEGORY_LABEL;
  readonly pendingAgeDays = PENDING_AGE_DAYS;

  /**
   * The CLARISA center **code** once it is known to belong to the acronym currently in the URL —
   * `''` while it is not. Written by `trackCenterResolution` from the constructor.
   *
   * The shell (`pages/bilateral/bilateral.component.ts` `ngOnInit`) sets the acronym SYNCHRONOUSLY
   * and re-emits the *previous* center's code alongside it (`ctx.centerId() ?? undefined`),
   * resolving the real one a tick later. So `ctx.centerId()` is `null` on cold boot and the WRONG
   * center's key for one turn on every cross-center navigation — and `bilateral-center-results`
   * only accepts a numeric CLARISA id, so falling back to the acronym would silently answer an
   * empty list. Nothing is fetched and no filter is reset until the pair is consistent.
   */
  private readonly resolvedCenterId = signal<string | null>(null);

  /** The identifier the API is keyed by (`''` until the shell has resolved it for this acronym). */
  readonly centerKey = computed(() => this.resolvedCenterId() ?? '');

  /**
   * `COV-R-2` A/C — the phase every card is scoped to. `ctx.selectedVersionId` already carries the
   * URL's `?phase=` (written by `applyUrlParams`); an id that matches no loaded phase falls through
   * to the Open phase, and `reconcilePhaseEffect` then strips it from the URL.
   */
  readonly selectedPhase = computed<Phases | null>(() => {
    const phases = this.phases();
    if (!phases.length) return null;
    const versionId = this.ctx.selectedVersionId();
    if (versionId !== null) {
      const match = phases.find(phase => phase.id === versionId);
      if (match) return match;
    }
    return phases.find(phase => phase.status) ?? phases[0] ?? null;
  });

  readonly effectiveVersionId = computed<number | null>(() => this.selectedPhase()?.id ?? null);

  /**
   * `COV-DD-8` + the `COV-T-3` review note: `entry()` ALLOCATES a computed per call, so it is
   * called exactly once per `center::version` key change here and the result is read through a
   * second computed. Reading the current key only is also what keeps a late response for a
   * superseded phase off the screen (`COV-R-2` B / `COV-R-21`).
   */
  private readonly entrySignal = computed<Signal<BilateralOverviewEntry> | null>(() => {
    const centerKey = this.centerKey();
    const versionId = this.effectiveVersionId();
    if (!centerKey || versionId === null) return null;
    return this.overviewService.entry(centerKey, versionId);
  });

  readonly entry = computed<BilateralOverviewEntry>(() => this.entrySignal()?.() ?? EMPTY_ENTRY);

  readonly resultsError = computed(() => this.entry().resultsError);
  readonly projectsError = computed(() => this.entry().projectsError);
  /** In flight while neither data nor an error has landed for this key (`COV-R-17`). */
  readonly resultsLoading = computed(() => this.entry().results === null && this.entry().resultsError === null);
  readonly projectsLoading = computed(() => this.entry().projects === null && this.entry().projectsError === null);

  readonly allProjects = computed<BilateralProject[]>(() => this.entry().projects ?? []);

  /** `COV-R-3` A — the SAME predicate the Results tab applies, over the same rows. */
  readonly scopedRows = computed(() => filterCenterResults(this.entry().results ?? [], this.params()));

  /** A project matches `program` through its own `sciencePrograms[]` (`COV-R-3` A AND-IT-MUST). */
  readonly scopedProjects = computed<BilateralProject[]>(() => {
    const params = this.params();
    return this.allProjects().filter(project => {
      if (params.project.length && !params.project.includes(Number(project.id))) return false;
      if (
        params.program.length &&
        !(project.sciencePrograms ?? []).some(mapping => params.program.includes(mapping.programCode))
      ) {
        return false;
      }
      return true;
    });
  });

  /** `COV-R-6` "AI drafts scope" — drafts narrow with the project filter, by `job.project_id`. */
  readonly scopedDrafts = computed(() => {
    const drafts = this.aiService.draftList();
    const projectIds = this.params().project;
    if (!projectIds.length) return drafts;
    return drafts.filter(draft => projectIds.includes(Number(draft.job?.project_id)));
  });

  readonly model = computed<OverviewModel>(() =>
    buildOverviewModel(this.scopedRows(), this.scopedProjects(), this.scopedDrafts(), this.selectedPhase(), this.today),
  );

  readonly isEmptyPhase = computed(
    () => !this.resultsLoading() && this.resultsError() === null && this.scopedRows().length === 0,
  );

  // ── Labels ────────────────────────────────────────────────────────────────────────────────

  readonly projectLabels = computed<Map<number, string>>(
    () => new Map(this.allProjects().map(project => [Number(project.id), project.shortName || project.fullName])),
  );

  readonly programLabels = computed<Map<string, string>>(() => {
    const labels = new Map<string, string>();
    for (const project of this.allProjects()) {
      for (const mapping of project.sciencePrograms ?? []) {
        if (mapping.programCode && !labels.has(mapping.programCode)) {
          labels.set(mapping.programCode, mapping.spName || mapping.programCode);
        }
      }
    }
    return labels;
  });

  projectLabel(projectId: number): string {
    return this.projectLabels().get(projectId) ?? `Project ${projectId}`;
  }

  programLabel(code: string): string {
    return this.programLabels().get(code) ?? code;
  }

  // ── Controls option lists ─────────────────────────────────────────────────────────────────

  readonly programOptions = computed<OverviewFilterOption<string>[]>(() => {
    const codes = new Set<string>(this.programLabels().keys());
    for (const row of this.entry().results ?? []) if (row.submitter) codes.add(row.submitter);
    return [...codes]
      .map(code => ({ value: code, label: this.programLabel(code) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly projectOptions = computed<OverviewFilterOption<number>[]>(() =>
    this.allProjects()
      .map(project => ({
        value: Number(project.id),
        label: project.fullName && project.fullName !== project.shortName
          ? `${project.shortName} — ${project.fullName}`
          : project.shortName || project.fullName || `Project ${project.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  readonly typeOptions = computed<OverviewFilterOption<number>[]>(() => {
    const labels = new Map<number, string>();
    for (const row of this.entry().results ?? []) {
      const typeId = Number(row.result_type_id);
      if (!Number.isFinite(typeId) || labels.has(typeId)) continue;
      labels.set(typeId, row.result_type || `Result type ${typeId}`);
    }
    return [...labels.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // ── Charts (COV-DD-5: tokens resolved HERE, never inside the pure builders) ───────────────

  /** `resolveChartTokens()` reads computed styles, so it is a browser call the builders refuse. */
  private readonly chartTokens = computed(() => resolveChartTokens());

  /**
   * ONE options bag, shared by every option builder AND by `resolveChartClick` — a click's
   * `dataIndex` addresses the RENDERED categories, so resolving it against a differently-limited
   * model maps to the wrong project (`COV-T-4` review).
   */
  readonly chartOptions = computed<OverviewChartOptions>(() => ({
    limit: this.showAllProjects()
      ? Math.max(this.model().byProject.bars.length, 1)
      : OVERVIEW_PROJECT_BAR_LIMIT,
    projectLabels: this.projectLabels(),
    programLabels: this.programLabels(),
    today: this.today,
  }));

  readonly statusChartOption = computed(() => statusMeterOption(this.model().status, this.chartTokens()));
  readonly statusChartTable = computed(() => statusMeterTable(this.model().status));

  readonly byProjectChartOption = computed(() =>
    byProjectOption(this.model().byProject, this.chartTokens(), this.chartOptions()),
  );
  readonly byProjectChartTable = computed(() => byProjectTable(this.model().byProject, this.chartOptions()));

  readonly bySpChartOption = computed(() => bySpOption(this.model().bySp, this.chartTokens(), this.chartOptions()));
  readonly bySpChartTable = computed(() => bySpTable(this.model().bySp, this.chartOptions()));

  readonly byTypeChartOption = computed(() => byTypeOption(this.model().byType, this.chartTokens()));
  readonly byTypeChartTable = computed(() => byTypeTable(this.model().byType));

  readonly paceChartOption = computed(() => paceOption(this.model().pace, this.chartTokens(), this.chartOptions()));
  readonly paceChartTable = computed(() => paceTable(this.model().pace));

  /** Bars actually drawn — the card's link chips mirror exactly what the chart shows. */
  readonly visibleBars = computed<OverviewProjectBar[]>(() =>
    visibleProjectBars(this.model().byProject, this.chartOptions().limit),
  );

  readonly hiddenBarCount = computed(() => Math.max(this.model().byProject.bars.length - this.visibleBars().length, 0));

  readonly visibleTypes = computed(() => visibleTypeRows(this.model().byType));

  /** Fixed per-card heights (`COV-R-19` AND-IT-MUST: no aspect-ratio jump), bounded 180–420px. */
  readonly byProjectChartHeight = computed(() => {
    const rows = this.visibleBars().length + (this.model().byProject.noProjectRow ? 1 : 0);
    return `${Math.min(Math.max(rows * 26 + 56, 180), 420)}px`;
  });

  readonly bySpChartHeight = computed(() => `${Math.min(Math.max(this.model().bySp.rows.length * 30 + 48, 180), 320)}px`);

  readonly byTypeChartHeight = computed(() => `${Math.min(Math.max(this.visibleTypes().length * 26 + 56, 180), 320)}px`);

  // ── Deep links (COV-DD-3) ────────────────────────────────────────────────────────────────

  readonly resultsLink = computed(() => ['/bilateral', this.ctx.centerAcronym(), 'results']);
  readonly reportingLink = computed(() => ['/bilateral', this.ctx.centerAcronym(), 'home']);
  readonly draftsLink = computed(() => ['/bilateral', this.ctx.centerAcronym(), 'drafts']);

  /**
   * `COV-DD-3` — a deep link serializes `{ ...currentParams, ...dimension }` with
   * `explicitDefaults: true` (so the Results tab does not layer its W3 + Lead default on top of an
   * Overview figure that counted both) and ALWAYS carries `phase` = the effective version id, even
   * when the Overview's own URL has no `?phase=`.
   */
  deepLinkParams(dimension: Partial<BilateralQueryParams> = {}): Params {
    return serializeBilateralQueryParams(
      { ...this.params(), ...dimension, phase: this.effectiveVersionId() },
      { explicitDefaults: true },
    );
  }

  /** `COV-R-7` — `Submitted / QA` is one tile over two contract status keys. */
  statusTileLinkParams(tile: OverviewStatusTile): Params {
    const status: StatusKey[] = tile.key === 'submittedQa' ? ['submitted', 'qa'] : [tile.key];
    return this.deepLinkParams({ status });
  }

  /** `COV-R-8` — the AI-drafts row opens Draft Results; the other three open Results. */
  attentionRowLinkParams(row: OverviewAttentionRow): Params {
    if (row.key === 'aiDrafts') return this.deepLinkParams();
    const status: StatusKey[] = row.key === 'editing' ? ['editing'] : row.key === 'rejected' ? ['rejected'] : ['pending'];
    return this.deepLinkParams({ status });
  }

  constructor() {
    // Runs FIRST so `centerKey()` is already reconciled when the fetch effect below reads it.
    let lastAcronym: string | null = null;
    let lastCenterId: string | null = null;
    let resolvedForAcronym: string | null = null;
    effect(() => {
      const acronym = this.ctx.centerAcronym();
      const centerId = this.ctx.centerId();
      untracked(() => {
        // A code belongs to this acronym once it was WRITTEN while this acronym was already
        // current: the shell's synchronous call re-writes the previous value unchanged, and the
        // async CLARISA resolution is the one that changes it. The very first observation is
        // trusted when a code is already present — that is a tab switch inside the same center,
        // where the shell resolved before this page was created.
        const resolvedNow = lastAcronym === null ? centerId !== null : centerId !== lastCenterId;
        if (resolvedNow) resolvedForAcronym = acronym;
        lastAcronym = acronym;
        lastCenterId = centerId;
        this.resolvedCenterId.set(resolvedForAcronym === acronym ? centerId : null);
      });
    });

    // `COV-R-2` B / `COV-DD-8` — fetch whenever the center or the effective phase changes; the
    // service is a no-op for a key already cached or already in flight.
    effect(() => {
      const centerKey = this.centerKey();
      const versionId = this.effectiveVersionId();
      if (!centerKey || versionId === null) return;
      untracked(() => this.overviewService.load(centerKey, versionId));
    });

    // `COV-R-2` C — an unknown (but numeric) `?phase=` resolves to the Open phase; strip it once
    // the phase list is actually loaded, so the URL stops advertising a phase that does not exist.
    effect(() => {
      const phases = this.phases();
      const versionId = this.ctx.selectedVersionId();
      if (!phases.length || versionId === null) return;
      if (phases.some(phase => phase.id === versionId)) return;
      untracked(() => {
        this.ctx.selectedVersionId.set(null);
        this.params.update(params => ({ ...params, phase: null }));
        this.writeUrl();
      });
    });

    // `COV-R-3` D — a center switch resets filters, the popover and the URL params (kaizen
    // FIND-02: filters surviving a center switch produced a false empty state).
    //
    // Keyed on the ACRONYM, which is what the URL segment carries and what actually changes once
    // per navigation. Keying it on the resolved code instead would fire again when the shell
    // resolves that code moments later — wiping a deep link's own filters on cold boot.
    let previousCenter: string | null = null;
    effect(() => {
      const centerKey = this.ctx.centerAcronym();
      untracked(() => {
        if (previousCenter !== null && previousCenter !== centerKey) {
          this.params.set(emptyParams());
          this.showAllProjects.set(false);
          this.controls()?.closePopover();
          this.writeUrl();
        }
        previousCenter = centerKey;
      });
    });
  }

  ngOnInit(): void {
    // The observable emits its current value on subscription, so one subscription covers the first
    // load, a deep link, back/forward and a header tab click.
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(map => this.applyUrlParams(map));

    const p25Only = (phases: Phases[]) => phases.filter(phase => phase.obj_portfolio?.acronym === 'P25');
    const byYearDesc = (phases: Phases[]) => [...phases].sort((a, b) => (b.phase_year ?? 0) - (a.phase_year ?? 0));

    const loaded = p25Only(this.phasesService.phases.reporting);
    if (loaded.length) {
      this.phases.set(byYearDesc(loaded));
      return;
    }

    // `COV-R-2` A AND-IT-MUST — the default resolves for a LATE `PhasesService` load too; until
    // then `selectedPhase()` is null and every card shows its skeleton, never an empty state.
    this.phasesService
      .getPhasesObservable()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(phases => this.phases.set(byYearDesc(p25Only(phases))));
  }

  // ── URL ↔ state ──────────────────────────────────────────────────────────────────────────

  private applyUrlParams(map: ParamMap): void {
    const parsed = parseBilateralQueryParams(map);
    this.params.set(parsed.params);

    if (parsed.params.phase !== null && parsed.params.phase !== this.ctx.selectedVersionId()) {
      this.ctx.selectedVersionId.set(parsed.params.phase);
    }

    // `COV-R-2` C / `COV-R-13` — rewrite only the keys that actually carried a bad token, keeping
    // whatever valid values those same keys still have.
    if (parsed.stripped.length) {
      const validSerialized = serializeBilateralQueryParams(parsed.params);
      const next: Params = {};
      for (const key of new Set(parsed.stripped.map(entry => entry.split('=')[0]))) {
        next[key] = key in validSerialized ? validSerialized[key] : null;
      }
      this.navigate(next);
    }
  }

  /** Mirrors the current filter state to the URL; every managed key absent is nulled out. */
  private writeUrl(): void {
    // `COV-R-2` C — `phase` is written ONLY when a phase was actually chosen (by the user or by a
    // valid `?phase=`). Serializing `effectiveVersionId()` unconditionally would REPLACE an
    // unknown `?phase=999` with the Open phase's id instead of stripping the param. Deep links are
    // a different path (`deepLinkParams`) and still always carry the phase.
    const phase = this.ctx.selectedVersionId() === null ? null : this.effectiveVersionId();
    const serialized = serializeBilateralQueryParams({ ...this.params(), phase });
    const current = this.activatedRoute.snapshot.queryParamMap;
    const next: Params = {};
    let changed = false;
    for (const key of OVERVIEW_MANAGED_QUERY_PARAMS) {
      const value = key in serialized ? serialized[key] : null;
      next[key] = value;
      if ((current.get(key) ?? null) !== (value ?? null)) changed = true;
    }
    if (!changed) return;
    this.navigate(next);
  }

  private navigate(queryParams: Params): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ── Controls handlers ────────────────────────────────────────────────────────────────────

  onPhaseChange(versionId: number): void {
    this.ctx.selectedVersionId.set(versionId);
    this.params.update(params => ({ ...params, phase: versionId }));
    this.writeUrl();
  }

  onFiltersChange(next: BilateralQueryParams): void {
    this.showAllProjects.set(false);
    this.params.set({ ...next, phase: this.effectiveVersionId() });
    this.writeUrl();
  }

  /** `COV-R-3` B — clears every filter dimension but NOT the phase. */
  onClearFilters(): void {
    this.showAllProjects.set(false);
    this.params.set({ ...emptyParams(), phase: this.effectiveVersionId() });
    this.writeUrl();
  }

  toggleShowAllProjects(): void {
    this.showAllProjects.update(value => !value);
  }

  /** `COV-R-17` — Retry re-fetches the failed stream(s) for this key. */
  retry(): void {
    const centerKey = this.centerKey();
    const versionId = this.effectiveVersionId();
    if (!centerKey || versionId === null) return;
    this.overviewService.invalidate(centerKey, versionId);
    this.overviewService.load(centerKey, versionId);
  }

  /**
   * `COV-R-6` #4 — the Needs-attention KPI scrolls to its card rather than leaving the page.
   * `COV-R-18` — a reduced-motion user gets the jump, not the animated scroll.
   */
  scrollToAttention(): void {
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('overview-attention')
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // ── Chart clicks (COV-R-9 A, COV-R-10, COV-R-11) ─────────────────────────────────────────

  onResultsChartClick(event: ECElementEvent): void {
    this.navigateFromChart(event, this.resultsLink());
  }

  /**
   * `COV-R-10` — the two `bySp` series mean different destinations: *projects mapped* opens the
   * Reporting tab for that SP, *results reported* opens Results.
   */
  onSpChartClick(event: ECElementEvent): void {
    const toReporting = typeof event.seriesId === 'string' && event.seriesId.endsWith(':projects');
    this.navigateFromChart(event, toReporting ? this.reportingLink() : this.resultsLink());
  }

  private navigateFromChart(event: ECElementEvent, commands: unknown[]): void {
    const dimension = resolveChartClick(event, this.model(), this.chartOptions());
    if (!dimension) return;
    void this.router.navigate(commands as string[], { queryParams: this.deepLinkParams(dimension) });
  }
}
