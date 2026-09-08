// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-T-5, BRT-R-4, R-6, R-7, R-8, R-9, R-13, R-15, R-20, R-21, R-31, R-32, design.md §6.2, §6.4)
// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, R-5, R-6, R-7, R-8, R-10, design.md §6.1, §6.2)
// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-2, R-1, R-2, R-3, R-4, R-9, R-20, R-21, design.md §6.1, §6.2)
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronsDownUp, lucideChevronsUpDown, lucideChevronUp, lucideSearch, lucideX } from '@ng-icons/lucide';

import { ApiService } from '../../../../shared/services/api/api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../shared/enum/api.enum';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { isAvisaInitiative } from '../../../../shared/utils/avisa-initiative.util';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';

import { BilateralResultsService, REVIEW_RESULT_ID_QUERY_PARAM, REVIEW_RESULT_QUERY_PARAM } from './services/bilateral-results.service';
import { BilateralReviewCountService } from './services/bilateral-review-count.service';
import { BilateralReviewAccessService } from './services/bilateral-review-access.service';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
import { GroupedResult, ResultToReview } from './components/result-review-drawer/result-review-drawer.interfaces';
import { BilateralReviewKpis, BilateralReviewKpisComponent } from './components/bilateral-review-kpis/bilateral-review-kpis.component';
import { BilateralReviewGroup, BilateralReviewTableComponent } from './components/bilateral-review-table/bilateral-review-table.component';
import {
  BilateralReviewCenterStripComponent,
  BilateralReviewCenterStripItem
} from './components/bilateral-review-center-strip/bilateral-review-center-strip.component';
import { BILATERAL_REVIEW_COPY, chipCountClass } from './bilateral-review.copy';
import {
  BILATERAL_REVIEW_QUERY_PARAM_MAP,
  BilateralReviewGroupMode,
  BilateralReviewStatusFilter,
  BilateralReviewViewMode,
  joinBilateralReviewListParam,
  normalizeBilateralReviewPhaseId,
  parseBilateralReviewGroupMode,
  parseBilateralReviewListParam,
  parseBilateralReviewPhase,
  parseBilateralReviewStatus,
  parseBilateralReviewView,
  sameBilateralReviewList
} from './bilateral-review.query-params';

/** One entry of the popover Cycle select — normalized ids (BRC-R-7). */
interface BilateralReviewPhaseOption {
  id: number;
  phase_name: string;
  phase_year: number;
}

/** One entry of the Center / Bilateral project / Indicator category popover filters. */
interface BilateralReviewFilterOption {
  value: string;
  label: string;
}

/** Fields BRT-R-9 searches, case-insensitively. */
function matchesSearch(row: ResultToReview, needle: string): boolean {
  const haystacks = [row.result_code, row.result_title, row.project_name, row.lead_center, row.indicator_category, row.toc_title, row.indicator];
  return haystacks.some(value => (value ?? '').toString().toLowerCase().includes(needle));
}

/** Distinct, non-blank values of one row dimension, alphabetical. */
function optionsOf(rows: ResultToReview[], pick: (row: ResultToReview) => string | undefined): string[] {
  const unique = new Set(rows.map(pick).filter((value): value is string => !!value));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Param-safe sentinel for the center strip's "Not specified" bucket (BRC-R-1). Reviewer-found
 *  defect (attempt 1): the bucket's `code` was `''`, which `joinBilateralReviewListParam([''])`
 *  turns into `''`, and the URL → state hydrate effect's `parseBilateralReviewListParam` treats an
 *  empty/falsy raw value as "no param" (`if (!raw) return []`) — so the selection could never
 *  survive a `?center=` round trip (any merge-navigate reset it back to `[]`). This value has no
 *  CLARISA code collision risk and round-trips through the csv param like any real code; blank
 *  `lead_center` rows are recovered from it explicitly in `selectedCenterAcronyms` below. */
const UNASSIGNED_CENTER_CODE = '__unassigned__';

@Component({
  selector: 'app-bilateral-review',
  standalone: true,
  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-1, R-1): unconditional,
  // like `ProgrammeResultsComponent`/`MyWorkBoardComponent` — this surface only ever serves the
  // Bilateral review tab. Discoverability only (JA-21/judgment.md L-2): the mixin sits on bare
  // `:host` in the SCSS below, not gated on this class.
  host: { class: 'pr-viewport-page' },
  templateUrl: './bilateral-review.component.html',
  styleUrl: './bilateral-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    FormsModule,
    ReportingProgramBandComponent,
    WhereToReportModalComponent,
    PrFilterMultiselectModule,
    PrFilterSelectComponent,
    BilateralReviewKpisComponent,
    BilateralReviewTableComponent,
    BilateralReviewCenterStripComponent,
    ResultReviewDrawerComponent
  ],
  viewProviders: [provideIcons({ lucideSearch, lucideChevronsUpDown, lucideChevronsDownUp, lucideChevronDown, lucideChevronUp, lucideX })]
})
export class BilateralReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly centersSE = inject(CentersService);
  private readonly phasesSE = inject(PhasesService);
  private readonly smartNav = inject(SmartNavigationService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly results = inject(BilateralResultsService);
  private readonly countService = inject(BilateralReviewCountService);
  private readonly accessService = inject(BilateralReviewAccessService);

  readonly copy = BILATERAL_REVIEW_COPY;

  // ── Deep-linked drawer open (BRT-R-21, ported from results-review-table.component.ts:134-160) ──
  /** Result code deep-linked through the URL, consumed once the results are loaded; `null` once
   *  consumed so the effect below fires at most once even if `tableResults` changes again later. */
  private pendingReviewResultCode: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_QUERY_PARAM);
  /** Id of that same result, used when it is not part of the review list (e.g. drafts). */
  private readonly pendingReviewResultId: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_ID_QUERY_PARAM);

  /** Viewport lock: the work area is the only scroller the band needs to know about. */
  readonly workArea = viewChild<ElementRef<HTMLElement>>('workArea');
  readonly workAreaEl = computed(() => this.workArea()?.nativeElement ?? null);

  /** BRV-R-2: the pinned toolbar + filter band wrapper — its measured height drives
   *  `--brv-pinned-h` (rows'/cards' `scroll-margin-top`, WCAG 2.4.11), set on `#workArea` below. */
  private readonly pinnedWrapper = viewChild<ElementRef<HTMLElement>>('pinnedWrapper');
  private pinnedResizeObserver?: ResizeObserver;

  /** Leader-found defect fix (BRC-AC-6 + AC-8b): `app-pr-filter-select.pick()` toggles its OWN
   *  `value` to `emptyValue` on a re-pick of the shown option, then emits it — our one-way
   *  `[ngModel]="selectedVersionId()"` never re-pushes because, from this page's perspective,
   *  nothing changed (the value was already Q). Left alone the trigger would show the muted
   *  placeholder while the page silently stays on Q. `setPhase()` re-syncs the child directly via
   *  its own CVA `writeValue` (a public method) whenever the emit is a no-op. */
  private readonly cycleSelect = viewChild<PrFilterSelectComponent>('cycleSelect');

  readonly programmeCode = toSignal(this.route.paramMap.pipe(map(params => params.get('entityId') ?? '')), { initialValue: '' });
  readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  private readonly programme = computed(() => {
    const wanted = this.programmeCode().toUpperCase();
    const all = [...this.homeSE.mySPsList(), ...this.homeSE.otherSPsList(), ...this.homeSE.otherProjectsList()];
    return all.find(programme => String(programme?.initiativeCode ?? '').toUpperCase() === wanted) ?? null;
  });

  readonly programmeName = computed(() => this.programme()?.initiativeShortName || this.programme()?.initiativeName || '');
  readonly cycleYear = computed(() => this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? null);
  readonly cyclePhase = computed(() => this.api.dataControlSE.reportingCurrentPhase?.portfolioAcronym ?? '');

  /** Fail-closed gate for the band emerging CTA, same rule every sibling tab applies. */
  readonly canReportEmerging = computed(() => {
    const code = this.programmeCode();
    const programme = this.programme();
    return !!code && !isAvisaInitiative({ official_code: code, initiativeCode: code, initiativeId: programme?.initiativeId });
  });

  readonly showWhereToReportModal = signal(false);
  openWhereToReport(): void {
    this.showWhereToReportModal.set(true);
  }

  /** Hop to dashboard-lab host; T-6 wires `returnTab=bilateral-review` back to this tab. */
  openEmergingReport(): void {
    if (!this.canReportEmerging()) return;
    this.smartNav.rememberResultDetailOrigin();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], {
      queryParams: { reportEmerging: 'true', returnTab: 'bilateral-review' }
    });
  }

  // ── List state ──────────────────────────────────────────────────────────────────────────────
  /** Starts `true` so a cold page paints the skeleton, never the empty state, before the first
   *  response (Reliability fix, BRT-T-3 rework). */
  readonly loading = signal(true);
  readonly error = signal(false);
  /** BRT-T-5 / KZ-REH-2: true only for the re-fetch a drawer decision triggers — guards the row
   *  action (`aria-disabled` + title + handler early-return, never native `disabled`) so a second
   *  click can't race the refresh. Reset by `loadResults` in both its `next` and `error` paths. */
  readonly decisionInFlight = signal(false);
  /** BRC-R-10: set `true` in `loadResults`' own `next` handler (rows may be empty), reset before
   *  every new fetch. Drives the deep-link effect so it fires once the phase-scoped load SETTLES,
   *  never on "rows non-empty" (judgment-day L-4 — that guard silently drops a deep link to a
   *  result of another phase, whose phase-scoped list is legitimately empty). */
  private readonly listSettled = signal(false);

  // ── Phase state (BRC-T-1, design.md §6.1) ──────────────────────────────────────────────────
  /** Seeded from the app-wide catalogue already fetched by `PhasesService`; kept live via its
   *  `getPhasesObservable()` (a non-replaying `Subject` — judgment-day L-1, mirrors
   *  `dashboard-lab.component.ts:2839-2841`). A component still empty after that seed falls back
   *  to its own `GET_versioning(ALL, ALL)` request (`fetchPhaseCatalogFallback`, same filter the
   *  service itself applies). */
  private readonly reportingPhases = signal<Phases[]>(this.phasesSE.phases.reporting ?? []);
  /** `'ready'` when the catalogue already has data (the common case — the shell fetched it before
   *  this tab mounted); `'pending'` while this component's own fallback request is in flight;
   *  `'failed'` when that fallback errors — BRC-R-5/AC-14 read this as a hard error state instead
   *  of an indefinite skeleton. */
  readonly phaseCatalogState = signal<'ready' | 'pending' | 'failed'>(this.reportingPhases().length ? 'ready' : 'pending');

  /** BRC-AC-14 fallback source: the portfolio-filtered catalogue's own "open" row (`status ===
   *  true`) — the SAME fact the shell fetches via `GET_versioning(OPEN, REPORTING)`, so reading it
   *  here is not a second authority, just an earlier read of the same number once THIS
   *  component's own catalogue fetch has settled. `null` while there is no such row (or the
   *  program/portfolio itself hasn't resolved). */
  private readonly catalogCurrentPhaseId = computed<number | null>(() => {
    const portfolioId = this.programme()?.portfolioId;
    if (portfolioId == null) return null;
    const open = this.reportingPhases().find(
      p => p?.obj_portfolio?.id != null && Number(p.obj_portfolio.id) === Number(portfolioId) && p.status === true
    );
    return open ? Number(open.id) : null;
  });

  /** THE single current-phase resolver (mirrors `dashboard-lab.effectiveVersionId`'s bigint-string
   *  normalization, `:1477-1516`): tracked read of `reportingPhaseVersion()`, otherwise unused —
   *  `reportingCurrentPhase` is a plain mutable object, not a signal, so without this a
   *  late-arriving phase would never re-trigger this computed. Prefers the SHELL's own value;
   *  falls back to `catalogCurrentPhaseId` (BRC-AC-14) only once this component's own catalogue
   *  fetch has SETTLED (`phaseCatalogState() === 'ready'`) — racing an in-flight catalogue fetch
   *  would risk resolving to a DIFFERENT number than the one the shell is about to deliver, which
   *  would cost a second list request the moment the shell catches up (asserted in the spec: the
   *  race test bumps the shell to the SAME number the catalogue already resolved and checks the
   *  list request count stays at one). `null` while genuinely unresolved either way. */
  readonly currentPhaseId = computed<number | null>(() => {
    this.api.dataControlSE.reportingPhaseVersion?.();
    const shellId = normalizeBilateralReviewPhaseId(this.api.dataControlSE.reportingCurrentPhase?.phaseId);
    if (shellId !== null) return shellId;
    if (this.phaseCatalogState() !== 'ready') return null;
    return this.catalogCurrentPhaseId();
  });

  /** BRC-AC-14 (second half): the catalogue settled successfully but there is genuinely no
   *  resolvable current phase — no "open" row for this program's portfolio, and the shell's own
   *  value never arrived either. Same hard error state as an outright catalogue request failure
   *  (`phaseCatalogState() === 'failed'`); `retry()` re-attempts both branches identically. */
  readonly currentPhaseUnresolvable = computed(() => this.phaseCatalogState() === 'ready' && this.currentPhaseId() === null);

  /** The program's own portfolio's phases, current first then `phase_year` desc (mirrors
   *  `dashboard-lab.phaseSelectorOptions`, `:1503-1524`) — the Cycle select's options. Empty while
   *  the program or the catalogue has not resolved yet. */
  readonly knownPhases = computed<BilateralReviewPhaseOption[]>(() => {
    const portfolioId = this.programme()?.portfolioId;
    if (portfolioId == null) return [];
    const currentId = this.currentPhaseId();
    return this.reportingPhases()
      .filter(p => p?.obj_portfolio?.id != null && Number(p.obj_portfolio.id) === Number(portfolioId))
      .map(p => ({ id: Number(p.id), phase_name: p.phase_name, phase_year: p.phase_year }))
      .sort((a, b) => {
        if (a.id === currentId && b.id !== currentId) return -1;
        if (b.id === currentId && a.id !== currentId) return 1;
        return (b.phase_year ?? 0) - (a.phase_year ?? 0);
      });
  });

  /** `?phase=` hydrated by the URL → state effect below; `null` = no explicit override (BRC-R-7's
   *  default: fall back to the current phase). Also `null` for a PRESENT-but-unparseable value
   *  (e.g. the Results tab's own `?phase=` carries a phase NAME, not a `versionId` — every band
   *  tab link uses `queryParamsHandling="preserve"`, so a Results → Bilateral review hop lands
   *  exactly that value) — `phaseParamRaw` below is what distinguishes the two cases for the
   *  URL-rewrite effect (Reviewer-found defect: "absent" and "present-but-invalid" must not
   *  collapse into the same `null`, or the stale label never gets rewritten). */
  readonly phaseParam = signal<number | null>(null);
  /** Raw `?phase=` string, or `null` when the key itself is absent from the URL — the ONLY signal
   *  that can tell "no override" apart from "an override that failed to parse". */
  private readonly phaseParamRaw = signal<string | null>(null);

  /** THE selected phase every list request/count-service call is scoped to (BRC-R-5). A param
   *  that cannot yet be validated against `knownPhases` (catalogue still empty) is treated the
   *  same as "unknown" — it defaults to the current phase rather than firing an unscoped request,
   *  and is re-validated once the catalogue actually loads (the URL-rewrite effect below). */
  readonly selectedVersionId = computed<number | null>(() => {
    const current = this.currentPhaseId();
    const param = this.phaseParam();
    if (param === null) return current;
    const known = this.knownPhases();
    if (known.length === 0) return null;
    return known.some(p => p.id === param) ? param : current;
  });

  /** "Showing <phase name>" pill copy — `null` (hidden) unless the selected phase differs from the
   *  current one (BRC-R-8). */
  readonly phaseIndicator = computed<string | null>(() => {
    const selected = this.selectedVersionId();
    const current = this.currentPhaseId();
    if (selected === null || current === null || selected === current) return null;
    const name = this.knownPhases().find(p => p.id === selected)?.phase_name;
    return name ?? null;
  });

  // ── Toolbar / filter state (design.md §6.2) ────────────────────────────────────────────────
  readonly search = signal('');
  readonly status = signal<BilateralReviewStatusFilter>('all');
  /** CLARISA center CODES (csv on the URL, BRT-R-16). */
  readonly centers = signal<string[]>([]);
  readonly projects = signal<string[]>([]);
  readonly categories = signal<string[]>([]);
  readonly view = signal<BilateralReviewViewMode>('grouped');
  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-11, design.md §6.1)
  /** Eighth key, `?group=` — how the grouped view is grouped (BRP-R-11). Hydrated by the URL →
   *  state effect below; a present-but-invalid raw value is stripped from the URL by its own
   *  effect (mirrors the `?phase=` rewrite's split between the parsed value and the raw string).
   *  `setGroup()` is the ONLY writer — a direct `router.navigate`, deliberately outside the
   *  reactive "state → URL" effect below and bumping NO nonce (judgment-day L-4: an earlier draft
   *  bumped `expandAllNonce`, which would have cleared the table's per-mode collapse memory). */
  readonly group = signal<BilateralReviewGroupMode>('project');
  /** Raw `?group=` string, or `null` when the key is absent — the only signal that can tell
   *  "absent" apart from "present but invalid" (same split `phaseParamRaw` uses for `?phase=`). */
  private readonly groupParamRaw = signal<string | null>(null);
  readonly expandAllNonce = signal(0);
  /** State the table applies to every group on the NEXT `expandAllNonce` bump (BRT-T-4). Starts
   *  `true` so the table's initial render honors "groups are expanded by default" (BRT-R-10). */
  readonly allExpanded = signal(true);
  readonly filterPopoverOpen = signal(false);

  readonly onlyPending = computed(() => this.status() === 'pending');

  // ── Filter band (BRP-T-1, design.md §6.1) ──────────────────────────────────────────────────
  /** Shared tonal count-badge class helper (BRP-R-4), re-exported for the template. */
  readonly chipCountClass = chipCountClass;

  /** Effective CSS width < 900px (BRP glossary "Narrow") — `matchMedia`, guarded for jsdom, same
   *  pattern as `my-work-board.component.ts:56, 311-327`. Structural only (the centers-row default
   *  and, later tasks, the cards branch); CSS handles everything purely visual. */
  private readonly narrowQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 899px)') : null;
  readonly isNarrow = signal(this.narrowQuery?.matches ?? false);

  private static readonly CENTERS_EXPANDED_STORAGE_KEY = 'pr.bilateral.centersExpanded';

  /** `null` = no stored choice yet; `'1'`/`'0'` otherwise (app convention, `dashboard-lab.component.ts:3649-3683`). */
  private readStoredCentersExpanded(): boolean | null {
    try {
      const raw = sessionStorage.getItem(BilateralReviewComponent.CENTERS_EXPANDED_STORAGE_KEY);
      return raw === '1' ? true : raw === '0' ? false : null;
    } catch {
      return null;
    }
  }

  /** The user's explicit choice (chevron click), or `null` while none has been made this session. */
  private readonly storedCentersExpanded = signal<boolean | null>(this.readStoredCentersExpanded());
  /** R-21 one-shot override — set at most once, by the constructor effect below, and never itself
   *  persisted (a stored choice always wins over it, per AC-14's "with a stored false it stays
   *  collapsed"). */
  private readonly oneShotExpanded = signal(false);

  /** Stored choice beats the one-shot, which beats the `> 6 centers or narrow` default (BRP-R-3). */
  readonly centersRowExpanded = computed(() => {
    const stored = this.storedCentersExpanded();
    if (stored !== null) return stored;
    if (this.oneShotExpanded()) return true;
    return !(this.centerStrip().length > 6 || this.isNarrow());
  });

  readonly centersChevronIcon = computed(() => (this.centersRowExpanded() ? 'lucideChevronUp' : 'lucideChevronDown'));
  readonly centersChevronLabel = computed(() => (this.centersRowExpanded() ? this.copy.filterBand.hideCenters : this.copy.filterBand.showCenters));

  toggleCentersRow(): void {
    const next = !this.centersRowExpanded();
    this.storedCentersExpanded.set(next);
    this.oneShotExpanded.set(false); // an explicit choice always supersedes the one-shot.
    try {
      sessionStorage.setItem(BilateralReviewComponent.CENTERS_EXPANDED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Storage may be unavailable (private mode / blocked) — the toggle still works for the session.
    }
  }

  /** "Can this user review THIS program" (BRT-R-14) — gates the row action label (BRT-AC-8).
   *  A plain method, NOT a `computed()`: `isProgramMember` reads non-reactive state
   *  (`rolesSE.isAdmin`, `dataControlSE.myInitiativesList` — a plain array) that can resolve
   *  AFTER this page's first render (hard load / deep link). A `computed()` here would memoize
   *  whatever answer it saw on that first read — its only SIGNAL dependency is `programmeCode()`
   *  — locking a genuine program member out of Review forever. A plain method is re-evaluated on
   *  every change-detection pass instead (Reviewer fix, BRT-T-4 rework attempt 2). */
  canReview(): boolean {
    return this.accessService.isProgramMember(this.programmeCode());
  }

  /** Toolbar label/icon for the Expand all ⇄ Collapse all control — describes the action the next
   *  click performs, so a page that opens already fully expanded reads "Collapse all" first. */
  readonly expandAllLabel = computed(() => (this.allExpanded() ? this.copy.toolbar.collapseAll : this.copy.toolbar.expandAll));
  readonly expandAllIcon = computed(() => (this.allExpanded() ? 'lucideChevronsDownUp' : 'lucideChevronsUpDown'));

  // ── Center code ↔ acronym (design.md §6.2 — rows carry the acronym in `lead_center`) ───────
  private readonly codeToAcronym = computed(() => {
    const map = new Map<string, string>();
    for (const center of this.centersSE.centers()) map.set(center.code, center.acronym);
    return map;
  });
  private readonly acronymToCode = computed(() => {
    const map = new Map<string, string>();
    for (const center of this.centersSE.centers()) map.set(center.acronym, center.code);
    return map;
  });
  private readonly selectedCenterAcronyms = computed(() => {
    const map = this.codeToAcronym();
    return this.centers().map(code => (code === UNASSIGNED_CENTER_CODE ? '' : (map.get(code) ?? code)));
  });

  // ── Computed pipeline (design.md §6.2): searchFiltered → chipCounts/kpis → visibleRows → groups ──
  readonly searchFiltered = computed<ResultToReview[]>(() => {
    const needle = this.search().trim().toLowerCase();
    const rows = this.results.tableResults();
    return needle ? rows.filter(row => matchesSearch(row, needle)) : rows;
  });

  readonly matchCount = computed<number | null>(() => (this.search().trim() ? this.searchFiltered().length : null));

  private isPending(row: ResultToReview): boolean {
    return row.status_id == 5; // eslint-disable-line eqeqeq -- wire may send "5"
  }
  private isApproved(row: ResultToReview): boolean {
    return row.status_id == 6; // eslint-disable-line eqeqeq -- wire may send "6"
  }
  private isRejected(row: ResultToReview): boolean {
    return row.status_id == 7; // eslint-disable-line eqeqeq -- wire may send "7"
  }

  /** Chip counts, computed over `searchFiltered` — BEFORE status/popover filters, so the counts
   *  explain the chips rather than describe an already-narrowed list. */
  readonly chipCounts = computed(() => {
    const rows = this.searchFiltered();
    return {
      all: rows.length,
      pending: rows.filter(row => this.isPending(row)).length,
      approved: rows.filter(row => this.isApproved(row)).length,
      rejected: rows.filter(row => this.isRejected(row)).length
    };
  });

  /** KPI values, also over `searchFiltered` (design.md §6.2), so the strip and the chips never
   *  disagree about what "the list" means. */
  readonly kpis = computed<BilateralReviewKpis>(() => {
    const rows = this.searchFiltered();
    const counts = this.chipCounts();
    return {
      projects: new Set(rows.map(row => row.project_name).filter(Boolean)).size,
      centers: new Set(rows.map(row => row.lead_center).filter(Boolean)).size,
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected
    };
  });

  /** Center chip strip (BRC-R-1..4, design.md §6.1): one entry per distinct `lead_center` present
   *  in `searchFiltered` — the SAME base the status chips/KPIs use, so counts are independent of
   *  the status chip and the popover filters (BRC-R-4). A center with zero pending rows still gets
   *  a chip (e.g. "IWMI 0", BRC-AC-1) as long as at least one of its rows is in the base. Blank
   *  `lead_center` rows are folded into a trailing "Not specified" bucket instead of being dropped
   *  (BRC-R-1) — its `code` is `UNASSIGNED_CENTER_CODE`, a param-safe sentinel (see its own doc —
   *  attempt 1 used `''`, which cannot survive the `?center=` csv round trip); `selectedCenterAcronyms`
   *  maps that sentinel back to `''`, which is exactly what `row.lead_center ?? ''` compares
   *  against, so selecting the bucket narrows to the blank rows and stays pressed across a
   *  merge-navigate. Sorted pending desc, acronym asc; the "Not specified" bucket is always last
   *  regardless of its count (BRC-R-1's "trailing", not "sorted-in"). */
  readonly centerStrip = computed<BilateralReviewCenterStripItem[]>(() => {
    const acronymToCode = this.acronymToCode();
    const pendingByAcronym = new Map<string, number>();
    let hasBlank = false;
    let blankPending = 0;

    for (const row of this.searchFiltered()) {
      const acronym = row.lead_center;
      if (!acronym) {
        hasBlank = true;
        if (this.isPending(row)) blankPending++;
        continue;
      }
      if (!pendingByAcronym.has(acronym)) pendingByAcronym.set(acronym, 0);
      if (this.isPending(row)) pendingByAcronym.set(acronym, pendingByAcronym.get(acronym)! + 1);
    }

    const items = [...pendingByAcronym.entries()]
      .map(([acronym, pending]) => ({ code: acronymToCode.get(acronym) ?? acronym, acronym, pending }))
      .sort((a, b) => b.pending - a.pending || a.acronym.localeCompare(b.acronym));
    if (hasBlank) items.push({ code: UNASSIGNED_CENTER_CODE, acronym: this.copy.centerStrip.notSpecified, pending: blankPending });
    return items;
  });

  /** Clicking a chip replaces the Center filter with exactly that center; clicking the pressed
   *  chip or All centers clears it (BRC-R-2) — the existing `centers` signal drives both the
   *  popover multiselect and the `?center=` URL sync (BRC-R-3), so no new state is introduced. */
  onCenterChipSelect(code: string | null): void {
    this.centers.set(code === null ? [] : [code]);
  }

  /** Status + popover filters applied on top of `searchFiltered`. */
  readonly visibleRows = computed<ResultToReview[]>(() => {
    const status = this.status();
    const projects = this.projects();
    const categories = this.categories();
    const centerAcronyms = this.selectedCenterAcronyms();

    return this.searchFiltered().filter(row => {
      if (status === 'pending' && !this.isPending(row)) return false;
      if (status === 'approved' && !this.isApproved(row)) return false;
      if (status === 'rejected' && !this.isRejected(row)) return false;
      if (centerAcronyms.length && !centerAcronyms.includes(row.lead_center ?? '')) return false;
      if (projects.length && !projects.includes(row.project_name ?? '')) return false;
      if (categories.length && !categories.includes(row.indicator_category ?? '')) return false;
      return true;
    });
  });

  /** BRP-R-11, design.md §6.1: rebuilds `BilateralReviewGroup[]` from `visibleRows` in whichever
   *  dimension `group()` selects, dropping groups left empty by filtering (defensive — filtering
   *  happens before this computed sees the rows). Project mode: insertion order, unchanged from
   *  before this generalization. Center mode: pending desc, acronym asc, the blank ("Not
   *  specified") bucket ALWAYS trailing regardless of its own pending count (BRC-R-1's rule,
   *  reused here — a center strip caption or a group header disagreeing on this ordering would be
   *  a genuine UX bug, not just an internal inconsistency). */
  readonly groups = computed<BilateralReviewGroup[]>(() => {
    const rows = this.visibleRows();
    return this.group() === 'center' ? this.buildCenterGroups(rows) : this.buildProjectGroups(rows);
  });

  /** Project mode: one group per distinct `project_name`, `caption = null`, `center` = the
   *  group's own distinct lead centers (comma-joined) — the project-mode "center chip" R-12 asks
   *  for. */
  private buildProjectGroups(rows: ResultToReview[]): BilateralReviewGroup[] {
    const byProject = new Map<string, BilateralReviewGroup>();
    for (const row of rows) {
      const key = row.project_name ?? '';
      if (!byProject.has(key)) byProject.set(key, { key, label: row.project_name ?? '', caption: null, center: null, results: [] });
      byProject.get(key)!.results.push(row);
    }
    for (const group of byProject.values()) group.center = this.distinctLeadCentersOf(group.results);
    return [...byProject.values()];
  }

  /** Center mode: one group per distinct `lead_center` acronym, `center = null`, `caption` = "N
   *  projects" (distinct `project_name` in the group). Blank `lead_center` rows fold into a
   *  trailing "Not specified" bucket keyed by the same param-safe `UNASSIGNED_CENTER_CODE`
   *  sentinel the center strip uses (BRC-R-1) — always LAST, even when its own pending count would
   *  otherwise out-rank another center (judgment-day JA-16). */
  private buildCenterGroups(rows: ResultToReview[]): BilateralReviewGroup[] {
    const byAcronym = new Map<string, ResultToReview[]>();
    const blank: ResultToReview[] = [];

    for (const row of rows) {
      const acronym = row.lead_center;
      if (!acronym) {
        blank.push(row);
        continue;
      }
      if (!byAcronym.has(acronym)) byAcronym.set(acronym, []);
      byAcronym.get(acronym)!.push(row);
    }

    const groups: BilateralReviewGroup[] = [...byAcronym.entries()]
      .map(([acronym, results]) => ({
        key: acronym,
        label: acronym,
        caption: this.copy.table.projectsCaption(this.distinctProjectCountOf(results)),
        center: null,
        results
      }))
      .sort((a, b) => this.pendingCountOf(b.results) - this.pendingCountOf(a.results) || a.label.localeCompare(b.label));

    if (blank.length) {
      groups.push({
        key: UNASSIGNED_CENTER_CODE,
        label: this.copy.centerStrip.notSpecified,
        caption: this.copy.table.projectsCaption(this.distinctProjectCountOf(blank)),
        center: null,
        results: blank
      });
    }
    return groups;
  }

  private distinctLeadCentersOf(rows: ResultToReview[]): string {
    const centers = new Set(rows.map(row => row.lead_center).filter((value): value is string => !!value));
    return [...centers].join(', ');
  }

  private distinctProjectCountOf(rows: ResultToReview[]): number {
    return new Set(rows.map(row => row.project_name).filter(Boolean)).size;
  }

  private pendingCountOf(rows: ResultToReview[]): number {
    return rows.filter(row => this.isPending(row)).length;
  }

  /** Flat view rows (BRT-R-30), sorted desc by `submission_date`. */
  readonly flatRows = computed<ResultToReview[]>(() =>
    [...this.visibleRows()].sort((a, b) => this.toSubmissionTime(b.submission_date) - this.toSubmissionTime(a.submission_date))
  );

  private toSubmissionTime(value: string | null | undefined): number {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  }

  // ── Filter popover option lists — derived from the LOADED rows (`tableResults`) ────────────
  readonly centerFilterOptions = computed<BilateralReviewFilterOption[]>(() => {
    const acronymToCode = this.acronymToCode();
    return optionsOf(this.results.tableResults(), row => row.lead_center).map(acronym => ({
      value: acronymToCode.get(acronym) ?? acronym,
      label: acronym
    }));
  });
  readonly projectFilterOptions = computed<BilateralReviewFilterOption[]>(() =>
    optionsOf(this.results.tableResults(), row => row.project_name).map(value => ({ value, label: value }))
  );
  readonly categoryFilterOptions = computed<BilateralReviewFilterOption[]>(() =>
    optionsOf(this.results.tableResults(), row => row.indicator_category).map(value => ({ value, label: value }))
  );

  /** BRP-R-5, design.md §6.1 (judgment-day L-2): the FIVE filter dimensions — search non-empty,
   *  status ≠ all (`onlyPending` is this dimension, not a second one), centers, projects,
   *  categories. `phase` (a scope) and `group`/`view` (view modes) never count. Recomputed here in
   *  place of the prior three-dimension reading (centers/projects/categories only) — the single
   *  source both the Filter popover badge and the new toolbar "Clear filters · N" button read. */
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.search().trim()) count++;
    if (this.status() !== 'all') count++;
    if (this.centers().length) count++;
    if (this.projects().length) count++;
    if (this.categories().length) count++;
    return count;
  });
  readonly filtersActive = computed(() => this.activeFilterCount() > 0);

  // ── View states (BRT-R-31) — mutually exclusive ────────────────────────────────────────────
  /** BRC-R-5/AC-14: a phase-catalogue request failure, OR the catalogue settling with genuinely no
   *  resolvable current phase, is a hard error at the tab level — deliberately NOT gated on
   *  `!loading()` (unlike a plain list-load `error()`): when the phase itself can never resolve,
   *  the list effect never fires, so `loading()` would otherwise stay `true` forever and this
   *  state could never show (the exact "indefinite skeleton" AC-14 forbids). `showSkeleton` below
   *  excludes `showError()` explicitly instead, keeping the four states mutually exclusive. */
  readonly showError = computed(() => this.error() || this.phaseCatalogState() === 'failed' || this.currentPhaseUnresolvable());
  readonly showSkeleton = computed(() => !this.showError() && this.loading() && this.results.tableResults().length === 0);
  readonly showWholeEmpty = computed(() => !this.showError() && !this.loading() && this.results.tableResults().length === 0);
  readonly showFilteredEmpty = computed(
    () => !this.showError() && !this.loading() && this.results.tableResults().length > 0 && this.visibleRows().length === 0
  );
  readonly showContent = computed(() => !this.showSkeleton() && !this.showError() && !this.showWholeEmpty() && !this.showFilteredEmpty());

  constructor() {
    // ── Pinned chrome height (BRV-T-1, BRV-R-2): wires the ResizeObserver exactly once, the first
    // change-detection pass both view-child refs resolve on. `untracked` — this effect's own
    // dependencies are the two viewChild signals, never anything the observer itself writes. ──────
    effect(() => {
      const wrapperEl = this.pinnedWrapper()?.nativeElement;
      const workAreaEl = this.workAreaEl();
      if (!wrapperEl || !workAreaEl || this.pinnedResizeObserver) return;
      untracked(() => this.observePinnedHeight(wrapperEl, workAreaEl));
    });

    // ── Phase catalogue (BRC-T-1, judgment-day L-1): seed already covers the common case (the
    // shell fetched it before this tab mounted); the Subject subscription catches a still-in-flight
    // fetch; the fallback below covers "the catalogue is empty and nothing is coming". ──────────
    if (typeof this.phasesSE.getPhasesObservable === 'function') {
      const phasesSub = this.phasesSE.getPhasesObservable().subscribe(list => {
        this.reportingPhases.set(list ?? []);
        this.phaseCatalogState.set('ready');
      });
      this.destroyRef.onDestroy(() => phasesSub.unsubscribe());
    }
    if (this.reportingPhases().length === 0) this.fetchPhaseCatalogFallback();

    // ── Load: entity details — one request per programme CODE, never re-fired by a phase switch
    // (BRC-R-5 "entity details are not re-fetched") ───────────────────────────────────────────
    effect(() => {
      const code = this.programmeCode();
      untracked(() => {
        if (!code) return;
        this.results.entityId.set(code);
        this.results.getEntityDetails();
      });
    });

    // ── URL → state (guarded, `untracked`, same bridge as `my-work-board`). MUST run — i.e. be
    // REGISTERED — before the list-loading effect below: effects flush in registration order, and
    // the list effect's `selectedVersionId()` reads `phaseParam()`, which this effect writes. With
    // the order reversed, the very first flush would resolve `selectedVersionId` to the CURRENT
    // phase (phaseParam still at its initial `null`) before this effect ever set it from `?phase=`
    // — firing one throwaway request and (worse) writing a stale badge count under the current
    // phase's cache key. ───────────────────────────────────────────────────────────────────────
    effect(() => {
      const params = this.queryParams();
      untracked(() => {
        const search = params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.search) ?? '';
        if (search !== this.search()) this.search.set(search);

        const status = parseBilateralReviewStatus(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.status));
        if (status !== this.status()) this.status.set(status);

        const view = parseBilateralReviewView(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.view));
        if (view !== this.view()) this.view.set(view);

        const centers = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.center));
        if (!sameBilateralReviewList(centers, this.centers())) this.centers.set(centers);

        const projects = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.project));
        if (!sameBilateralReviewList(projects, this.projects())) this.projects.set(projects);

        const categories = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.category));
        if (!sameBilateralReviewList(categories, this.categories())) this.categories.set(categories);

        const phaseRaw = params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.phase);
        if (phaseRaw !== this.phaseParamRaw()) this.phaseParamRaw.set(phaseRaw);
        const phase = parseBilateralReviewPhase(phaseRaw);
        if (phase !== this.phaseParam()) this.phaseParam.set(phase);

        const groupRaw = params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.group);
        if (groupRaw !== this.groupParamRaw()) this.groupParamRaw.set(groupRaw);
        const group = parseBilateralReviewGroupMode(groupRaw);
        if (group !== this.group()) this.group.set(group);
      });
    });

    // ── Load: review list — programme code + the SELECTED phase (BRC-R-5). Skips while either
    // has not resolved: no unscoped fetch, no fetch before the phase is known. ─────────────────
    let previousListCode: string | null = null;
    let previousListVersionId: number | null = null;
    effect(() => {
      const code = this.programmeCode();
      const versionId = this.selectedVersionId();
      untracked(() => {
        if (!code || versionId === null) return;
        // Clear the previous list before issuing the new fetch (Reliability fix, BRT-T-3 rework) —
        // a deliberate flash of empty table rather than a stale prior list under the new hero.
        this.results.tableData.set([]);
        this.results.tableResults.set([]);
        // BRC-R-7: a phase switch on the SAME program (not a program switch, not the first load)
        // re-expands every group and bumps the nonce.
        if (previousListCode === code && previousListVersionId !== null && previousListVersionId !== versionId) {
          this.allExpanded.set(true);
          this.expandAllNonce.update(n => n + 1);
        }
        previousListCode = code;
        previousListVersionId = versionId;
        this.loadResults(code, versionId);
      });
    });

    if (!this.centersSE.centers().length) void this.centersSE.getData();

    // ── State → URL (`replaceUrl`, `merge`) ────────────────────────────────────────────────────
    effect(() => {
      const search = this.search();
      const status = this.status();
      const view = this.view();
      const center = joinBilateralReviewListParam(this.centers());
      const project = joinBilateralReviewListParam(this.projects());
      const category = joinBilateralReviewListParam(this.categories());

      untracked(() => {
        const current = this.route.snapshot.queryParamMap;
        const next: Record<string, string | null> = {
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.search]: search || null,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.status]: status === 'all' ? null : status,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.view]: view === 'grouped' ? null : view,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.center]: center,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.project]: project,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.category]: category
        };
        const changed = Object.entries(next).some(([key, value]) => (current.get(key) ?? null) !== (value ?? null));
        if (!changed) return;

        this.router.navigate([], { relativeTo: this.route, queryParams: next, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });

    // ── Unknown/invalid `?phase=` → rewrite to the current phase (BRC-R-7, AC-7). `phaseParamRaw`
    // (not `phaseParam`) gates whether there is anything to judge at all — a present-but-unparseable
    // value (Reviewer-found defect: e.g. the Results tab's own `?phase=Reporting%202026` label,
    // reachable via any `queryParamsHandling="preserve"` band tab link) also parses to `phaseParam
    // === null`, which must NOT be read as "no override" here or the stale label never gets
    // rewritten. Waits for the catalogue to actually have entries before judging a param "unknown"
    // — otherwise a valid `?phase=Q` would get rewritten away during the brief window before the
    // catalogue loads. ─────────────────────────────────────────────────────────────────────────
    effect(() => {
      const raw = this.phaseParamRaw();
      const param = this.phaseParam();
      const current = this.currentPhaseId();
      const known = this.knownPhases();
      if (raw === null || current === null || known.length === 0) return;
      if (param !== null && known.some(p => p.id === param)) return; // valid AND known → nothing to rewrite
      untracked(() => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [BILATERAL_REVIEW_QUERY_PARAM_MAP.phase]: current },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });
    });

    // ── Present-but-invalid `?group=` → strip the key (BRP-R-11's "invalid → project, param
    // removed"). Absent (`raw === null`) is left alone — that IS the "project" default, no key to
    // strip. A valid `'project'`/`'center'` value is also left alone here; the "state → URL" effect
    // below never touches `group` at all (only `setGroup()` writes it), so an explicit `?group=
    // project` round-trips until the user picks something else. ─────────────────────────────────
    effect(() => {
      const raw = this.groupParamRaw();
      if (raw === null || raw === 'project' || raw === 'center') return;
      untracked(() => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [BILATERAL_REVIEW_QUERY_PARAM_MAP.group]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });
    });

    // ── Deep-linked drawer open (BRT-R-21, BRC-R-10) — fires once the phase-scoped list SETTLES,
    // not on "rows non-empty" (judgment-day L-4: a phase-scoped list may legitimately be empty). ─
    effect(() => {
      const settled = this.listSettled();
      if (!settled || !this.pendingReviewResultCode) return;
      untracked(() => {
        const code = this.pendingReviewResultCode;
        this.pendingReviewResultCode = null;
        const rows = this.results.tableResults();
        // Prefer the object from the list (it is complete). A result that is not part of the
        // review list (e.g. a draft still being edited, or another phase's result) falls back to a
        // minimal object built from the id, which is all the drawer needs to load its detail.
        const match = rows.find(row => String(row.result_code) === String(code));
        const target = match ?? (this.pendingReviewResultId ? ({ id: this.pendingReviewResultId, result_code: code } as ResultToReview) : null);
        if (target) this.onOpenResult(target);
        // `merge` preserves the six filter keys (search/status/center/project/category/view) +
        // `phase` written by the state → URL effects above — only reviewResult/reviewResultId are
        // cleared.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [REVIEW_RESULT_QUERY_PARAM]: null, [REVIEW_RESULT_ID_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });
    });

    // ── Filter band: keep `isNarrow` in step with the stylesheet's own breakpoint (BRP-T-1, copy of
    // `my-work-board.component.ts:695-706`). `addEventListener` is the modern MediaQueryList API;
    // Safari < 14 (and some jsdom builds) only expose the deprecated `addListener` — both handled
    // and both torn down. ──────────────────────────────────────────────────────────────────────
    const centersNarrowMql = this.narrowQuery;
    if (centersNarrowMql) {
      const onNarrowChange = (event: MediaQueryListEvent) => this.isNarrow.set(event.matches);
      if (typeof centersNarrowMql.addEventListener === 'function') {
        centersNarrowMql.addEventListener('change', onNarrowChange);
        this.destroyRef.onDestroy(() => centersNarrowMql.removeEventListener('change', onNarrowChange));
      } else if (typeof centersNarrowMql.addListener === 'function') {
        centersNarrowMql.addListener(onNarrowChange);
        this.destroyRef.onDestroy(() => centersNarrowMql.removeListener(onNarrowChange));
      }
    }

    // ── BRP-R-21 one-shot: auto-expand the centers row exactly once when the user lands with
    // `?center=` already set (one center) AND the row would otherwise be collapsed by the `> 6 or
    // narrow` DEFAULT — never by their own stored choice (AC-14). Waits for the list to SETTLE (same
    // readiness signal the deep-linked-drawer effect above uses) so `centerStrip()` reflects the
    // loaded rows, not an empty cold-boot value, before judging "collapsed by default". Consumes
    // itself after the first settle no matter what it decides — a later `?center=` change (e.g. the
    // user picking a different center from the popover) must NOT re-trigger it. ──────────────────
    let centersOneShotDone = false;
    effect(() => {
      if (centersOneShotDone) return;
      const settled = this.listSettled();
      const centers = this.centers();
      if (!settled) return;
      centersOneShotDone = true;
      untracked(() => {
        if (this.storedCentersExpanded() !== null) return;
        if (centers.length !== 1) return;
        if (this.centerStrip().length > 6 || this.isNarrow()) this.oneShotExpanded.set(true);
      });
    });
  }

  /** BRV-R-2: keeps `--brv-pinned-h` in step with the pinned wrapper's real rendered height (same
   *  pattern as `app.component.ts`'s shell-header observer) — guarded for jsdom (no `ResizeObserver`
   *  in the Jest environment; the SCSS's own `130px` fallback covers that case there, and CT, which
   *  DOES have `ResizeObserver`, exercises the live value). Runs once per mount (guarded by the
   *  caller effect above); torn down on destroy. */
  private observePinnedHeight(wrapperEl: HTMLElement, workAreaEl: HTMLElement): void {
    const update = () => {
      const height = Math.round(wrapperEl.getBoundingClientRect().height);
      workAreaEl.style.setProperty('--brv-pinned-h', `${height}px`);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    this.pinnedResizeObserver = new ResizeObserver(update);
    this.pinnedResizeObserver.observe(wrapperEl);
    this.destroyRef.onDestroy(() => this.pinnedResizeObserver?.disconnect());
  }

  /** Fallback catalogue fetch (BRC-R-5/AC-14): same request + filter `PhasesService.getNewPhases()`
   *  itself uses. Normally only writes `reportingPhases` if nothing else (the seed, or the
   *  Subject) already populated it in the meantime; `force` (used by `retry()`) always adopts the
   *  fresh response — a Retry after "catalogue settled with no open phase" must actually re-check
   *  reality, not discard a response that now DOES contain one just because the list was already
   *  non-empty. */
  private fetchPhaseCatalogFallback(force = false): void {
    this.phaseCatalogState.set('pending');
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe({
      next: ({ response }: { response?: Phases[] }) => {
        if (force || this.reportingPhases().length === 0) {
          const reporting = (response ?? []).filter((item: Phases) => item.app_module_id == 1); // eslint-disable-line eqeqeq -- wire may send a numeric string
          this.reportingPhases.set(reporting);
        }
        this.phaseCatalogState.set('ready');
      },
      error: () => {
        this.phaseCatalogState.set('failed');
      }
    });
  }

  /** THE single list entry point (initial load, `retry()`, `onDecisionMade()` — BRC-R-5): every
   *  call carries the given `versionId`. `setFromRows` only fires when that versionId is the
   *  CURRENT phase (BRC-R-6, BRC-DD-2) — the count service itself knows no "current". */
  private loadResults(code: string, versionId: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.listSettled.set(false);
    this.api.resultsSE.GET_ResultToReview(code, undefined, versionId).subscribe({
      next: (res: { response?: GroupedResult[] }) => {
        const groups = Array.isArray(res?.response) ? res.response : [];
        this.results.tableData.set(groups);
        const rows = groups.flatMap(group => group.results ?? []);
        this.results.tableResults.set(rows);
        if (this.currentPhaseId() !== null && Number(versionId) === this.currentPhaseId()) {
          this.countService.setFromRows(code, versionId, rows);
        }
        this.loading.set(false);
        this.decisionInFlight.set(false);
        this.listSettled.set(true);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.decisionInFlight.set(false);
      }
    });
  }

  /** BRC-R-5/AC-14: re-attempts the phase catalogue too — both when the fetch itself failed AND
   *  when it settled with no resolvable current phase (`currentPhaseUnresolvable`) — alongside the
   *  list. `force: true` so a genuinely fresh response is adopted even though `reportingPhases`
   *  is already non-empty (see `fetchPhaseCatalogFallback`'s doc).
   *
   *  The list re-fetch itself is manual ONLY when the phase was ALREADY resolvable before this
   *  call — the ordinary "the list request failed, the phase was fine all along" retry, where the
   *  list-loading effect's dependencies do not change and so it will not refire on its own. When
   *  the phase was UNRESOLVED before this call (`currentPhaseUnresolvable()`), the catalogue
   *  re-fetch above may resolve it synchronously (`fetchPhaseCatalogFallback`'s `next` handler runs
   *  inline for a synchronous `Observable`) — that resolution is exactly what the list-loading
   *  effect above already reacts to, so firing `loadResults` here TOO would duplicate the request
   *  the moment the phase resolves. */
  retry(): void {
    const versionIdBeforeRetry = this.selectedVersionId();
    if (this.phaseCatalogState() === 'failed' || this.currentPhaseUnresolvable()) this.fetchPhaseCatalogFallback(true);
    const code = this.programmeCode();
    if (code && versionIdBeforeRetry !== null) this.loadResults(code, versionIdBeforeRetry);
  }

  /** BRT-R-13: after the drawer emits a decision, re-fetch with the SAME `loadResults` the
   *  initial load uses — one request refreshes rows, chip counts, KPI cards AND (via
   *  `countService.setFromRows`, when the selected phase is the current one — BRC-R-6) the tab
   *  badge, with no second request and no navigation. The drawer closes itself (its own `visible`
   *  model), search/status/filters/view/phase are untouched. */
  onDecisionMade(): void {
    const code = this.programmeCode();
    const versionId = this.selectedVersionId();
    if (!code || versionId === null) return;
    this.decisionInFlight.set(true);
    this.loadResults(code, versionId);
  }

  // ── Search / status / view / expand ────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.search.set(value);
  }

  setStatus(status: BilateralReviewStatusFilter): void {
    this.status.set(status);
  }

  toggleOnlyPending(): void {
    this.status.set(this.onlyPending() ? 'all' : 'pending');
  }

  setView(view: BilateralReviewViewMode): void {
    this.view.set(view);
  }

  /** BRP-R-11: switches the grouped view's grouping dimension. A direct, single
   *  `router.navigate` (mirrors `setPhase()`) — deliberately NOT a plain signal write left for the
   *  reactive "state → URL" effect above to pick up, so this method's own contract ("one navigate,
   *  no nonce bump, no request") is provable in isolation rather than entangled with that effect's
   *  five-key write. Writes `group` directly too so the table's `groups`/`groupMode` inputs update
   *  in the SAME change-detection pass the navigate's (synchronous) URL write does — the URL is the
   *  source of truth on the next hydrate, this just avoids a redundant extra tick. Bumps NEITHER
   *  `expandAllNonce` nor `allExpanded` (judgment-day L-4) — the table's own per-mode collapse
   *  memory (namespaced by `groupMode`) is what survives the round trip, not a forced expand-all. */
  setGroup(mode: BilateralReviewGroupMode): void {
    this.group.set(mode);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [BILATERAL_REVIEW_QUERY_PARAM_MAP.group]: mode === 'project' ? null : mode },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  toggleExpandAll(): void {
    this.allExpanded.update(expanded => !expanded);
    this.expandAllNonce.update(nonce => nonce + 1);
  }

  /** Row action (BRT-R-12): opens the existing review drawer via the relocated service's models. */
  onOpenResult(row: ResultToReview): void {
    this.results.currentResultToReview.set(row);
    this.results.showReviewDrawer.set(true);
  }

  // ── Cycle select (BRC-T-1, BRC-R-7) ────────────────────────────────────────────────────────
  /** `(changed)` handler for the popover Cycle select. A no-op when the value is unchanged or not
   *  a real number (BRC-AC-8b): `app-pr-filter-select.pick()` toggles to its `emptyValue` (default
   *  `'all'`) when the SAME option is re-picked — this guard rejects that `NaN`-after-`Number()`
   *  emit as well as a genuine repeat of the current numeric id. Deliberately NOT bound via
   *  `[emptyValue]="selectedVersionId()"`: that binding would make the shared component's own
   *  `hasValue` getter (`value !== emptyValue`) permanently false, so the trigger would never show
   *  the phase name — a straight contradiction of BRC-AC-6. Writes `?phase=` only on an actual
   *  change; picking the current phase clears the param instead of writing it explicitly (same
   *  "empty removes the key" convention the other five filter dimensions use). */
  setPhase(id: number): void {
    const next = Number(id);
    if (Number.isNaN(next) || next === this.selectedVersionId()) {
      // Leader-found defect: re-sync the child's OWN displayed value — see the `cycleSelect`
      // field doc above. `writeValue` is a public CVA method; it re-renders the child (its own
      // `cdr.markForCheck()`) without touching this page's state or issuing any request/navigation.
      this.cycleSelect()?.writeValue(this.selectedVersionId());
      return;
    }
    this.phaseParam.set(next === this.currentPhaseId() ? null : next);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [BILATERAL_REVIEW_QUERY_PARAM_MAP.phase]: next === this.currentPhaseId() ? null : next },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // ── Filter popover ──────────────────────────────────────────────────────────────────────────
  toggleFilterPopover(event: Event): void {
    event.stopPropagation();
    this.filterPopoverOpen.update(open => !open);
  }

  closeFilterPopover(): void {
    this.filterPopoverOpen.set(false);
  }

  /** Clears the Center / Bilateral project / Indicator category popover filters only — the
   *  popover header's own "Clear filters" link calls this (BRT-R-8, kept per BRP-R-5: "the popover
   *  header clear and the empty-state clear stay"); search and the status chip are independent
   *  dimensions with their own controls. The TOOLBAR's own clear control is `clearEverything()`
   *  below, since BRP-T-1 replaced the old unconditional toolbar button. */
  clearFilters(): void {
    this.centers.set([]);
    this.projects.set([]);
    this.categories.set([]);
  }

  /** The filtered-empty state's "Clear filters" (BRT-R-31): whatever combination of search,
   *  status and popover filters emptied the list, this restores it in one click. */
  clearAllFilters(): void {
    this.search.set('');
    this.status.set('all');
    this.clearFilters();
  }

  /** Toolbar "Clear filters · N" (BRP-R-5, AC-5, judgment-day L-2): resets the FIVE filter
   *  dimensions in exactly ONE explicit `router.navigate` — deliberately NOT the reactive
   *  "state → URL" effect above (registered in the constructor), which always writes `view` too and
   *  would make this a wider navigate than the spec allows. The five keys removed here round-trip
   *  back through the existing "URL → state" effect (same as any other navigation) to actually reset
   *  `search`/`status`/`centers`/`projects`/`categories` — setting those signals here directly would
   *  just re-trigger that reactive effect and fire a SECOND, `view`-inclusive navigate. `phase`,
   *  `group` and `view` are never touched (no key at all, not even `null`), and none of the five
   *  keys removed here is read by the list-loading effect, so no request results. */
  clearEverything(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [BILATERAL_REVIEW_QUERY_PARAM_MAP.search]: null,
        [BILATERAL_REVIEW_QUERY_PARAM_MAP.status]: null,
        [BILATERAL_REVIEW_QUERY_PARAM_MAP.center]: null,
        [BILATERAL_REVIEW_QUERY_PARAM_MAP.project]: null,
        [BILATERAL_REVIEW_QUERY_PARAM_MAP.category]: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: Event): void {
    const target = event?.target as HTMLElement | null;
    if (typeof target?.closest === 'function' && target.closest('.brt-filter-container')) return;
    if (target && typeof document !== 'undefined' && document.contains && !document.contains(target)) return;
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }
}
