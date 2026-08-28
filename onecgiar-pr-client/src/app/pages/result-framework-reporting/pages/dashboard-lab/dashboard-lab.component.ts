import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress, Version } from '../../../../shared/interfaces/SP-progress.interface';
import { ApiService } from '../../../../shared/services/api/api.service';
import { Unit } from '../entity-details/interfaces/entity-details.interface';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { HighlightSearchPipe } from './pipes/highlight-search.pipe';
import {
  comparePlannedSearchEvaluation,
  indicatorSearchHaystack,
  parsePlannedSearch,
  plannedSearchEvaluate,
  type PlannedSearchEvaluation
} from './pipes/planned-search.util';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { GuidedCreationComponent } from './components/guided-creation/guided-creation.component';
import { IndicatorDrawerComponent } from './components/indicator-drawer/indicator-drawer.component';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './components/reporting-aow-table/reporting-aow-table.component';
import { buildReportModalNode } from './components/reporting-aow-table/report-modal-context.util';
import { ReportingProgramBandComponent } from './components/reporting-program-band/reporting-program-band.component';
import { AowHloCreateModalComponent } from '../entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { ResultCreatorModule } from '../../../results/pages/result-creator/result-creator.module';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { isAvisaInitiative } from '../../../../shared/utils/avisa-initiative.util';
import {
  ProgramOverviewComponent,
  StatusSegment as OverviewStatusSegment,
  AowProgressRow as OverviewAowProgressRow,
  CategoryBar as OverviewCategoryBar,
  OverviewCenterBar,
  OverviewLink,
  HeatmapModel
} from './components/program-overview/program-overview.component';
import { buildTocMapModel, TocMapModel } from './dashboard-lab.toc-map';
import { PROGRAMME_RESULTS_QUERY_PARAM_MAP } from '../programme-results/services/programme-results-query-params';
import { ResultToReview } from '../bilateral-results/components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { ReportingGuideService, TutorialId } from './services/reporting-guide.service';
import { HlmButton } from '@spartan/button';

/**
 * Reporting-status meter — the reference's five canonical states, in this exact order.
 * PRMS phase statuses map onto them: 5 "Pending" is a result nobody has opened yet, i.e.
 * "Not started"; 6 "Approved" has no rows in PRMS today but the reference always prints
 * "Approved 0", so the meter renders this fixed list rather than whatever the API returns.
 * Colours come from the `--pr-status-*` tokens, which already match the mockup's palette.
 */
const OVERVIEW_STATUS_SLOTS: { key: string; label: string; statusId: number; bg: string; fg: string }[] = [
  {
    key: 'not-started',
    label: 'Not started',
    statusId: 5,
    bg: 'var(--pr-status-not-started-bg)',
    fg: 'var(--pr-status-not-started-fg)'
  },
  {
    key: 'in-progress',
    label: 'In progress',
    statusId: 1,
    bg: 'var(--pr-status-in-progress-bg)',
    fg: 'var(--pr-status-in-progress-fg)'
  },
  {
    key: 'submitted',
    label: 'Submitted',
    statusId: 3,
    bg: 'var(--pr-status-submitted-bg)',
    fg: 'var(--pr-status-submitted-fg)'
  },
  { key: 'in-qa', label: 'In QA', statusId: 2, bg: 'var(--pr-status-in-qa-bg)', fg: 'var(--pr-status-in-qa-fg)' },
  {
    key: 'approved',
    label: 'Approved',
    statusId: 6,
    bg: 'var(--pr-status-approved-bg)',
    fg: 'var(--pr-status-approved-fg)'
  }
];

/**
 * Discontinued is not one of the reference's five states, but hiding real rows would make the
 * meter lie about the total — so it is appended after Approved, and only when it has rows.
 */
const OVERVIEW_DISCONTINUED_SLOT = {
  key: 'discontinued',
  label: 'Discontinued',
  statusId: 4,
  bg: 'var(--pr-status-not-started-bg)',
  fg: 'var(--pr-status-not-started-fg)'
};


/**
 * `Status.statusName → 'Editing'` etc. is the real Results-tab vocabulary and already arrives on
 * the wire — this fallback only guards against a missing/empty field (`OVW-DD-2`). Never used to
 * override a non-empty `statusName`.
 */
const OVERVIEW_STATUS_NAME_FALLBACK: Record<number, string> = {
  1: 'Editing',
  2: 'Quality Assessed',
  3: 'Submitted',
  4: 'Discontinued',
  5: 'Pending Review',
  6: 'Approved',
  7: 'Rejected',
  8: 'Draft'
};

/** Science-Program role id for "Primary submitter" on a bilateral result. The wire sends a STRING. */
const BILATERAL_PRIMARY_ROLE_ID = '1';

/** `source_name` for W3/Bilateral results — the exact, PLURAL string the Results tab filters on. */
const BILATERAL_ORIGIN = 'W3/Bilaterals';

/** "Intermediate Outcomes" → "Intermediate outcomes" (the reference uses sentence case). */
function sentenceCaseOutcomes(name: string): string {
  return (name ?? '').replace(/\bOutcomes\b/g, 'outcomes');
}

/** Vibrant, high-contrast palette for the status charts (no pastels). */
const STATUS_COLOR: Record<number, string> = {
  1: '#f59e0b', // Editing — amber
  2: '#3b82f6', // QAed — blue
  3: '#22c55e', // Submitted — green
  4: '#ef4444', // Discontinued — red
  5: '#94a3b8' // Pending — slate
};
const STATUS_LABEL: Record<number, string> = {
  1: 'Editing',
  2: 'QAed',
  3: 'Submitted',
  4: 'Discontinued',
  5: 'Pending'
};
const STATUS_ORDER: Record<number, number> = { 2: 1, 3: 2, 5: 3, 1: 4, 4: 5 };
const REPORTED_STATUS_IDS = [2, 3];
const FALLBACK_ACCENT = '#f2660d';

interface StatusRow {
  statusId: number;
  label: string;
  count: number;
  color: string;
  order: number;
  /** Height share relative to the tallest bar (0–100). */
  barPct: number;
  /** Share of the total (0–100), for the stacked breakdown bar. */
  sharePct: number;
  /** Subtle top-lit gradient for the bar fill. */
  barGradient: string;
}

/** Compact AoW row for the Dashboard leadership overview. */
interface AowProgressRow {
  code: string;
  name: string;
  progress: number;
  editing: number;
  submitted: number;
  total: number;
}

/**
 * One indicator category (result type) with its reporting counts. `qualityAssessed`, `others` and
 * `totalResults` were already on the wire but unused; widened for the `OVW-T-3` heatmap (`others`
 * is the undecomposable statuses-4–8 bucket — requirements.md §2 discovery table).
 */
interface IndicatorCategory {
  resultTypeId: number;
  resultTypeName: string;
  editing: number;
  submitted: number;
  qualityAssessed: number;
  others: number;
  totalResults: number;
}

/**
 * Sentinel codes for program-level outcome buckets. The units endpoint never returns
 * them (SQL filters `category IN ('OUTPUT','OUTCOME')`; 2030 items are `EOI`), so the
 * old entity-aow sidebar hardcodes them too. Each has its own endpoint and renders as a
 * top-level sibling of the Areas of Work list — not nested under an AoW.
 */
const OUTCOMES_2030_CODE = '2030-outcomes';
const INTERMEDIATE_OUTCOMES_CODE = 'intermediate-outcomes';

const OUTPUT_NAMES = ['Innovation development', 'Knowledge product', 'Capacity sharing for development', 'Other output'];
const OUTCOME_NAMES = ['Innovation use', 'Policy change', 'Other outcome'];

/** Accent palette derived from a program's icon dominant color. */
interface AccentTheme {
  solid: string;
  soft: string;
  gradient: string;
  glow: string;
  buttonShadow: string;
  cardShadow: string;
}

/** Planned ToC browse modes persisted in `?tocView=`. */
type PlannedBrowseView = 'aows' | 'byAow' | 'indicators';

function parsePlannedBrowseView(raw: string | null | undefined): PlannedBrowseView | null {
  if (raw === 'aows' || raw === 'byAow' || raw === 'indicators') return raw;
  if (raw === 'aow') return 'byAow'; // short alias
  return null;
}

/** Which RFR section surface to render (from route `data.rfrView`). */
export type RfrView = 'dashboard' | 'overview' | 'planned' | 'emerging' | 'centers';

/**
 * DASHBOARD LAB (experimental) — route: /result-framework-reporting/dashboard-lab
 *
 * Isolated sandbox exploring a master–detail layout for the reporting home:
 * a premium left sidebar lists the Science Programs; the right panel is a bento
 * grid of metadata cards for the selected program. The accent color is derived
 * at runtime from each program's icon (dominant vibrant color). Consumes the
 * REAL Science Programs API through the existing home service — no new endpoints.
 */
@Component({
  selector: 'app-dashboard-lab',
  standalone: true,
  imports: [
    RouterLink,
    CustomFieldsModule,
    DecimalPipe,
    GuidedCreationComponent,
    IndicatorDrawerComponent,
    HighlightSearchPipe,
    ReportingAowTableComponent,
    ReportingProgramBandComponent,
    ProgramOverviewComponent,
    HlmButton,
    // Legacy reporting surfaces reused VERBATIM — the drawer/guided copies stay in the tree but are
    // no longer the ones users reach (see `openLegacyReportModal` / `openReportModal`).
    AowHloCreateModalComponent,
    PrDialogComponent,
    ResultCreatorModule
  ],
  templateUrl: './dashboard-lab.component.html',
  styleUrls: ['./dashboard-lab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLabComponent implements OnInit, OnDestroy {
  readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly api = inject(ApiService);
  // Public: the template reads reportingCurrentPhase for the band's cycle eyebrow.
  readonly dataControlSE = inject(DataControlService);
  private readonly guideSE = inject(ReportingGuideService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly phasesSE = inject(PhasesService);
  /**
   * Public: the template reads `showReportResultModal()` to mount the legacy report modal, which has
   * ZERO inputs/outputs and is driven entirely by this root-scoped service.
   */
  readonly entityAowService = inject(EntityAowService);
  /**
   * Injected for its CONSTRUCTOR side effect, not for its API: it fetches the result types and fills
   * `ResultsListFilterService.filters.resultLevel`, which is where the legacy modal's "Indicator
   * category" dropdown gets its options for indicators that carry no `result_type_id`. `aow-hlo-table`
   * injects it for exactly this reason; without it that dropdown opens empty and cannot be submitted.
   * It also owns `resultBody` / `cleanData()` for the emerging-result form below.
   */
  private readonly resultLevelSE = inject(ResultLevelService);

  /**
   * Reporting phases with their start / end dates.
   *
   * Claimed by `phaseSelectorOptions` below (`changes/overview-phase-filter` OPF-T-4, Reviewer
   * remediation): `sp.versions` from the shared default payload carries only ONE row per program
   * (the server pins `filters.versionId` to the effective phase before querying — `results.service.ts`
   * ~:1818-1823), so it can never list a program's other phases. This catalogue — already fetched
   * app-wide by `PhasesService`, filtered here to the selected program's own portfolio — is the
   * only source that actually has every phase.
   */
  private readonly reportingPhases = signal<Phases[]>(this.phasesSE.phases.reporting ?? []);

  /** Sidebar section mode — Dashboard = leadership metrics; others = that card only. */
  readonly rfrView = toSignal(
    this.route.data.pipe(map(d => (d['rfrView'] as RfrView) || 'dashboard')),
    { initialValue: (this.route.snapshot.data['rfrView'] as RfrView) || 'dashboard' }
  );
  readonly showDashboardChrome = computed(() => this.rfrView() === 'dashboard');
  /** Dedicated sidebar surfaces only — not shown on the Dashboard bento. */
  readonly showOverview = computed(() => this.rfrView() === 'overview');
  readonly showPlanned = computed(() => this.rfrView() === 'planned');
  /**
   * The two tabs of the program shell. They share the band, so they also share its layout
   * contract: full-bleed band, no outer gutters, 32px content pad owned by the tab itself.
   */
  readonly isProgramShell = computed(() => this.showOverview() || this.showPlanned());
  readonly showEmerging = computed(() => this.rfrView() === 'emerging');
  readonly showCenters = computed(() => this.rfrView() === 'centers');
  /** AOW code read from the URL on load, opened once its program's AOWs arrive. */
  private pendingAow: string | null = null;
  /** AOW filters read from the URL, applied right after the AOW reopens (openAow
   *  clears filters, so they must be restored last). */
  private pendingFilters: { typ: string | null; st: string | null; q: string } | null = null;
  /** Planned By AOW selection from `?tocAow=`, applied once the AoW list is ready. */
  private pendingPlannedAow: string | null = null;
  /** Skip echoing Planned URL params while hydrating from the query string. */
  private restoringPlannedUrl = false;

  /**
   * Always on a program surface. Lands on the user's first My Program when the
   * list loads (unless `?sp=` already points at one).
   */
  readonly scope = signal<'overview' | 'program'>('program');

  /** Currently selected program id; null until My Programs (or `?sp=`) resolve. */
  readonly selectedId = signal<number | null>(null);
  /**
   * Overview phase selector (`OPF-R-2`/`OPF-R-4`, `changes/overview-phase-filter`). `null` = follow
   * the Open phase (today's behavior, unchanged). Reset to `null` on program change and on init
   * (design.md DD-5) — see the "Load the selected program's Areas of Work" effect below.
   */
  readonly selectedVersionId = signal<number | null>(null);
  /** Free-text filter for the sidebar list. */
  readonly query = signal<string>('');
  /** The rail's search is collapsed to an icon; this opens the floating input. */
  readonly searchOpen = signal(false);
  /** Program codes whose SP icon failed to load → render the fallback glyph. */
  readonly iconErrors = signal<Set<string>>(new Set());
  /** Dominant accent color extracted from each program's icon, keyed by code. */
  readonly accentColors = signal<Map<string, string>>(new Map());

  /** Areas of Work cached by program code (signal-backed for template reactivity). */
  readonly aowsByCode = signal<Map<string, Unit[]>>(new Map());
  private readonly loadingCodes = signal<Set<string>>(new Set());

  /** AOWs + loading state for the currently selected program. */
  readonly aows = computed(() => {
    const code = this.selected()?.initiativeCode;
    return code ? this.aowsByCode().get(code) ?? [] : [];
  });
  readonly loadingAows = computed(() => {
    const code = this.selected()?.initiativeCode;
    return !!code && this.loadingCodes().has(code) && !this.aowsByCode().has(code);
  });

  /** Sidebar hover flyout (interactive): hovered program, its AOWs, vertical anchor. */
  readonly hoveredProgram = signal<SPProgress | null>(null);
  readonly hoverTop = signal<number>(0);
  readonly hoveredAows = computed(() => {
    const code = this.hoveredProgram()?.initiativeCode;
    return code ? this.aowsByCode().get(code) ?? [] : [];
  });
  readonly hoveredLoading = computed(() => {
    const code = this.hoveredProgram()?.initiativeCode;
    return !!code && this.loadingCodes().has(code) && !this.aowsByCode().has(code);
  });
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Indicator categories cached by program code + version (W12-R-2: phase-keyed, not code-only). */
  readonly summariesByCode = signal<Map<string, IndicatorCategory[]>>(new Map());
  private readonly loadingSummaryCodes = signal<Set<string>>(new Set());
  readonly categoryTab = signal<'outputs' | 'outcomes'>('outputs');

  /**
   * Single key builder for `summariesByCode` (W12-R-2 §12 DD-5): every reader/writer of the
   * map goes through this, so a phase switch (different `versionId`) never serves a stale
   * cached matrix under the same program code.
   */
  private summaryCacheKey(code: string, versionId: number | null | undefined): string {
    return `${code}::${versionId ?? 'default'}`;
  }

  /**
   * Selected program's categories, split into outputs / outcomes. `versionId` comes from
   * `effectiveVersionId()` (design.md DD-1) — this computed no longer re-resolves phase itself;
   * `effectiveVersionId()` already carries the tracked `reportingPhaseVersion()` read that makes
   * a late-arriving active phase (or a return to an already-cached phase) re-evaluate this memo.
   */
  readonly groupedSummaries = computed(() => {
    const versionId = this.effectiveVersionId();
    const sp = this.selected();
    const code = sp?.initiativeCode;
    const all = (code ? this.summariesByCode().get(this.summaryCacheKey(code, versionId)) : []) ?? [];
    const summaries = all.filter(item => item?.resultTypeName !== 'Innovation Use(IPSR)');
    return {
      outputs: summaries.filter(item => OUTPUT_NAMES.includes(item?.resultTypeName)),
      outcomes: summaries.filter(item => OUTCOME_NAMES.includes(item?.resultTypeName))
    };
  });
  /**
   * HOTFIX (`changes/overview-phase-filter`, owner HITL): the OLD implementation required
   * `loadingSummaryCodes().has(key)`, and that set is populated INSIDE the constructor `effect()`
   * that calls `refreshSelectedSummaries()` — which runs asynchronously relative to the
   * `selectedVersionId.set(...)` write that triggers it (Angular flushes `effect()` callbacks
   * after the signal write, never in the same synchronous turn a click handler runs in). In that
   * window, `groupedSummaries()` already reads the NEW (empty) cache key while the loading set
   * still only knows the OLD key — the card fell through to its empty state for a frame/tick
   * instead of showing a skeleton (verified red: `loadingSummaries()` read `false` immediately
   * after `.set()`, before any effect flush). Fixed by inverting the invariant: a key is loading
   * whenever it simply has no cache entry yet — independent of the in-flight set's timing.
   * `refreshSelectedSummaries()`'s effect is unconditional (fires whenever `code` exists,
   * regardless of tab), so a cache-miss here always means "will be fetched" — never a stuck
   * loader (OPF-R-5): the `error` handler in `loadSummaries` below still caches `[]`, which
   * settles this back to `false`. `loadingSummaryCodes` itself stays — `loadSummaries`'s own
   * de-dup guard (skip a second concurrent fetch for the same key) still needs it.
   */
  readonly loadingSummaries = computed(() => {
    const versionId = this.effectiveVersionId();
    const sp = this.selected();
    const code = sp?.initiativeCode;
    if (!code) return false;
    const key = this.summaryCacheKey(code, versionId);
    return !this.summariesByCode().has(key);
  });

  /**
   * Guided tour. The steps are derived from what is actually on screen — a user
   * with no programs of their own, or a program without Areas of Work, gets a
   * different (and honest) sequence instead of a spotlight over nothing.
   */
  /** The tutorial picker: "how do I report?" has more than one answer. */
  readonly tutorialsOpen = signal(false);
  readonly tutorials = this.guideSE.catalogue;

  startGuide(): void {
    this.tutorialsOpen.set(true);
  }

  runTutorial(id: TutorialId): void {
    this.tutorialsOpen.set(false);
    // Let the picker unmount before driver.js measures the page behind it.
    setTimeout(() => this.guideSE.start(id, this.guideContext()), 120);
  }

  private guideContext() {
    return {
      hasMyPrograms: this.myPrograms().length > 0,
      hasOtherPrograms: this.otherPrograms().length > 0 || this.otherProjects().length > 0,
      hasSelectedProgram: !!this.selected(),
      hasAows: this.aows().length > 0,
      hasCategories: this.groupedSummaries().outputs.length > 0 || this.groupedSummaries().outcomes.length > 0,
      hasCenters: this.myCenters().length > 0,
      inAowView: this.viewMode() === 'aow',
      hasIndicators: this.indicatorGroups().length > 0
    };
  }

  // ---- My CGIAR Centers (single card, auto-advancing) ----
  /** Centers the user has a role in; the card cycles through them. */
  readonly myCenters = computed<any[]>(() => this.api.rolesSE.getMyCenters() ?? []);
  readonly centerIndex = signal(0);
  readonly centersOpen = signal(false);
  private centerTimer: ReturnType<typeof setInterval> | null = null;

  readonly currentCenter = computed(() => {
    const list = this.myCenters();
    return list.length ? list[this.centerIndex() % list.length] : null;
  });

  /** Pause the rotation while the list is open — reading a moving card is hostile. */
  private startCenterRotation(): void {
    if (this.centerTimer) return;
    this.centerTimer = setInterval(() => {
      if (this.centersOpen()) return;
      const total = this.myCenters().length;
      if (total > 1) this.centerIndex.update(i => (i + 1) % total);
    }, 4200);
  }

  openCenters(): void {
    this.centersOpen.set(true);
  }

  closeCenters(): void {
    this.centersOpen.set(false);
  }

  focusCenter(i: number): void {
    this.centerIndex.set(i);
  }

  // ---- Manage drawer (one indicator) ----
  /** The indicator being managed, with the HLO it belongs to for context. */
  readonly managed = signal<{ indicator: any; groupTitle: string; node: any } | null>(null);
  /** Which tab the drawer should land on — chosen by the card button that opened it. */
  readonly manageTab = signal<'report' | 'info'>('report');
  /** Room reserved on the right so the manage panel never covers the list. Matches
   *  the drawer's default width so the report form opens two-column from the start. */
  readonly managePanelWidth = signal(740);

  manageIndicator(indicator: any, groupTitle: string, tab: 'report' | 'info' = 'report', node?: unknown): void {
    // The group carries the ToC node id the existing-results endpoint needs; the
    // indicator row does not, so it is folded in here. Planned browse may pass
    // `__hloNode` / `toc_result_id` when no AoW detail is open.
    //
    // `node` wins when a caller hands one over. The report flow does exactly that: the ToC node is
    // what carries `toc_partner_institution_ids` and `contributing_synergy_program_initiative_ids`,
    // and losing them costs the form its Center / Science Program pre-selection SILENTLY — empty
    // dropdowns, no error. Matching on `result_title` is too weak a hook to trust with that.
    const group =
      (node as Record<string, unknown> | null | undefined) ??
      this.indicatorGroups().find(g => g?.result_title === groupTitle) ??
      indicator?.__hloNode ??
      null;
    const tocId = indicator?.toc_result_id ?? group?.toc_result_id;
    this.manageTab.set(tab);
    this.managed.set({ indicator: { ...indicator, toc_result_id: tocId }, groupTitle, node: group });
  }

  closeManage(): void {
    this.managed.set(null);
  }

  // ---- Legacy report surfaces (the ones the users actually get) ----
  /**
   * Seed the root-scoped `EntityAowService` with the selected programme.
   *
   * Both legacy surfaces read their context off this service and this page never touched it, so
   * without the seed they open half-blind: `entityDetails().id` is what becomes `initiative_id` in
   * the create payload, and `canReportResults()` stays FALSE for every non-admin until
   * `getAllDetailsData` resolves the phase check — which renders the modal without its submit
   * button. Called from the `selected()` effect so the data is warm before any click, and again at
   * click time as a cold-load safety net. Guarded on the code so tab switches do not refetch.
   */
  private primeEntityAowContext(): void {
    const code = this.selected()?.initiativeCode;
    if (!code || this.entityAowService.entityId() === code) return;
    this.entityAowService.entityId.set(code);
    this.entityAowService.getAllDetailsData(code);
  }

  /**
   * KPI "Report" → the ORIGINAL report modal, not the new drawer.
   *
   * Mirrors `aow-hlo-table.openReportResultModal`: prime the service, point it at the clicked row's
   * ToC node (narrowed to the one indicator) and flip the visibility signal. The modal reads
   * everything else — programme, AoW header line, reporting rights — off the same service.
   *
   * `node` is explicit because not every surface on this page feeds rows through
   * `indicatorsByAow()`: inside an open Area of Work the buttons iterate the RAW ToC group, so its
   * rows carry no `__hloNode` and the template passes the group it is already looping over.
   * Dropping the node would cost the modal its ToC context (centers / Science Programs preselect).
   */
  openLegacyReportModal(row: ReportingIndicator, node?: unknown): void {
    this.primeEntityAowContext();

    const raw = row as unknown as Record<string, unknown>;
    const tocNode = (node ?? raw['__hloNode']) as Record<string, unknown> | null | undefined;
    // `entityAows` + `aowId` feed `currentAowSelected()`, the `AOW01 - name` line in the modal
    // header. For the Intermediate / 2030 buckets `__aowCode` is a sentinel that matches no unit,
    // so the computed stays undefined and the header line hides itself — same as the old pages.
    this.entityAowService.entityAows.set(this.aows());
    this.entityAowService.aowId.set(String(raw['__aowCode'] ?? this.activeAowCode() ?? ''));
    this.entityAowService.currentResultToReport.set(buildReportModalNode(tocNode, raw));
    this.entityAowService.showReportResultModal.set(true);
  }

  // ---- Emerging result (legacy `app-report-result-form` in a pr-dialog) ----
  readonly showReportModal = signal(false);

  /**
   * P2-3139 parity: AVISA (SGP-02) is a deactivated project — view only. The retired
   * entity-details page hid the whole "Report Emerging results" block for it, so the band CTA is
   * hidden here too rather than opening a modal that must not create anything.
   */
  readonly canReportEmerging = computed(() => {
    const sp = this.selected();
    return !!sp && !isAvisaInitiative({ initiativeCode: sp.initiativeCode, initiativeId: sp.initiativeId });
  });

  openReportModal(): void {
    if (!this.canReportEmerging()) return;
    // The reporting rights gate on the form's Save button lives in EntityAowService.
    this.primeEntityAowContext();
    // Deliberately NO `resultLevelSE.setPendingResultType(...)`: the retired call site had a
    // category card as context, a single "Report emerging result" button has none — so the
    // Output/Outcome cards and the Indicator category radios stay the user's choice.
    this.showReportModal.set(true);
  }

  closeReportModal(): void {
    this.showReportModal.set(false);
    this.resultLevelSE.cleanData?.();
  }

  // ---- Guided creation (full-screen flow) ----
  readonly guidedOpen = signal(false);
  readonly guidedPath = signal<'planned' | 'emerging' | null>(null);

  openGuided(path: 'planned' | 'emerging' | null = null): void {
    this.guidedPath.set(path);
    this.guidedOpen.set(true);
  }

  closeGuided(): void {
    this.guidedOpen.set(false);
    this.guidedPath.set(null);
  }

  // ---- AOW detail view (indicators) ----
  readonly viewMode = signal<'home' | 'aow'>('home');
  readonly activeAowCode = signal<string | null>(null);
  readonly indicatorTab = signal<'outputs' | 'outcomes'>('outputs');
  readonly typologyFilter = signal<string | null>(null);
  readonly statusFilter = signal<string | null>(null);
  /** Free-text search across indicator description + typology. */
  readonly indicatorSearch = signal<string>('');
  /** Cards by default; the table is the dense alternative for scanning many rows. */
  readonly indicatorView = signal<'cards' | 'table'>('cards');

  setIndicatorView(view: 'cards' | 'table'): void {
    this.indicatorView.set(view);
  }
  /**
   * HLO groups start collapsed — an Area of Work can hold 45 indicators and an
   * all-open list buries the structure. We track what is OPEN so new groups
   * arriving from the API are collapsed by default without extra bookkeeping.
   */
  readonly expandedGroups = signal<Set<string>>(new Set());

  /**
   * ToC results (indicator groups) cached by `${program}::${aow}::${versionId ?? 'default'}` —
   * the same `code::versionId` Map pattern as `summaryCacheKey` (design.md DD-4,
   * `changes/overview-phase-filter`), so a late response for a phase the viewer has since
   * switched away from lands in ITS OWN key and is never read (OPF-R-4 BUT-clause).
   */
  readonly tocByKey = signal<Map<string, { outputs: any[]; outcomes: any[] }>>(new Map());
  private readonly loadingTocKeys = signal<Set<string>>(new Set());

  /**
   * The versionId every ToC cache key is built with. Mirrors `loadToc`'s own resolution: the ToC
   * family only takes an explicit phase override when the viewer picked one AND is looking at the
   * Overview tab (`activeSelection()`, design.md DD-1) — with the selector untouched, or while on
   * a different tab, every key resolves to `'default'`, exactly as before this spec (OPF-N-1).
   */
  private tocVersionForKey(): number | null {
    return this.activeSelection() !== null ? (this.effectiveVersionId() ?? null) : null;
  }

  private tocCacheKey(program: string | null | undefined, aow: string): string {
    return `${program}::${aow}::${this.tocVersionForKey() ?? 'default'}`;
  }

  readonly activeAow = computed<Unit | null>(() => {
    const code = this.activeAowCode();
    return code ? this.aows().find(a => a.code === code) ?? null : null;
  });

  /** The 2030 Outcomes view: single flat list, cumulative 2025→2030 targets. */
  readonly is2030 = computed(() => this.activeAowCode() === OUTCOMES_2030_CODE);
  readonly outcomes2030Code = OUTCOMES_2030_CODE;

  private readonly currentToc = computed(() => {
    const sp = this.selected();
    const aow = this.activeAowCode();
    if (!sp || !aow) return { outputs: [] as any[], outcomes: [] as any[] };
    return this.tocByKey().get(this.tocCacheKey(sp.initiativeCode, aow)) ?? { outputs: [] as any[], outcomes: [] as any[] };
  });

  /**
   * HOTFIX (same root cause as `loadingSummaries` above): inverted to cache-presence — a key is
   * loading whenever it has no `tocByKey` entry yet. `loadingTocKeys` stays — every `loadToc`
   * call site's own de-dup guard still needs it.
   */
  readonly loadingToc = computed(() => {
    const sp = this.selected();
    const aow = this.activeAowCode();
    if (!sp || !aow) return false;
    const key = this.tocCacheKey(sp.initiativeCode, aow);
    return !this.tocByKey().has(key);
  });

  readonly indicatorCounts = computed(() => {
    const toc = this.currentToc();
    const count = (groups: any[]) => groups.reduce((n, g) => n + (g?.indicators?.length ?? 0), 0);
    return { outputs: count(toc.outputs), outcomes: count(toc.outcomes) };
  });

  /** Indicator typologies present in the active tab (for the filter dropdown). */
  readonly typologyOptions = computed(() => {
    const groups = this.indicatorTab() === 'outputs' ? this.currentToc().outputs : this.currentToc().outcomes;
    const set = new Set<string>();
    groups.forEach(g => (g?.indicators ?? []).forEach((i: any) => i?.type_name && set.add(i.type_name)));
    return [...set];
  });
  readonly statusOptions = ['Not started', 'In progress', 'Achieved', 'Overachieved'];

  // Option arrays shaped for <app-pr-select> ({label,value} pairs).
  readonly typologySelectOptions = computed(() => [
    { label: 'All typologies', value: '' },
    ...this.typologyOptions().map(t => ({ label: t, value: t }))
  ]);
  readonly statusSelectOptions = [
    { label: 'All statuses', value: '' },
    ...this.statusOptions.map(s => ({ label: s, value: s }))
  ];

  /** HLO groups for the active tab, filtered by search + typology + status; empty groups dropped. */
  readonly indicatorGroups = computed(() => {
    const groups = this.indicatorTab() === 'outputs' ? this.currentToc().outputs : this.currentToc().outcomes;
    const typ = this.typologyFilter();
    const st = this.statusFilter();
    const q = this.indicatorSearch().trim().toLowerCase();
    if (!typ && !st && !q) return groups;
    return groups
      .map(g => {
        // A hit on the parent High-Level Output keeps the whole group: the user
        // searched for the container, not for one of the rows inside it.
        const parentHit = !!q && String(g?.result_title ?? '').toLowerCase().includes(q);
        return {
          ...g,
          indicators: (g?.indicators ?? []).filter(
            (i: any) =>
              (!typ || i?.type_name === typ) &&
              (!st || this.statusLabel(i?.progress_percentage) === st) &&
              (!q ||
                parentHit ||
                `${i?.indicator_description ?? ''} ${i?.type_name ?? ''} ${i?.center_acronym ?? ''}`.toLowerCase().includes(q))
          )
        };
      })
      .filter(g => (g.indicators ?? []).length > 0);
  });

  readonly hasFilters = computed(() => !!(this.typologyFilter() || this.statusFilter() || this.indicatorSearch().trim()));

  /** "Showing X of Y" — X after filters, Y the tab total. */
  readonly filteredCount = computed(() => this.indicatorGroups().reduce((n, g) => n + (g?.indicators?.length ?? 0), 0));
  readonly tabTotal = computed(() => (this.indicatorTab() === 'outputs' ? this.indicatorCounts().outputs : this.indicatorCounts().outcomes));

  clearFilters(): void {
    this.typologyFilter.set(null);
    this.statusFilter.set(null);
    this.indicatorSearch.set('');
  }

  constructor() {
    // Load the selected program's Areas of Work on selection change.
    effect(() => {
      const sp = this.selected();
      const code = sp?.initiativeCode;
      if (code) {
        this.loadAows(code);
        // Warm the legacy modals' context here, not on click: `canReportResults()` needs an async
        // phase check and would otherwise hide the submit button on a cold open.
        this.primeEntityAowContext();
        this.plannedHloAowCode.set(null);
        this.plannedTypeFilter.set([]);
        this.plannedSearch.set('');
        // Every programme opens in the collapsed reading state (P2-3251) — the switch is per
        // programme, not a preference that follows the user from the last SP they browsed.
        this.reportingAllExpanded.set(false);
        this.reportingAllOpen.set(false);
        this.reportingExpandNonce.set(0);
        // Overview phase selector (design.md DD-5): a program switch always lands back on that
        // program's Open phase — a phase picked for the PREVIOUS program is not a valid selection
        // for this one.
        this.selectedVersionId.set(null);
      }
    });

    /**
     * Load the selected program's indicator-contribution summary. Kept in its OWN effect,
     * separate from the one above (live-regression fix, W12): that effect resets AoW filters
     * and expand/collapse state on every run, and re-running THAT just because the reporting
     * phase landed would wipe user-driven filter state for no reason.
     *
     * This effect ALSO reads `reportingPhaseVersion()` (bumped by
     * `DataControlService.getCurrentPhases()`, called fire-and-forget from the app shell) so a
     * late-arriving phase re-resolves `versionId` and re-fetches under the corrected cache key —
     * mirroring `result-creator.component.ts` / `report-result-form.component.ts`, which already
     * depend on `reportingPhaseVersion()` for the same reason. Without this, `latestVersion()`'s
     * "highest phaseYear" fallback (used while `reportingCurrentPhase.phaseId` is still null) can
     * pick a DIFFERENT version than the one the phase resolves to once it loads; the summary gets
     * cached under the fallback's key, `groupedSummaries`/`loadingSummaries` are Angular
     * `computed()`s that don't proactively react to `reportingCurrentPhase` mutating (it's a
     * plain object, not a signal, so this effect not depending on `reportingPhaseVersion()` is
     * what silently and permanently orphans the fetch — nothing else re-triggers a re-read), and
     * the card is stuck showing "No W1/W2 results reported yet." with no spinner and no retry.
     *
     * `refreshSelectedSummaries()` now resolves its `versionId` from `effectiveVersionId()`
     * (design.md DD-1, `changes/overview-phase-filter`) instead of re-deriving it — that computed
     * already carries this same `reportingPhaseVersion()` dependency, and ALSO reacts to the
     * viewer's own phase selector, so this effect gets phase-switch reactivity for free.
     */
    effect(() => {
      this.dataControlSE.reportingPhaseVersion();
      this.refreshSelectedSummaries();
    });

    // By AOW requires a selected AOW — prefer `?tocAow=`, else keep/pick the first.
    effect(() => {
      if (this.plannedBrowseView() !== 'byAow') return;
      const list = this.aows();
      if (!list.length) return;
      const pending = this.pendingPlannedAow;
      if (pending && list.some(a => a.code === pending)) {
        this.pendingPlannedAow = null;
        this.setPlannedHloAow(pending);
        return;
      }
      const active = this.plannedHloAowCode();
      if (!active || !list.some(a => a.code === active)) {
        this.setPlannedHloAow(list[0].code);
      }
    });

    // Reporting + Overview both need every AoW's ToC (and Intermediate / 2030 buckets).
    // Without this the table paints empty cards and Overview progress stays blank.
    // `loadToc` is idempotent (early-out when cached / in flight).
    effect(() => {
      const view = this.rfrView();
      if (view === 'planned' || view === 'overview') this.loadAllTocs();
    });

    // Overview-only: the programme's W3/Bilateral rows (P2-3302). Gated on the view so the other
    // tabs never pay for a call they do not render. `loadBilateralRows` reads `effectiveVersionId()`
    // internally, so this effect is ALSO phase-reactive (closes the W12 reactivity gap recorded in
    // design.md DD-1 — this loader used to resolve `versionId` once and never revisit it).
    effect(() => {
      const sp = this.selected();
      const code = sp?.initiativeCode;
      const id = sp?.initiativeId;
      if (this.rfrView() === 'overview') {
        if (code) this.loadBilateralRows(code);
        if (id) this.loadProgramResults(id);
      }
    });

    // Overview meter (design.md DD-3): `sp.versions` from the shared default payload carries only
    // ONE version per program (today's effective phase — see design.md §5), so looking back at a
    // DIFFERENT phase needs its own row, fetched here and overlaid by `latestVersion()`. Gated on
    // `activeSelection()` (an EXPLICIT selection, Overview tab only) so the default path — and any
    // other tab — fires zero extra requests (OPF-N-1); it keeps reading the shared payload.
    effect(() => {
      const code = this.selected()?.initiativeCode;
      const versionId = this.effectiveVersionId();
      if (code && this.activeSelection() !== null && versionId != null) this.loadMeterOverlay(code, versionId);
    });

    // Only the guided flow claims the whole viewport (focus mode). Inside an open
    // Area of Work the header stays, but trimmed to the two reporting entries so it
    // does not compete with the AOW's own navigation.
    effect(() => this.dataControlSE.focusMode.set(this.guidedOpen()));
    effect(() => this.dataControlSE.slimNav.set(this.viewMode() === 'aow'));

    // Default landing: first assigned Science Program under My Programs (skip when
    // `?sp=` is present — restoreFromUrl / the queryParam subscription own that).
    effect(() => {
      // Retry a programme code that arrived in the path before the list did.
      const programs = this.allPrograms();
      if (this.pendingProgramCode) {
        const match = programs.find(sp => sp.initiativeCode === this.pendingProgramCode);
        if (match) {
          this.pendingProgramCode = null;
          this.selectedId.set(match.initiativeId);
          this.scope.set('program');
          return;
        }
        // Still unresolved — do NOT fall back to the first programme, or a valid deep link
        // would silently show a different programme while the list loads.
        return;
      }
      if (this.selectedId() != null) return;
      const rawSp = this.route.snapshot.queryParamMap.get('sp');
      if (rawSp && !Number.isNaN(Number(rawSp))) return;
      const first = this.homeSE.mySPsList()[0];
      if (!first) return;
      this.select(first);
    });

    // In AOW mode, keep a valid AOW selected when the program changes.
    effect(() => {
      if (this.viewMode() !== 'aow') return;
      const list = this.aows();
      const active = this.activeAowCode();
      // The 2030 sentinel is valid for every program — keep it and refetch instead.
      if (active === OUTCOMES_2030_CODE) {
        const sp = this.selected();
        if (sp) this.loadToc(sp.initiativeCode, OUTCOMES_2030_CODE);
        return;
      }
      if (list.length && !list.some(a => a.code === active)) {
        this.openAow(list[0].code);
      }
    });

    // Reopen the AOW named in the URL once its program's AOWs have loaded.
    effect(() => {
      if (!this.pendingAow) return;
      const list = this.aows();
      const code = this.pendingAow;
      if (code === OUTCOMES_2030_CODE || list.some(a => a.code === code)) {
        this.pendingAow = null;
        this.openAow(code);
        // openAow() cleared the filters — put the URL's back, last.
        const f = this.pendingFilters;
        this.pendingFilters = null;
        if (f) {
          this.typologyFilter.set(f.typ);
          this.statusFilter.set(f.st);
          this.indicatorSearch.set(f.q);
        }
      }
    });

    // Mirror the current view (program + open AOW + Planned browse mode) into the URL
    // so a reload lands back here. Held off while an AOW restore is still pending.
    effect(() => {
      const sp = this.selectedId();
      const scope = this.scope();
      const aow = this.activeAowCode();
      const typ = this.typologyFilter();
      const st = this.statusFilter();
      const q = this.indicatorSearch().trim();
      const onPlanned = this.rfrView() === 'planned';
      const tocView = onPlanned ? this.plannedBrowseView() : null;
      const tocAow = onPlanned && tocView === 'byAow' ? this.plannedHloAowCode() : null;
      if (this.pendingAow || this.pendingFilters || this.restoringPlannedUrl) return;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          // The programme is addressed by the path (`…/entity-details/SP01`) — never mirror it
          // back as `?sp=`, or the URL would carry two competing sources of truth.
          sp: null,
          aow: aow ?? null,
          // filters only make sense inside an open AOW
          typ: aow ? typ ?? null : null,
          st: aow ? st ?? null : null,
          q: aow && q ? q : null,
          // Planned ToC browse mode (+ selected AoW when browsing By AOW)
          tocView: tocView,
          tocAow: tocAow
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  }

  readonly myPrograms = computed(() => this.filter(this.homeSE.mySPsList()));
  readonly otherPrograms = computed(() => this.filter(this.homeSE.otherSPsList()));
  /** AVISA-type initiatives, partitioned out of the Science Programs by the home service. */
  readonly otherProjects = computed(() => this.filter(this.homeSE.otherProjectsList()));

  /** Sidebar groups (only the non-empty ones are rendered). */
  readonly groups = computed(() =>
    [
      { label: 'My programs', items: this.myPrograms() },
      { label: 'Other programs', items: this.otherPrograms() },
      { label: 'Other projects', items: this.otherProjects() }
    ].filter(group => group.items.length)
  );

  readonly allPrograms = computed(() => [
    ...this.homeSE.mySPsList(),
    ...this.homeSE.otherSPsList(),
    ...this.homeSE.otherProjectsList()
  ]);

  readonly selected = computed<SPProgress | null>(() => {
    const list = this.allPrograms();
    const id = this.selectedId();
    if (id == null) return this.homeSE.mySPsList()[0] ?? null;
    return list.find(sp => sp.initiativeId === id) ?? this.homeSE.mySPsList()[0] ?? null;
  });

  /**
   * The viewer's phase selection, honored ONLY while the Overview tab is active — the selector
   * lives in the Overview header band (design.md DD-6), so a selection made there must not leak
   * into Planned/Reporting's shared ToC/summary/bilateral loaders just because the viewer switched
   * tabs without touching the selector again. `selectedVersionId` itself is NOT reset on a tab
   * switch — DD-5 resets it only on program change / init — so navigating back to Overview
   * restores the exact same selection. `effectiveVersionId` and `tocVersionForKey` BOTH read this
   * one computed (never `selectedVersionId()` directly) so the view-gate lives in exactly one
   * place, per DD-1.
   */
  readonly activeSelection = computed<number | null>(() => (this.rfrView() === 'overview' ? this.selectedVersionId() : null));

  /**
   * THE single phase resolver (design.md DD-1, `changes/overview-phase-filter`): every
   * phase-scoped loader/computed in this file derives its `versionId` from here — never by
   * re-resolving `latestVersion()`/`reportingCurrentPhase` on its own (that duplication is what
   * caused the W12 divergence class, KZ-W12-2).
   *
   * Tracked read of `reportingPhaseVersion()`, otherwise unused: `reportingCurrentPhase` is a
   * plain mutable object (not a signal), so without reading the version bump here, a late-arriving
   * active phase would never re-trigger this computed once `selectedVersionId()` and `selected()`
   * are already stable — see `groupedSummaries`' original comment (still applicable) for the full
   * mechanics. OPF-R-4's "AND IT MUST" clause names this exact convergence.
   */
  readonly effectiveVersionId = computed<number | null>(() => {
    this.dataControlSE?.reportingPhaseVersion?.();
    const sp = this.selected();
    return (
      this.activeSelection() ??
      this.latestVersion(sp)?.versionId ??
      this.dataControlSE?.reportingCurrentPhase?.phaseId ??
      null
    );
  });

  /**
   * Options for the Overview phase selector (`changes/overview-phase-filter` OPF-T-4, OPF-R-1).
   *
   * REVIEWER FIX (attempt 2): `sp.versions` can NEVER carry more than the program's single
   * effective-phase row — the server pins `filters.versionId` to it before querying
   * (`results.service.ts` ~:1818-1823) — so building options from it renders exactly one row and
   * no phase can ever be selected in production. The real catalogue is `PhasesService.phases.reporting`
   * (`reportingPhases()` above), filtered to the SELECTED program's own portfolio
   * (`sp.portfolioId` vs. each phase's `obj_portfolio.id`) — that filter is what preserves the BUT
   * clause (a different portfolio's phases, e.g. 2022–2024, never appear). Sorted `phase_year` desc,
   * labeled "«phase_name» · «phase_year»". `phaseTagLabel`/`phaseTagTone` are read by
   * `app-pr-select`'s `optionBadgeLabel`/`optionBadgeTone` (a per-option chip): the Open marker is
   * the phase's own `status` flag (server-authoritative), falling back to `reportingCurrentPhase`
   * id-equality only on the rare row where `status` itself is missing.
   */
  readonly phaseSelectorOptions = computed(() => {
    const sp = this.selected();
    if (!sp) return [];
    const portfolioId = sp.portfolioId;
    const openPhaseId = this.dataControlSE?.reportingCurrentPhase?.phaseId;
    return this.reportingPhases()
      .filter(p => p?.obj_portfolio?.id != null && Number(p.obj_portfolio.id) === Number(portfolioId))
      .slice()
      .sort((a, b) => (b.phase_year ?? 0) - (a.phase_year ?? 0))
      .map(p => {
        const isOpen = typeof p.status === 'boolean' ? p.status : Number(p.id) === Number(openPhaseId);
        // `version.id` is a bigint column — TypeORM serializes it as a STRING on the wire ("36").
        // Every phase-aware wrapper guards with `typeof versionId === 'number'`, so a raw string
        // here silently drops the param from every URL (the live all-cards-stuck-on-the-open-phase
        // bug, hotfix h2): normalize at the single origin instead of loosening four guards.
        return {
          versionId: Number(p.id),
          label: `${p.phase_name} · ${p.phase_year}`,
          phaseTagLabel: isOpen ? 'Open' : '',
          phaseTagTone: 'open'
        };
      });
  });

  /** Wires the Overview phase selector's `(selectOptionEvent)` to `selectedVersionId` (design.md DD-1). */
  onPhaseOptionSelected(option: { versionId: number } | null): void {
    if (option?.versionId != null) this.selectedVersionId.set(option.versionId);
  }

  /**
   * HOTFIX (same root cause as `loadingSummaries` above): inverted to cache-presence — a key is
   * loading whenever it has no `meterOverlayByKey` entry yet. `false` on the default path — the
   * loading affordance only ever applies to an EXPLICIT phase selection (`activeSelection()`),
   * same gate the overlay cache itself uses in `loadMeterOverlay`'s effect, so a cache-miss here
   * always means "will be fetched," never a stuck loader. Once settled (fetch resolved OR
   * errored — `cacheMeterOverlay` always writes an entry, `null` on error), this is `false` and
   * `latestVersion()` below renders the meter's zeroed state for the `null` case.
   * `loadingMeterKeys` stays — `loadMeterOverlay`'s own de-dup guard still needs it.
   */
  readonly loadingMeter = computed(() => {
    const sp = this.selected();
    const versionId = this.activeSelection();
    if (!sp?.initiativeCode || versionId === null) return false;
    const key = this.summaryCacheKey(sp.initiativeCode, versionId);
    return !this.meterOverlayByKey().has(key);
  });

  /**
   * Phase chip for the SELECTED program's effective phase (OPF-T-4 fix, `changes/overview-phase-filter`
   * ADVISORY (3)) — this used to key off `allPrograms()[0]`, which showed the wrong program's phase
   * the moment a viewer picked a program other than the first one in the list. `latestVersion()`
   * already resolves through `activeSelection()`/`effectiveVersionId()`'s same chain, so this stays
   * in lockstep with an explicit phase selection on the Overview tab.
   */
  readonly phaseLabel = computed(() => {
    const v = this.latestVersion(this.selected());
    return v ? `${v.phaseName} · ${v.phaseYear}` : '';
  });

  /**
   * `reporting-program-band`'s `phaseLabelOverride` input (Reviewer fix, attempt 2): bound ONLY
   * while an EXPLICIT phase is selected on the Overview tab (`activeSelection() !== null`) —
   * unconditionally binding `phaseLabel()` regressed the Reporting tab's eyebrow (out of scope,
   * `activeSelection()` is null-gated there so this still resolves `''`) AND the Overview DEFAULT
   * path (`· Reporting cycle 2026 · P25` → `· Reporting 2026 · 2026`, violating OPF-R-3's
   * byte-identical default). `''` tells the band to keep its own `cycleYear`/`cyclePhase` tail.
   */
  readonly selectedPhaseLabel = computed(() => (this.activeSelection() === null ? '' : this.phaseLabel()));

  /** Ordered, colored status breakdown for the selected program's latest version. */
  readonly statusRows = computed<StatusRow[]>(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    if (!statuses.length) return [];
    const max = Math.max(...statuses.map(s => s.count), 1);
    const total = statuses.reduce((acc, s) => acc + s.count, 0) || 1;
    return statuses
      .map(s => {
        const color = STATUS_COLOR[s.statusId] ?? '#94a3b8';
        return {
          statusId: s.statusId,
          label: STATUS_LABEL[s.statusId] ?? s.statusName,
          count: s.count,
          color,
          order: STATUS_ORDER[s.statusId] ?? 99,
          barPct: Math.round((s.count / max) * 100),
          sharePct: (s.count / total) * 100,
          barGradient: `linear-gradient(180deg, ${this.shade(color, 0.26)} 0%, ${color} 100%)`
        };
      })
      .sort((a, b) => a.order - b.order);
  });

  readonly selectedTotal = computed(() => {
    const sp = this.selected();
    return sp ? this.totalResults(sp) : 0;
  });

  /**
   * Footer meta for the program-band ⓘ popover: "M planned results".
   * Prefer the sum of ToC indicators across AoWs + Intermediate + 2030 once loaded;
   * fall back to this phase's result total so the line is never empty on first paint.
   */
  readonly bandPlannedResultsCount = computed(() => {
    const fromReporting = this.reportingGroups().reduce((sum, g) => sum + (g.count || 0), 0);
    if (fromReporting > 0) return fromReporting;
    const fromToc = this.indicatorsByAow().reduce((sum, b) => sum + (b.count || 0), 0);
    return fromToc > 0 ? fromToc : this.selectedTotal();
  });

  // ── Overview tab feeds (real SP / AoW / ToC data) ─────────────────────────

  /**
   * Reporting-status meter + legend. Built from the fixed slot list, not from the API order, so
   * the five reference states always show in the same order and `Approved` still reads `0`.
   */
  readonly overviewStatusSegments = computed<OverviewStatusSegment[]>(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    if (!statuses.length) return [];
    const countOf = (statusId: number) => statuses.find(s => s.statusId === statusId)?.count ?? 0;
    // Real `status_name` from the wire, never the slot `label` — falls back to the catalogue map
    // only when the wire omits/empties the name (`OVW-DD-2`).
    const statusNameOf = (statusId: number) =>
      statuses.find(s => s.statusId === statusId)?.statusName?.trim() || OVERVIEW_STATUS_NAME_FALLBACK[statusId] || '';
    const linkOf = (statusId: number, count: number): OverviewLink | null => (count > 0 ? { status: statusNameOf(statusId) } : null);
    const segments: OverviewStatusSegment[] = OVERVIEW_STATUS_SLOTS.map(slot => {
      const count = countOf(slot.statusId);
      return {
        key: slot.key,
        label: slot.label,
        count,
        bg: slot.bg,
        fg: slot.fg,
        statusName: statusNameOf(slot.statusId),
        link: linkOf(slot.statusId, count)
      };
    });
    const discontinued = countOf(OVERVIEW_DISCONTINUED_SLOT.statusId);
    if (discontinued > 0) {
      segments.push({
        key: OVERVIEW_DISCONTINUED_SLOT.key,
        label: OVERVIEW_DISCONTINUED_SLOT.label,
        count: discontinued,
        bg: OVERVIEW_DISCONTINUED_SLOT.bg,
        fg: OVERVIEW_DISCONTINUED_SLOT.fg,
        statusName: statusNameOf(OVERVIEW_DISCONTINUED_SLOT.statusId),
        link: linkOf(OVERVIEW_DISCONTINUED_SLOT.statusId, discontinued)
      });
    }
    return segments;
  });

  /**
   * Progress by AoW — least complete first. `done` = KPIs with something reported;
   * `total` = planned indicators (same rule as the Reporting table ratio).
   */
  readonly overviewAowProgress = computed<OverviewAowProgressRow[]>(() => {
    return this.indicatorsByAow()
      .map(b => {
        const inds = (b.indicators ?? []).filter(i => i?.__tier !== 'outcome');
        const done = inds.filter(i => Number(i?.actual_achieved_value_sum ?? 0) > 0).length;
        return {
          code: b.aow.code,
          name: b.aow.name,
          done,
          total: inds.length
        };
      })
      .filter(r => r.total > 0 || !this.loadingAows())
      .sort((a, b) => {
        const pa = a.total ? a.done / a.total : 0;
        const pb = b.total ? b.done / b.total : 0;
        return pa - pb || a.code.localeCompare(b.code);
      });
  });

  /** Intermediate + 2030 as cross-cutting rows under Progress by AoW (CURRENT xcutProgress). */
  readonly overviewXcutProgress = computed<OverviewAowProgressRow[]>(() => {
    return this.reportingGroups()
      .filter(g => g.kind === 'intermediate' || g.kind === '2030')
      .map(g => {
        const inds = g.indicators ?? [];
        const done = inds.filter(i => Number(i?.actual_achieved_value_sum ?? 0) > 0).length;
        // Sentence case per the reference ("Intermediate outcomes" / "2030 outcomes"). Only the
        // Overview row is relabelled — the Reporting table keeps the group's own name.
        return { code: g.aow.code, name: sentenceCaseOutcomes(g.aow.name), done, total: g.count || inds.length };
      })
      .filter(r => r.total > 0);
  });

  // ── W3/Bilateral figures for the Overview tab (P2-3302) ───────────────────
  //
  // Source: GET /api/results/by-program-and-centers?programId=<SP>, the same call the bilateral
  // review screen makes. `centerIds` is deliberately omitted — the endpoint only narrows when
  // exactly ONE code is passed, so omitting it returns the programme's whole set.
  //
  // ⚠️ TWO limitations to know before trusting these numbers:
  //  1. The server filters `status_id IN (5,6,7)`, so bilateral results still in Editing /
  //     Submitted / Draft are invisible. "Tagged" therefore means "tagged AND reached review".
  //     P2-3302 asks for "tagged", full stop — the gap is documented, not papered over.
  //  2. `initiative_role_id` and `status_id` arrive as STRINGS ('1', '5'). Compare with
  //     String(...), never `=== 1`.
  /**
   * Cached by `${code}::${versionId}` — same `code::versionId` Map pattern as `summaryCacheKey`
   * (design.md DD-4, `changes/overview-phase-filter`): a late response for a phase the viewer has
   * since switched away from lands in ITS OWN key and is never read (OPF-R-4 BUT-clause).
   */
  private readonly bilateralRowsByKey = signal<Map<string, ResultToReview[]>>(new Map());
  private readonly loadingBilateralKeys = signal<Set<string>>(new Set());

  private readonly programResultsByKey = signal<Map<string, any[]>>(new Map());
  private readonly loadingProgramResultsKeys = signal<Set<string>>(new Set());

  readonly overviewProgramResults = computed<any[]>(() => {
    const sp = this.selected();
    const id = sp?.initiativeId;
    if (!id) return [];
    const key = this.summaryCacheKey(String(id), this.effectiveVersionId());
    return this.programResultsByKey().get(key) ?? [];
  });

  /** Selected program's bilateral rows for the CURRENT phase key only (design.md DD-4). */
  private readonly bilateralRows = computed<ResultToReview[]>(() => {
    const code = this.selected()?.initiativeCode;
    if (!code) return [];
    const key = this.summaryCacheKey(code, this.effectiveVersionId());
    return this.bilateralRowsByKey().get(key) ?? [];
  });

  /** Only the rows where this programme is the primary submitter (role id '1'). */
  private readonly bilateralPrimaryRows = computed(() =>
    this.bilateralRows().filter(r => String(r.initiative_role_id ?? '') === BILATERAL_PRIMARY_ROLE_ID)
  );

  /**
   * HOTFIX (same root cause as `loadingSummaries` above): inverted to cache-presence — a key is
   * loading whenever it has no `bilateralRowsByKey` entry yet, independent of the in-flight set's
   * timing. Gated on `rfrView() === 'overview'`, mirroring the constructor effect that actually
   * calls `loadBilateralRows` (only fires on Overview) — off that tab this is never fetched, so a
   * bare cache-miss check would spin forever; the view gate keeps it settled `false` there
   * (harmless either way since `app-program-overview` — the only consumer — only renders on
   * Overview, but this keeps the computed correct on its own terms). `loadingBilateralKeys` stays
   * — `loadBilateralRows`'s own de-dup guard still needs it.
   */
  readonly loadingBilateral = computed(() => {
    const versionId = this.effectiveVersionId();
    const sp = this.selected();
    const code = sp?.initiativeCode;
    if (!code || this.rfrView() !== 'overview') return false;
    const key = this.summaryCacheKey(code, versionId);
    return !this.bilateralRowsByKey().has(key);
  });

  /** Centers with reported W3/bilateral results, ranked descending by count with alphabetical tie-breaking. */
  readonly overviewBilateralCenters = computed<OverviewCenterBar[]>(() => {
    const rows = this.bilateralRows();
    if (!rows.length) return [];
    const byCenter = new Map<string, number>();
    for (const row of rows) {
      const center = row.lead_center?.trim() || 'Not specified';
      byCenter.set(center, (byCenter.get(center) ?? 0) + 1);
    }
    return [...byCenter.entries()]
      .map(([name, count]) => ({
        name,
        count,
        // The synthetic 'Not specified' bucket has no matching Results-tab center value.
        link: name === 'Not specified' ? null : ({ origin: BILATERAL_ORIGIN, center: name } as OverviewLink)
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  /** Bilateral results by category, primary-role only — matches the card's subtitle. */
  readonly overviewBilateralCategories = computed<OverviewCategoryBar[]>(() => {
    const byName = new Map<string, number>();
    for (const row of this.bilateralPrimaryRows()) {
      const name = row.indicator_category?.trim();
      if (!name) continue;
      byName.set(name, (byName.get(name) ?? 0) + 1);
    }
    return [...byName.entries()]
      .map(([name, count]) => ({ name, count, link: { origin: BILATERAL_ORIGIN, category: name } }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  /** Bilateral results reporting status segments (Pending Review, In QA, Approved, Rejected). */
  readonly overviewBilateralStatusSegments = computed<OverviewStatusSegment[]>(() => {
    const rows = this.bilateralRows();
    if (!rows.length) return [];

    const byStatus = new Map<string, number>();
    for (const r of rows) {
      const name = r.status_name?.trim() || 'Pending Review';
      byStatus.set(name, (byStatus.get(name) ?? 0) + 1);
    }

    const slots: { key: string; label: string; bg: string; fg: string; matchers: string[] }[] = [
      {
        key: 'editing',
        label: 'Editing',
        bg: 'var(--pr-status-in-progress-bg)',
        fg: 'var(--pr-status-in-progress-fg)',
        matchers: ['editing', 'draft']
      },
      {
        key: 'pending',
        label: 'Pending Review',
        bg: 'var(--pr-status-submitted-bg)',
        fg: 'var(--pr-status-submitted-fg)',
        matchers: ['pending review', 'pending', 'submitted']
      },
      {
        key: 'in-qa',
        label: 'In QA',
        bg: 'var(--pr-status-in-qa-bg)',
        fg: 'var(--pr-status-in-qa-fg)',
        matchers: ['in qa', 'quality assessed']
      },
      {
        key: 'approved',
        label: 'Approved',
        bg: 'var(--pr-status-approved-bg)',
        fg: 'var(--pr-status-approved-fg)',
        matchers: ['approved']
      },
      {
        key: 'rejected',
        label: 'Rejected',
        bg: 'var(--pr-status-not-started-bg)',
        fg: 'var(--pr-status-not-started-fg)',
        matchers: ['rejected', 'discontinued']
      }
    ];

    const matchedNames = new Set<string>();
    const segments: OverviewStatusSegment[] = [];

    for (const slot of slots) {
      let count = 0;
      let matchedName = slot.label;
      for (const [name, c] of byStatus.entries()) {
        if (slot.matchers.includes(name.toLowerCase())) {
          count += c;
          matchedNames.add(name);
          matchedName = name;
        }
      }
      segments.push({
        key: slot.key,
        label: slot.label,
        count,
        bg: slot.bg,
        fg: slot.fg,
        statusName: matchedName,
        link: count > 0 ? { origin: BILATERAL_ORIGIN, status: matchedName } : null
      });
    }

    for (const [name, count] of byStatus.entries()) {
      if (!matchedNames.has(name) && count > 0) {
        segments.push({
          key: name.toLowerCase().replace(/\s+/g, '-'),
          label: name,
          count,
          bg: 'var(--pr-status-in-progress-bg)',
          fg: 'var(--pr-status-in-progress-fg)',
          statusName: name,
          link: { origin: BILATERAL_ORIGIN, status: name }
        });
      }
    }

    return segments;
  });

  /** Columns of the W1/W2 heatmap (`OVW-R-2`) — `others` (statuses 4–8, undecomposable) → 'Other'. */
  private static readonly W12_HEATMAP_COLS = ['Editing', 'Quality Assessed', 'Submitted', 'Other'] as const;

  /**
   * W1/W2 category × status heatmap (`OVW-R-2`, design §2.2 item 2). Rows are the program's
   * type summaries (outputs then outcomes, `Innovation Use(IPSR)` already excluded by
   * `groupedSummaries`) — every status column is kept (including `qualityAssessed`, OQ-1). Rows
   * whose four cells are all zero are omitted; the `Other` column (statuses 4–8) has no single
   * filter value, so its cells carry `link: null` (`OVW-DD-3`).
   * `CVT-A-3`: this matrix (bars-default + bar-end totals) is now the ONLY W1/W2 own-results
   * card — the standalone single-series "by indicator category" card (formerly fed by
   * `overviewCategories`, removed) is gone; its rows ARE the indicator categories.
   */
  readonly overviewW12Heatmap = computed<HeatmapModel>(() => {
    const { outputs, outcomes } = this.groupedSummaries();
    const cols = [...DashboardLabComponent.W12_HEATMAP_COLS];
    const rows: string[] = [];
    const cells: HeatmapModel['cells'] = [];

    for (const item of [...outputs, ...outcomes]) {
      const values = [item.editing || 0, item.qualityAssessed || 0, item.submitted || 0, item.others || 0];
      if (!values.some(value => value > 0)) continue;

      const r = rows.length;
      rows.push(item.resultTypeName);
      values.forEach((value, c) => {
        cells.push({
          r,
          c,
          value,
          // 'Other' (c === 3) aggregates statuses 4–8 and cannot be expressed as one `status`.
          link: c === 3 ? null : { category: item.resultTypeName, status: cols[c] }
        });
      });
    }

    return { rows, cols, cells, caption: 'W1/W2 results by category and status' };
  });

  /**
   * W3/Bilateral center × category heatmap (`OVW-R-3`, design §2.2 item 2 / `OVW-DD-6`). Rows are
   * `lead_center` over ALL bilateral rows — the same population as `overviewBilateralCenters`, NOT
   * the primary-only set `overviewBilateralCategories` uses — so row totals reconcile with the
   * center bars. Capped at the top 8 centers by total (desc, then name); `shownOf` is only set
   * when more than 8 exist. `Not specified` rows are non-navigable (`OVW-DD-3`).
   */
  readonly overviewBilateralHeatmap = computed<HeatmapModel>(() => {
    const caption = 'W3/Bilateral results by center and category';
    const subtitle = 'Bilateral results in review (Submitted · In QA · Approved)';
    const rows = this.bilateralRows();
    if (!rows.length) return { rows: [], cols: [], cells: [], caption, subtitle };

    const cols = [...new Set(rows.map(r => r.indicator_category?.trim()).filter((c): c is string => !!c))].sort((a, b) =>
      a.localeCompare(b)
    );

    const byCenter = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const category = row.indicator_category?.trim();
      if (!category) continue;
      const center = row.lead_center?.trim() || 'Not specified';
      if (!byCenter.has(center)) byCenter.set(center, new Map());
      const counts = byCenter.get(center)!;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    const centerTotals = [...byCenter.entries()]
      .map(([name, counts]) => ({ name, counts, total: [...counts.values()].reduce((sum, v) => sum + v, 0) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const total = centerTotals.length;
    const shown = centerTotals.slice(0, 8);

    const cells: HeatmapModel['cells'] = [];
    shown.forEach((center, r) => {
      cols.forEach((category, c) => {
        cells.push({
          r,
          c,
          value: center.counts.get(category) ?? 0,
          link: center.name === 'Not specified' ? null : { origin: BILATERAL_ORIGIN, center: center.name, category }
        });
      });
    });

    return {
      rows: shown.map(c => c.name),
      cols,
      cells,
      caption,
      subtitle,
      shownOf: total > 8 ? { shown: shown.length, total } : undefined
    };
  });

  /**
   * `true` while any ToC bucket the map needs (every AoW, plus the two program-level buckets) is
   * still in flight for the current SP — same guard SHAPE as `loadingAows`/`loadingToc` (a key is
   * "in flight" once requested and not yet resolved into `tocByKey`). Also true while the AoW list
   * itself hasn't settled (`loadingAows()`), since the map cannot even name its branches yet.
   */
  // HOTFIX (same root cause as `loadingSummaries` above): inverted to cache-presence — a bucket is
  // loading whenever it simply has no `tocByKey` entry yet. The `loadAllTocs()` effect (constructor,
  // gated `rfrView() === 'planned' || 'overview'`) fetches every one of these keys unconditionally
  // once the SP/AoW list is known, so a cache-miss always means "will be fetched."
  readonly overviewTocMapLoading = computed(() => {
    if (this.loadingAows()) return true;
    const sp = this.selected()?.initiativeCode;
    if (!sp) return false;
    const keys = [
      ...this.aows().map(aow => this.tocCacheKey(sp, aow.code)),
      this.tocCacheKey(sp, INTERMEDIATE_OUTCOMES_CODE),
      this.tocCacheKey(sp, OUTCOMES_2030_CODE)
    ];
    const map = this.tocByKey();
    return keys.some(key => !map.has(key));
  });

  /**
   * Theory-of-Change map model (`TCM-R-2`, `changes/overview-toc-map`) — feeds the ALREADY-LOADED
   * `aows()`/`tocByKey()` (no new HTTP calls) plus `splitGroupTitle` (the existing HLO title
   * parser) into the pure `buildTocMapModel`. `null` while the SP itself isn't resolved OR
   * `buildTocMapModel` finds nothing to render (empty program) — `program-overview` tells the two
   * cases apart using `overviewTocMapLoading()` alongside this.
   */
  readonly overviewTocMap = computed<TocMapModel | null>(() => {
    const sp = this.selected();
    if (!sp) return null;
    const spCode = sp.initiativeCode;
    const map = this.tocByKey();
    // Matches `tocByKey`'s own declared bucket type (`{ outputs: any[]; outcomes: any[] }`) — the
    // ToC node shape stays untyped-`any` here same as every other reader of this signal.
    const tocByAow = new Map<string, { outputs: any[]; outcomes: any[] }>();
    this.aows().forEach(aow => {
      const bucket = map.get(this.tocCacheKey(spCode, aow.code));
      if (bucket) tocByAow.set(aow.code, bucket);
    });

    return buildTocMapModel({
      spCode,
      spName: sp.initiativeShortName || sp.initiativeName || '',
      aows: this.aows(),
      tocByAow,
      intermediateOutcomes: map.get(this.tocCacheKey(spCode, INTERMEDIATE_OUTCOMES_CODE)) ?? null,
      outcomes2030: map.get(this.tocCacheKey(spCode, OUTCOMES_2030_CODE)) ?? null,
      parseTitle: title => this.splitGroupTitle(title)
    });
  });

  /**
   * `program-overview` resolves a ToC map click down to an AoW code (`tocMapAowFromClick`) and
   * emits it ONLY for an AoW node (`TCM-R-5`); this parent navigates to that AoW's EXISTING
   * `entity-aow` page — same route the retired `entity-aow-card`
   * (`pages/entity-details/components/entity-aow-card/entity-aow-card.component.html:16`) already
   * links to: `/result-framework-reporting/entity-details/:entityId/aow/:aowId`
   * (`shared/routing/routing-data.ts` "Entity AOW" route, `:aowId` child) — mirrors the array-form
   * `router.navigate` call `onOverviewLink` (below) uses for the sibling 'results' route.
   */
  onOpenAow(code: string): void {
    const spCode = this.selected()?.initiativeCode || this.route?.snapshot?.paramMap?.get('entityId');
    if (!spCode) return;
    this.router.navigate(['/result-framework-reporting/entity-details', spCode], {
      queryParams: { tocView: 'aows' }
    });
  }

  /**
   * Fetch (and cache) the programme's bilateral rows. Overview only — the other tabs do not use
   * them. `versionId` resolved via `effectiveVersionId()` (design.md DD-1 — the single resolver);
   * cached per phase (design.md DD-4) so a phase switch never serves a stale key.
   */
  private loadBilateralRows(code: string): void {
    const versionId = this.effectiveVersionId();
    const key = this.summaryCacheKey(code, versionId);
    if (this.bilateralRowsByKey().has(key) || this.loadingBilateralKeys().has(key)) return;
    this.loadingBilateralKeys.update(set => new Set(set).add(key));
    this.api.resultsSE.GET_ResultToReview(code, undefined, versionId ?? undefined, 'all').subscribe({
      next: (res: { response?: { results?: ResultToReview[] }[] }) =>
        this.cacheBilateralRows(key, (res?.response ?? []).flatMap(g => g.results ?? [])),
      error: () => this.cacheBilateralRows(key, [])
    });
  }

  private cacheBilateralRows(key: string, rows: ResultToReview[]): void {
    this.bilateralRowsByKey.update(map => new Map(map).set(key, rows));
    this.loadingBilateralKeys.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  private loadProgramResults(id: number): void {
    const userId = this.api.authSE?.localStorageUser?.id;
    if (!userId || !id) return;
    const versionId = this.effectiveVersionId();
    const key = this.summaryCacheKey(String(id), versionId);
    if (this.programResultsByKey().has(key) || this.loadingProgramResultsKeys().has(key)) return;
    this.loadingProgramResultsKeys.update(set => new Set(set).add(key));
    this.api.resultsSE.GET_AllResultsWithUseRole(userId, {
      submitter_id: String(id),
      limit: 2000,
      page: 1
    }).subscribe({
      next: (res: any) =>
        this.cacheProgramResults(key, res?.response?.items ?? []),
      error: () => this.cacheProgramResults(key, [])
    });
  }

  private cacheProgramResults(key: string, rows: any[]): void {
    this.programResultsByKey.update(map => new Map(map).set(key, rows));
    this.loadingProgramResultsKeys.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  // @akili-spec changes/sp-overview-echarts/overview-widgets
  /**
   * `program-overview` emits a typed `OverviewLink` (`OVW-R-5`); this parent owns the actual
   * navigation. Fresh history entry — no `queryParamsHandling: 'merge'` — because Overview → Results
   * is real navigation, not a mirror of this page's own `aow/typ/st/q` filters (`OVW-DD-7`).
   */
  onOverviewLink(link: OverviewLink): void {
    const code = this.selected()?.initiativeCode;
    if (!code) return;
    const queryParams: Record<string, string> = {};
    (Object.keys(link) as (keyof OverviewLink)[]).forEach(dimension => {
      const value = link[dimension];
      if (value !== undefined) {
        queryParams[PROGRAMME_RESULTS_QUERY_PARAM_MAP[dimension]] = value;
      }
    });
    this.router.navigate(['/result-framework-reporting/entity-details', code, 'results'], { queryParams });
  }

  /** % of results in a "reported" state (QAed / Submitted). */
  readonly submittedPct = computed(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    const total = statuses.reduce((acc, s) => acc + s.count, 0);
    if (!total) return 0;
    const reported = statuses.filter(s => REPORTED_STATUS_IDS.includes(s.statusId)).reduce((acc, s) => acc + s.count, 0);
    return Math.round((reported / total) * 100);
  });

  /** Number of distinct status categories present. */
  readonly statusCategories = computed(() => this.statusRows().length);

  /** Aggregate stats over the selected program's Areas of Work. */
  readonly aowStats = computed(() => {
    const list = this.aows();
    if (!list.length) return { count: 0, avgProgress: 0, active: 0 };
    const sum = list.reduce((acc, u) => acc + (u.progress || 0), 0);
    const active = list.filter(u => (u.resultsCount?.editing || 0) + (u.resultsCount?.submitted || 0) > 0).length;
    return { count: list.length, avgProgress: Math.round(sum / list.length), active };
  });

  /** Top AoWs by progress for the Dashboard leadership overview (cap 8). */
  readonly aowProgressRows = computed<AowProgressRow[]>(() => {
    return [...this.aows()]
      .map(u => {
        const editing = u.resultsCount?.editing || 0;
        const submitted = u.resultsCount?.submitted || 0;
        return {
          code: u.code,
          name: u.name,
          progress: Math.round(u.progress || 0),
          editing,
          submitted,
          total: editing + submitted
        };
      })
      .sort((a, b) => b.progress - a.progress || b.total - a.total || a.code.localeCompare(b.code))
      .slice(0, 8);
  });

  /** Status counts + share for leadership KPI cards (no new API). */
  readonly pipelineStats = computed(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    const count = (id: number) => statuses.find(s => s.statusId === id)?.count ?? 0;
    const total = statuses.reduce((acc, s) => acc + s.count, 0);
    const editing = count(1);
    const qaed = count(2);
    const submitted = count(3);
    const discontinued = count(4);
    const pending = count(5);
    const reported = qaed + submitted;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return {
      total,
      editing,
      qaed,
      submitted,
      pending,
      discontinued,
      reported,
      editingPct: pct(editing),
      reportedPct: pct(reported),
      pendingPct: pct(pending),
      submittedPct: pct(submitted)
    };
  });

  /** Top AoW by result volume (leader “where is the work”). */
  readonly topAowByResults = computed(() => {
    const rows = this.aowProgressRows();
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code))[0] ?? null;
  });

  /** Emerging / type mix totals already loaded for the program. */
  readonly emergingOverview = computed(() => {
    const { outputs, outcomes } = this.groupedSummaries();
    const sum = (list: IndicatorCategory[]) =>
      list.reduce(
        (acc, c) => {
          acc.editing += c.editing || 0;
          acc.submitted += c.submitted || 0;
          acc.types += 1;
          return acc;
        },
        { editing: 0, submitted: 0, types: 0 }
      );
    const out = sum(outputs);
    const oc = sum(outcomes);
    const outputResults = out.editing + out.submitted;
    const outcomeResults = oc.editing + oc.submitted;
    const mixTotal = outputResults + outcomeResults || 1;
    return {
      outputTypes: out.types,
      outcomeTypes: oc.types,
      outputResults,
      outcomeResults,
      outputEditing: out.editing,
      outcomeEditing: oc.editing,
      outputPct: Math.round((outputResults / mixTotal) * 100),
      outcomePct: Math.round((outcomeResults / mixTotal) * 100),
      loading: this.loadingSummaries()
    };
  });

  /** Multi-segment conic-gradient for the status donut chart. */
  readonly statusConic = computed(() => {
    const rows = this.statusRows();
    if (!rows.length) return 'conic-gradient(#e2e8f0 0% 100%)';
    let cursor = 0;
    const parts: string[] = [];
    for (const row of rows) {
      if (row.sharePct <= 0) continue;
      const end = cursor + row.sharePct;
      parts.push(`${row.color} ${cursor}% ${end}%`);
      cursor = end;
    }
    if (!parts.length) return 'conic-gradient(#e2e8f0 0% 100%)';
    if (cursor < 100) parts.push(`#e2e8f0 ${cursor}% 100%`);
    return `conic-gradient(${parts.join(', ')})`;
  });

  /** AoW rows ranked by volume, with bar widths for volume charts. */
  readonly aowVolumeRows = computed(() => {
    const rows = [...this.aowProgressRows()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
    const max = Math.max(...rows.map(r => r.total), 1);
    return rows.map(r => ({
      ...r,
      volumePct: Math.round((r.total / max) * 100),
      editingShare: r.total ? Math.round((r.editing / r.total) * 100) : 0,
      submittedShare: r.total ? Math.round((r.submitted / r.total) * 100) : 0
    }));
  });

  /** Horizontal funnel steps for the Dashboard pipeline chart. */
  readonly funnelSteps = computed(() => {
    const p = this.pipelineStats();
    const qaedPct = p.total ? Math.round((p.qaed / p.total) * 100) : 0;
    return [
      { label: 'Editing', count: p.editing, barPct: Math.max(p.editingPct, p.editing ? 4 : 0), color: '#f59e0b' },
      { label: 'Pending', count: p.pending, barPct: Math.max(p.pendingPct, p.pending ? 4 : 0), color: '#94a3b8' },
      { label: 'QAed', count: p.qaed, barPct: Math.max(qaedPct, p.qaed ? 4 : 0), color: '#3b82f6' },
      { label: 'Submitted', count: p.submitted, barPct: Math.max(p.submittedPct, p.submitted ? 4 : 0), color: '#22c55e' }
    ];
  });

  /** Accent hex for the selected program (icon-derived, orange fallback). */
  readonly accent = computed(() => this.accentHex(this.selected()?.initiativeCode));

  /** Ready-to-bind accent surfaces for the selected program. */
  readonly accentTheme = computed<AccentTheme>(() => this.themeFor(this.accent()));

  /** Accent surfaces for the hovered program (drives the flyout). */
  readonly hoveredTheme = computed<AccentTheme>(() => this.themeFor(this.accentHex(this.hoveredProgram()?.initiativeCode)));

  private accentHex(code: string | undefined): string {
    return (code && this.accentColors().get(code)) || FALLBACK_ACCENT;
  }

  private themeFor(base: string): AccentTheme {
    return {
      solid: base,
      soft: this.rgba(base, 0.14),
      gradient: `linear-gradient(150deg, ${this.shade(base, 0.2)} 0%, ${this.shade(base, -0.14)} 100%)`,
      glow: `radial-gradient(58% 58% at 28% 18%, ${this.rgba(base, 0.42)} 0%, ${this.rgba(base, 0)} 72%)`,
      buttonShadow: `0 8px 20px ${this.rgba(base, 0.42)}`,
      cardShadow: `0 14px 30px ${this.rgba(base, 0.32)}`
    };
  }

  private spParamSub?: Subscription;
  private entityParamSub?: Subscription;
  private phasesSub?: Subscription;
  /** Programme code from the path still waiting for the programme list to load. */
  private pendingProgramCode: string | null = null;

  ngOnInit(): void {
    this.restoreFromUrl();
    if (this.allPrograms().length === 0) {
      this.homeSE.getScienceProgramsProgress();
    }
    // The programme now comes from the PATH (`…/entity-details/SP01`), by code. In-app
    // navigation keeps this component alive, so react to param changes as well as the first load.
    this.entityParamSub = this.route?.paramMap?.subscribe(pm => this.selectProgramByCode(pm?.get('entityId')));

    this.reportingPhases.set(this.phasesSE?.phases?.reporting ?? []);
    if (typeof this.phasesSE?.getPhasesObservable === 'function') {
      this.phasesSub = this.phasesSE.getPhasesObservable().subscribe(list => this.reportingPhases.set(list ?? []));
    }

    // React to `?sp=` changes — kept for links saved before the move to path addressing.
    this.spParamSub = this.route?.queryParamMap?.subscribe(qp => {
      const raw = qp.get('sp');
      const id = raw ? Number(raw) : NaN;
      if (!Number.isNaN(id)) {
        this.selectedId.set(id);
        this.scope.set('program');
      }
      // Browser back/forward on Planned ToC browse mode.
      if (this.rfrView() === 'planned') {
        const view = parsePlannedBrowseView(qp.get('tocView')) ?? 'aows';
        if (view !== this.plannedBrowseView()) {
          this.restoringPlannedUrl = true;
          this.plannedBrowseView.set(view);
          this.plannedTypeFilter.set([]);
          this.plannedSearch.set('');
          if (view === 'byAow') {
            this.pendingPlannedAow = qp.get('tocAow');
          } else if (view === 'indicators') {
            this.loadAllTocs();
          }
          queueMicrotask(() => {
            this.restoringPlannedUrl = false;
          });
        } else if (view === 'byAow') {
          const tocAow = qp.get('tocAow');
          if (tocAow && tocAow !== this.plannedHloAowCode()) {
            this.pendingPlannedAow = tocAow;
            const list = this.aows();
            if (list.some(a => a.code === tocAow)) {
              this.pendingPlannedAow = null;
              this.setPlannedHloAow(tocAow);
            }
          }
        }
      }
    });
    this.startCenterRotation();
  }

  /**
   * Selects the programme named by the `:entityId` path segment (a CODE such as `SP01`).
   * The list may not have arrived yet on a cold load, so the pending code is retried from the
   * `allPrograms()` effect below.
   */
  private selectProgramByCode(code: string | null): void {
    if (!code) return;
    this.pendingProgramCode = code;
    const match = this.allPrograms().find(sp => sp.initiativeCode === code);
    if (match) {
      this.pendingProgramCode = null;
      this.selectedId.set(match.initiativeId);
      this.scope.set('program');
    }
  }

  /** Rehydrate the view from the URL so a reload stays on the same program + AOW + Planned mode. */
  private restoreFromUrl(): void {
    const qp = this.route?.snapshot?.queryParamMap;
    if (!qp) return;
    const sp = qp.get('sp');
    if (sp) {
      const id = Number(sp);
      if (!Number.isNaN(id)) {
        this.selectedId.set(id);
        this.scope.set('program');
      }
    }
    const aow = qp.get('aow');
    this.pendingAow = aow || null;
    if (this.pendingAow) {
      this.pendingFilters = { typ: qp.get('typ') || null, st: qp.get('st') || null, q: qp.get('q') || '' };
    }
    this.restorePlannedBrowseFromQuery(qp);
  }

  /** Apply `?tocView=` / `?tocAow=` on the Planned ToC surface. */
  private restorePlannedBrowseFromQuery(qp: { get(name: string): string | null }): void {
    if ((this.route.snapshot.data['rfrView'] as RfrView) !== 'planned') return;
    const view = parsePlannedBrowseView(qp.get('tocView'));
    if (!view) return;
    this.restoringPlannedUrl = true;
    this.plannedBrowseView.set(view);
    this.plannedTypeFilter.set([]);
    this.plannedSearch.set('');
    if (view === 'byAow') {
      this.pendingPlannedAow = qp.get('tocAow');
    } else if (view === 'indicators') {
      queueMicrotask(() => this.loadAllTocs());
    }
    queueMicrotask(() => {
      this.restoringPlannedUrl = false;
    });
  }

  /** Leaving the lab must never strand the shell in focus mode — or leak a timer. */
  ngOnDestroy(): void {
    this.dataControlSE.focusMode.set(false);
    this.dataControlSE.slimNav.set(false);
    // EntityAowService is providedIn:'root': leaving the page mid-modal would otherwise strand
    // `showReportResultModal = true` and a stale node for the next surface that reads them.
    this.entityAowService.onCloseReportResultModal();
    this.spParamSub?.unsubscribe();
    this.entityParamSub?.unsubscribe();
    this.phasesSub?.unsubscribe();
    if (this.centerTimer) clearInterval(this.centerTimer);
  }

  select(sp: SPProgress): void {
    this.selectedId.set(sp.initiativeId);
    this.scope.set('program');
    // If the tour is parked on "pick a program", this is the cue it was waiting for.
    // Deferred: the program's blocks must be in the DOM before they can be highlighted.
    setTimeout(() => this.guideSE.notify('program-selected', this.guideContext()), 350);
  }

  /** Fetch (and cache) the Areas of Work for a program by its official code. */
  private loadAows(code: string): void {
    if (this.aowsByCode().has(code) || this.loadingCodes().has(code)) return;
    this.loadingCodes.update(set => new Set(set).add(code));
    this.api.resultsSE.GET_ClarisaGlobalUnits(code).subscribe({
      next: ({ response }) => this.cacheAows(code, response?.units ?? []),
      error: () => this.cacheAows(code, [])
    });
  }

  private cacheAows(code: string, units: Unit[]): void {
    this.aowsByCode.update(map => new Map(map).set(code, units));
    this.loadingCodes.update(set => {
      const next = new Set(set);
      next.delete(code);
      return next;
    });
  }

  /**
   * Resolves `versionId` via `effectiveVersionId()` (design.md DD-1 — the single resolver) and
   * (re)loads the selected program's indicator-contribution summary. Extracted so it can be
   * called both on program selection AND on a later phase-context update (see the constructor
   * effect above) — the resolution and the fetch must always happen together, or the two would
   * each resolve `versionId` at DIFFERENT moments (see the effect's comment for why that is the
   * bug).
   */
  private refreshSelectedSummaries(): void {
    const sp = this.selected();
    const code = sp?.initiativeCode;
    if (!code) return;
    const versionId = this.effectiveVersionId();
    this.loadSummaries(code, versionId ?? undefined);
  }

  /**
   * Fetch (and cache) the indicator-contribution summary (result-type categories).
   * `versionId` resolved by the caller via `effectiveVersionId()` (design.md DD-1).
   */
  private loadSummaries(code: string, versionId?: number): void {
    const key = this.summaryCacheKey(code, versionId);
    if (this.summariesByCode().has(key) || this.loadingSummaryCodes().has(key)) return;
    this.loadingSummaryCodes.update(set => new Set(set).add(key));
    this.api.resultsSE.GET_IndicatorContributionSummary(code, versionId).subscribe({
      next: (res: { response?: { totalsByType?: IndicatorCategory[] } }) => this.cacheSummaries(key, res?.response?.totalsByType ?? []),
      error: () => this.cacheSummaries(key, [])
    });
  }

  private cacheSummaries(key: string, items: IndicatorCategory[]): void {
    this.summariesByCode.update(map => new Map(map).set(key, items));
    this.loadingSummaryCodes.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  setCategoryTab(tab: 'outputs' | 'outcomes'): void {
    this.categoryTab.set(tab);
  }

  /** Enter the AOW detail view and lazy-load its indicators. */
  openAow(aowCode: string): void {
    // Deferred below: the AOW view must be in the DOM before it can be highlighted.
    setTimeout(() => this.guideSE.notify('aow-opened', this.guideContext()), 700);
    this.activeAowCode.set(aowCode);
    this.viewMode.set('aow');
    this.clearFilters();
    this.indicatorTab.set('outputs');
    const sp = this.selected();
    if (sp) this.loadToc(sp.initiativeCode, aowCode);
  }

  backToHome(): void {
    this.viewMode.set('home');
    this.activeAowCode.set(null);
  }

  // ---- Navigation panel: 3 views (AoWs · indicators · grouped accordion) ----

  /**
   * How the AoW surface is browsed. `aows`/`indicators` keep the left panel;
   * `full` hides the panel and shows every AoW with its indicators, full-width.
   */
  readonly panelView = signal<'aows' | 'indicators' | 'full'>('aows');
  readonly panelViews = [
    { id: 'aows', label: 'Areas of Work', icon: 'grid_view' },
    { id: 'indicators', label: 'Indicators', icon: 'insights' },
    { id: 'full', label: 'Full view', icon: 'view_agenda' }
  ] as const;
  /** AoWs expanded in the full (accordion) view. */
  readonly expandedPanelAows = signal<Set<string>>(new Set());

  setPanelView(view: 'aows' | 'indicators' | 'full'): void {
    this.panelView.set(view);
    // The indicator / full views need every AoW's ToC, not just the open one.
    if (view !== 'aows') this.loadAllTocs();
  }

  private loadAllTocs(): void {
    const sp = this.selected()?.initiativeCode;
    if (!sp) return;
    this.aows().forEach(aow => this.loadToc(sp, aow.code));
    // Program-level siblings of the AoWs — not nested under any of them.
    this.loadToc(sp, INTERMEDIATE_OUTCOMES_CODE);
    this.loadToc(sp, OUTCOMES_2030_CODE);
  }

  /** Indicators grouped by their AoW (output + outcome tiers), for the panel views. */
  readonly indicatorsByAow = computed(() => {
    const sp = this.selected()?.initiativeCode;
    const map = this.tocByKey();
    const loadingKeys = this.loadingTocKeys();
    return this.aows().map(aow => {
      const key = this.tocCacheKey(sp, aow.code);
      const toc = map.get(key);
      const fromTier = (groups: any[] | undefined, tier: 'output' | 'outcome') =>
        (groups ?? []).flatMap((g: any) =>
          (g?.indicators ?? []).map((i: any) => ({
            ...i,
            __aowCode: aow.code,
            __aowName: aow.name,
            __hlo: g?.result_title,
            __tier: tier,
            toc_result_id: g?.toc_result_id,
            __hloNode: g,
            __isIntermediateCrosscut: tier === 'outcome' && g?.is_aow !== true
          }))
        );
      const indicators = [...fromTier(toc?.outputs, 'output'), ...fromTier(toc?.outcomes, 'outcome')];
      return { aow, indicators, count: indicators.length, loading: !toc && loadingKeys.has(key) };
    });
  });

  /** Flat list of every indicator in the program, for the "indicators" view. */
  readonly allPanelIndicators = computed(() => this.indicatorsByAow().flatMap(x => x.indicators));

  isPanelAowExpanded(code: string): boolean {
    if (this.expandedPanelAows().has(code)) return true;
    // While searching on Planned → Areas of Work, auto-open parents that matched via children.
    return this.plannedSearchExpandAowCodes().has(code);
  }

  togglePanelAow(code: string): void {
    this.expandedPanelAows.update(set => {
      const next = new Set(set);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  /** Expand/collapse an AoW inline in the planned-ToC list, lazily loading its ToC on open. */
  toggleInlineAow(code: string): void {
    const sp = this.selected()?.initiativeCode;
    if (sp && !this.isPanelAowExpanded(code)) this.loadToc(sp, code);
    this.togglePanelAow(code);
  }

  /** The {aow, indicators, count, loading} bundle for a single AoW code (from indicatorsByAow). */
  indicatorsForAow(code: string) {
    return this.indicatorsByAow().find(x => x.aow.code === code) ?? null;
  }

  /**
   * Feed for the Reporting tab table (`app-reporting-aow-table`).
   *
   * Top-level cards, in order:
   *  1. One card per AoW — **HLOs only** (output tier). Outcomes do not nest under AoWs.
   *  2. Intermediate Outcomes — `GET_IntermediateOutcomes`, program-level sibling.
   *  3. 2030 Outcomes — `GET_2030Outcomes`, program-level sibling.
   *
   * The design reference nests Intermediate / 2030 under each AoW as HLO-level children — that is a
   * known bug the owner rejected. Real PRMS data (and the previous entity-aow sidebar) treats them
   * as siblings of the Areas of Work list, each with its own endpoint.
   */
  readonly reportingGroups = computed<ReportingAowGroup[]>(() => {
    const aowFilter = this.reportingAowFilter();
    const typology = this.reportingTypologyFilter();
    const typeFilter = this.reportingTypeFilter();
    // Category == `result_type_name` ONLY (Knowledge product, Innovation development, …). The old
    // fallback to `type_name` was wrong: that field carries the indicator's own name ("Proportion of
    // CGIAR-NARS-SME breeding pipelines within…"), so indicators without a result type polluted the
    // filter with 160+ one-off entries.
    const matchTypology = (i: ReportingIndicator) => typology === 'all' || (i?.result_type_name ?? '').trim() === typology;
    const sp = this.selected()?.initiativeCode;

    // Type filter (CURRENT selType) — which top-level card families stay visible.
    const wantAow = typeFilter === 'all' || typeFilter === 'hlo' || typeFilter === 'outcome';
    const wantIo = typeFilter === 'all' || typeFilter === 'intermediate_outcome';
    const wantO30 = typeFilter === 'all' || typeFilter === 'outcome_2030';

    // Section filter — a set of AoW codes and/or the two program-level bucket codes. Empty = all.
    const noSection = aowFilter.length === 0;
    const sectionPicked = (code: string) => noSection || aowFilter.includes(code);
    const sectionIsAow = noSection || aowFilter.some(c => c !== INTERMEDIATE_OUTCOMES_CODE && c !== OUTCOMES_2030_CODE);
    const sectionIsIo = sectionPicked(INTERMEDIATE_OUTCOMES_CODE);
    const sectionIsO30 = sectionPicked(OUTCOMES_2030_CODE);

    // 1) AoW cards — HLOs by default; outcome tier only when Type = Outcome.
    const aowCards: ReportingAowGroup[] = wantAow
      ? this.plannedFilteredAows()
          .filter(aow => sectionIsAow && sectionPicked(aow.code))
          .map(aow => {
            const bundle = this.indicatorsForAow(aow.code) ?? {
              aow,
              indicators: [] as ReportingIndicator[],
              count: 0,
              loading: false
            };
            // Type=all → both HLO + outcome tiers (table splits them into CURRENT bands).
            // Type=hlo / outcome → one tier only.
            const all = bundle.indicators ?? [];
            const tierRows =
              typeFilter === 'outcome'
                ? all.filter(i => i?.__tier === 'outcome')
                : typeFilter === 'hlo'
                  ? all.filter(i => i?.__tier !== 'outcome')
                  : all;
            const rows = tierRows.filter(matchTypology);
            return {
              aow,
              indicators: rows,
              count: tierRows.length,
              loading: bundle.loading,
              kind: 'aow' as const
            };
          })
      : [];

    // 2) Intermediate Outcomes — dedicated endpoint, cached under INTERMEDIATE_OUTCOMES_CODE.
    const ioKey = this.tocCacheKey(sp, INTERMEDIATE_OUTCOMES_CODE);
    const ioToc = this.tocByKey().get(ioKey);
    const ioLoading = this.loadingTocKeys().has(ioKey);
    const ioAll = this.flattenBucketIndicators(ioToc?.outputs, INTERMEDIATE_OUTCOMES_CODE, 'Intermediate Outcomes');
    const intermediateCard: ReportingAowGroup | null =
      wantIo && sectionIsIo && (ioAll.length || ioLoading)
        ? {
            // Sentence case, like every other surface (the reference never title-cases "outcomes").
            aow: { code: INTERMEDIATE_OUTCOMES_CODE, name: 'Intermediate outcomes' },
            indicators: ioAll.filter(matchTypology),
            count: ioAll.length,
            loading: ioLoading && !ioAll.length,
            kind: 'intermediate'
          }
        : null;

    // 3) 2030 Outcomes — dedicated endpoint.
    const o30Key = this.tocCacheKey(sp, OUTCOMES_2030_CODE);
    const o30Toc = this.tocByKey().get(o30Key);
    const o30Loading = this.loadingTocKeys().has(o30Key);
    const o30All = this.flattenBucketIndicators(o30Toc?.outputs, OUTCOMES_2030_CODE, '2030 Outcomes');
    const o30Card: ReportingAowGroup | null =
      wantO30 && sectionIsO30 && (o30All.length || o30Loading)
        ? {
            aow: { code: OUTCOMES_2030_CODE, name: '2030 outcomes' },
            indicators: o30All.filter(matchTypology),
            count: o30All.length,
            loading: o30Loading && !o30All.length,
            kind: '2030'
          }
        : null;

    return [...aowCards, ...(intermediateCard ? [intermediateCard] : []), ...(o30Card ? [o30Card] : [])];
  });

  /** Flatten a program-level ToC list (`tocResults`) into reporting indicator rows. */
  private flattenBucketIndicators(
    groups: any[] | undefined,
    bucketCode: string,
    bucketName: string
  ): ReportingIndicator[] {
    return (groups ?? []).flatMap((g: any) =>
      (g?.indicators ?? []).map((i: any) => ({
        ...i,
        __aowCode: g?.work_package_code || g?.aow_code || bucketCode,
        __aowName: g?.work_package_name || g?.aow_name || bucketName,
        __hlo: g?.result_title,
        __tier: 'outcome' as const,
        toc_result_id: g?.toc_result_id,
        __hloNode: g
      }))
    );
  }

  /**
   * Toolbar state for the Reporting tab. Kept SEPARATE from the AoW-detail `statusFilter` /
   * `typologyFilter` signals: those are asserted by existing tests and drive a different surface,
   * and sharing them would couple two toolbars that happen to look alike.
   */
  readonly reportingStatusFilter = signal<string>('all');
  readonly reportingViewMode = signal<'grouped' | 'flat'>('grouped');
  /**
   * Global disclosure switch of the Reporting tab (P2-3252). `false` = the collapsed reading state
   * every programme opens in (P2-3251); the toolbar's single control flips it and the grouped table
   * takes it as the level default for BOTH AoW cards and their HLO sub-groups.
   */
  readonly reportingAllExpanded = signal(false);
  /**
   * What the table reports back: every visible AoW card is open right now (overrides included).
   * The toolbar label is written from THIS, not from `reportingAllExpanded` — otherwise a user who
   * opened every card by hand got a press that changed nothing and a label that lied (QA: dead click).
   */
  readonly reportingAllOpen = signal(false);
  /**
   * Press counter. `reportingAllExpanded` can legitimately be asked for the value it already holds
   * (everything opened by hand → the press means "collapse", i.e. `false`, which is where it already
   * is), so the boolean alone cannot re-seed the list. The nonce makes every press a real change.
   */
  readonly reportingExpandNonce = signal(0);
  /** Section filter — multi-select like the reference; empty array means "every section". */
  readonly reportingAowFilter = signal<string[]>([]);
  readonly reportingTypologyFilter = signal<string>('all');
  /** CURRENT selType: all | hlo | outcome | intermediate_outcome | outcome_2030 */
  readonly reportingTypeFilter = signal<string>('all');

  /**
   * Toolbar's single Expand all / Collapse all control (P2-3252). One level default, not a per-card
   * map: the table takes `reportingAllExpanded` as its default and drops the user's individual
   * overrides on every press (the nonce guarantees the reset even when the boolean repeats).
   *
   * The intent is read from what is ON SCREEN (`reportingAllOpen`), not from the last press: with
   * everything already open by hand the press must COLLAPSE, and with everything closed by hand it
   * must EXPAND. Negating the previous press instead is what produced the dead click.
   */
  toggleReportingExpandAll(): void {
    this.reportingAllExpanded.set(!this.reportingAllOpen());
    this.reportingExpandNonce.update(n => n + 1);
  }

  /**
   * Is ANY Reporting-tab control narrowing the list right now?
   *
   * The table cannot answer this itself: only `plannedSearch` and `reportingStatusFilter` are passed
   * down, while Section / Type / Category are applied here in `reportingGroups()`. So a card emptied
   * by Category reached the table indistinguishable from an Area of Work with nothing planned, and
   * the empty state said "this area of work has no planned indicators yet" about a card full of
   * them (P2-3405).
   *
   * ONE computed over all five signals on purpose: a sixth filter added later has exactly one place
   * to be remembered, and forgetting it here is visible immediately rather than as a wrong sentence.
   */
  readonly reportingFiltersActive = computed(
    () =>
      !!this.plannedSearch().trim() ||
      this.reportingAowFilter().length > 0 ||
      this.reportingTypeFilter() !== 'all' ||
      this.reportingTypologyFilter() !== 'all' ||
      this.reportingStatusFilter() !== 'all'
  );

  /** `Clear filters` in the Reporting tab's empty state. Resets the same five signals, together. */
  clearReportingFilters(): void {
    this.plannedSearch.set('');
    this.reportingAowFilter.set([]);
    this.reportingTypeFilter.set('all');
    this.reportingTypologyFilter.set('all');
    this.reportingStatusFilter.set('all');
  }

  /**
   * Section dropdown = every AoW + Intermediate Outcomes + 2030 Outcomes (CURRENT selSection).
   */
  readonly reportingSectionOptions = computed(() => {
    const aows = this.aows().map(a => ({
      value: a.code,
      label: `${a.code} · ${a.name}`
    }));
    // Two groups, as in the reference panel: the programme's areas of work, then the two
    // programme-level buckets.
    return [
      { label: 'Areas of work', items: aows },
      {
        label: 'Programme-level',
        items: [
          { value: INTERMEDIATE_OUTCOMES_CODE, label: 'Intermediate outcomes' },
          { value: OUTCOMES_2030_CODE, label: '2030 outcomes' }
        ]
      }
    ];
  });

  /**
   * Category options for the band filter, derived from loaded ToCs so the dropdown never
   * offers a type with zero rows. Covers AoW outputs + Intermediate + 2030.
   */
  readonly reportingTypologyOptions = computed(() => {
    const set = new Set<string>();
    // Only `result_type_name` — see `matchTypology` in `reportingGroups` for why `type_name` is not
    // a category. Indicators without a result type simply do not contribute an option.
    const collect = (rows: ReportingIndicator[] | undefined) => {
      for (const i of rows ?? []) {
        const t = i?.result_type_name;
        if (t) set.add(String(t).trim());
      }
    };
    for (const g of this.indicatorsByAow()) collect(g.indicators);
    const sp = this.selected()?.initiativeCode;
    const map = this.tocByKey();
    collect(this.flattenBucketIndicators(map.get(this.tocCacheKey(sp, INTERMEDIATE_OUTCOMES_CODE))?.outputs, INTERMEDIATE_OUTCOMES_CODE, 'IO'));
    collect(this.flattenBucketIndicators(map.get(this.tocCacheKey(sp, OUTCOMES_2030_CODE))?.outputs, OUTCOMES_2030_CODE, '2030'));
    // Leading row resets the pill back to its placeholder (`all` is the band's empty sentinel).
    return [
      { value: 'all', label: 'All categories' },
      ...[...set].sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }))
    ];
  });

  /**
   * Row click opens the read-only indicator context in the drawer; "Report" no longer goes there —
   * it opens the legacy report modal, the surface this flow has always used to create a result.
   */
  onReportingRowOpen(row: ReportingIndicator): void {
    this.manageIndicator(row, row.__hlo ?? '', 'info');
  }

  /**
   * KPI "Report" → the ASIDE, not the legacy modal.
   *
   * `primeEntityAowContext()` still runs first: `EntityAowService.canReportResults()` depends on
   * the programme being seeded and on the phase check having resolved, and that flag is what
   * decides whether the form shows a submit affordance at all.
   *
   * The ToC node is passed EXPLICITLY (`__hloNode`) rather than left to the title match inside
   * `manageIndicator` — see the note there. Every other entry point in this file still opens the
   * legacy modal; only this button moved.
   */
  onReportingRowReport(row: ReportingIndicator): void {
    this.primeEntityAowContext();
    const raw = row as unknown as Record<string, unknown>;
    this.manageIndicator(row, row.__hlo ?? '', 'report', raw['__hloNode']);
  }

  /**
   * Target and Achieved open the same drawer on the tab that answers each question: `info` carries
   * the target breakdown, `report` the reported values. The reference uses popovers; the app already
   * ships this drawer, and forking it to add popovers would put the same data behind two surfaces.
   *
   * Recorded deviation — see docs/DESIGN-DEVIATIONS.md §9. Do not "restore fidelity" by adding the
   * popovers back beside the drawer.
   */
  onReportingOpenTarget(row: ReportingIndicator): void {
    this.manageIndicator(row, row.__hlo ?? '', 'info');
  }

  onReportingOpenAchieved(row: ReportingIndicator): void {
    this.manageIndicator(row, row.__hlo ?? '', 'report');
  }

  /**
   * Planned-ToC browse modes (home surface only — independent of AoW-detail `panelView`).
   * Default = Areas of Work list; By AOW = one AOW + typology filter; Indicators = flat list.
   */
  readonly plannedBrowseView = signal<PlannedBrowseView>('aows');
  readonly plannedBrowseViews = [
    { id: 'aows' as const, label: 'Areas of Work', icon: 'account_tree' },
    { id: 'byAow' as const, label: 'By AOW', icon: 'folder_open' },
    { id: 'indicators' as const, label: 'Indicators', icon: 'insights' }
  ];
  readonly expandedPlannedHlos = signal<Set<string>>(new Set());
  /** Layout for By AOW / Indicators lists on the planned surface. */
  readonly plannedLayout = signal<'cards' | 'table'>('cards');
  /** Selected AOW code for the By AOW browse mode. */
  readonly plannedHloAowCode = signal<string | null>(null);
  /**
   * Multiselect of indicator typologies (`type_name`).
   * Bound to `app-pr-multi-select` as `{ name }[]`. Empty = all.
   */
  readonly plannedTypeFilter = signal<{ name: string }[]>([]);
  /** Client-side text search across Planned browse modes. */
  readonly plannedSearch = signal('');

  /** True when search text and/or typology multiselect are active. */
  readonly hasPlannedFilters = computed(
    () => !!this.plannedSearch().trim() || this.plannedTypeFilter().length > 0
  );

  /** Active Planned text search (used to force-expand matching parents). */
  readonly plannedSearchActive = computed(() => !!this.plannedSearch().trim());

  /**
   * AoW codes that must stay expanded while searching — parents with internal
   * indicator hits (even when the AoW title itself does not match).
   */
  readonly plannedSearchExpandAowCodes = computed(() => {
    const set = new Set<string>();
    if (!this.plannedSearchActive() || this.plannedBrowseView() !== 'aows') return set;
    for (const aow of this.plannedFilteredAows()) set.add(aow.code);
    return set;
  });

  /**
   * HLO titles that must stay expanded while searching in By AOW —
   * groups kept because children match, not only because the HLO title matches.
   */
  readonly plannedSearchExpandHloTitles = computed(() => {
    const set = new Set<string>();
    if (!this.plannedSearchActive() || this.plannedBrowseView() !== 'byAow') return set;
    for (const g of this.plannedHloGroups()) set.add(g.title);
    return set;
  });

  clearPlannedFilters(): void {
    this.plannedSearch.set('');
    this.plannedTypeFilter.set([]);
  }

  setPlannedBrowseView(view: PlannedBrowseView): void {
    this.plannedBrowseView.set(view);
    this.plannedTypeFilter.set([]);
    this.plannedSearch.set('');
    if (view === 'byAow') {
      const code = this.plannedHloAowCode() ?? this.aows()[0]?.code ?? null;
      if (code) this.setPlannedHloAow(code);
    } else if (view === 'indicators') {
      this.loadAllTocs();
    }
  }

  setPlannedLayout(layout: 'cards' | 'table'): void {
    this.plannedLayout.set(layout);
  }

  setPlannedHloAow(code: string | null): void {
    this.plannedHloAowCode.set(code);
    this.expandedPlannedHlos.set(new Set());
    this.plannedTypeFilter.set([]);
    this.plannedSearch.set('');
    const sp = this.selected()?.initiativeCode;
    if (sp && code) this.loadToc(sp, code);
  }

  onPlannedTypeFilterChange(selected: { name: string }[] | null): void {
    // Keep stable `{ name }` objects only — pr-multi-select spreads clones with
    // `selected`/`new` flags; those must not feed back into ngModel or checkboxes desync.
    const next = (Array.isArray(selected) ? selected : [])
      .map(t => (typeof t === 'string' ? t : t?.name))
      .filter((name): name is string => !!name)
      .map(name => ({ name }));
    this.plannedTypeFilter.set(next);
  }

  /** Options for the Area of Work select (By AOW mode). */
  readonly plannedAowSelectOptions = computed(() =>
    this.aows().map(a => ({ label: `${a.code} · ${a.name}`, value: a.code }))
  );

  /**
   * Typology options for the multiselect (`type_name` from indicators).
   * By AOW → High-Level Output indicators of the selected AOW; Indicators → whole program.
   */
  readonly plannedTypologyMultiOptions = computed(() => {
    const view = this.plannedBrowseView();
    const code = this.plannedHloAowCode();
    const source =
      view === 'byAow' && code
        ? (this.indicatorsForAow(code)?.indicators ?? []).filter(i => i?.__tier === 'output')
        : this.allPanelIndicators();
    const set = new Set<string>();
    for (const ind of source) {
      if (ind?.type_name) set.add(String(ind.type_name));
    }
    return [...set].sort((a, b) => a.localeCompare(b)).map(name => ({ name }));
  });

  readonly plannedHloLoading = computed(() => {
    const code = this.plannedHloAowCode();
    if (!code) return false;
    return this.indicatorsForAow(code)?.loading ?? false;
  });

  /**
   * Areas of Work filtered + ranked by Planned search.
   * 1 phrase → 2 unordered tokens → 3 fuzzy similarity (typos).
   */
  readonly plannedFilteredAows = computed(() => {
    const parsed = parsePlannedSearch(this.plannedSearch());
    const list = this.aows();
    if (!parsed.phrase) return list;

    return list
      .map(aow => {
        let best = plannedSearchEvaluate(`${aow.code} ${aow.name}`, parsed);
        for (const ind of this.indicatorsForAow(aow.code)?.indicators ?? []) {
          const next = plannedSearchEvaluate(indicatorSearchHaystack(ind), parsed);
          if (comparePlannedSearchEvaluation(next, best) < 0) best = next;
        }
        return { aow, eval: best };
      })
      .filter(x => x.eval.rank > 0)
      .sort(
        (a, b) =>
          comparePlannedSearchEvaluation(a.eval, b.eval) || String(a.aow.code).localeCompare(String(b.aow.code))
      )
      .map(x => x.aow);
  });

  /** High-Level Output groups for the selected AOW, filtered/ranked by typology + text search. */
  readonly plannedHloGroups = computed(() => {
    const code = this.plannedHloAowCode();
    if (!code) return [];
    const typeSet = new Set(this.plannedTypeFilter().map(t => t?.name).filter(Boolean));
    const parsed = parsePlannedSearch(this.plannedSearch());
    let inds = (this.indicatorsForAow(code)?.indicators ?? []).filter(i => i?.__tier === 'output');
    if (typeSet.size) inds = inds.filter(i => typeSet.has(i?.type_name));
    return this.rankPlannedHloGroups(this.groupIndicatorsByHlo(inds), parsed);
  });

  /** Flat indicators for Indicators mode — typology + ranked text search. */
  readonly plannedFilteredIndicators = computed(() => {
    const typeSet = new Set(this.plannedTypeFilter().map(t => t?.name).filter(Boolean));
    const parsed = parsePlannedSearch(this.plannedSearch());
    let inds = this.allPanelIndicators();
    if (typeSet.size) inds = inds.filter(i => typeSet.has(i?.type_name));
    if (!parsed.phrase) return inds;
    return inds
      .map(ind => ({ ind, eval: plannedSearchEvaluate(indicatorSearchHaystack(ind), parsed) }))
      .filter(x => x.eval.rank > 0)
      .sort((a, b) => comparePlannedSearchEvaluation(a.eval, b.eval))
      .map(x => x.ind);
  });

  /** HLO groups inside an expanded AoW card, filtered/ranked by Planned search. */
  plannedAowHloGroups(indicators: any[] | null | undefined) {
    return this.rankPlannedHloGroups(this.groupIndicatorsByHlo(indicators), parsePlannedSearch(this.plannedSearch()));
  }

  /**
   * Keep groups that match (phrase / unordered tokens / fuzzy).
   * Order: 1 exact phrase → 2 split words → 3 average similarity (typos).
   */
  private rankPlannedHloGroups(
    groups: { title: string; indicators: any[]; split: { code: string | null; name: string } }[],
    parsed: ReturnType<typeof parsePlannedSearch>
  ) {
    if (!parsed.phrase) {
      return groups.map(g => ({ ...g, count: g.indicators.length }));
    }

    return groups
      .map(g => {
        const parentEval = plannedSearchEvaluate(String(g.title ?? ''), parsed);
        const rankedKids = g.indicators
          .map(ind => ({ ind, eval: plannedSearchEvaluate(indicatorSearchHaystack(ind), parsed) }))
          .sort((a, b) => comparePlannedSearchEvaluation(a.eval, b.eval));

        // Parent hit → keep all children (matches first). Else → only matching children.
        const ordered =
          parentEval.rank > 0 ? rankedKids.map(x => x.ind) : rankedKids.filter(x => x.eval.rank > 0).map(x => x.ind);

        const bestChild = rankedKids.reduce<PlannedSearchEvaluation>(
          (best, x) => (comparePlannedSearchEvaluation(x.eval, best) < 0 ? x.eval : best),
          { rank: 0, score: 0, similarWords: [] }
        );
        const groupEval = parentEval.rank > 0 ? parentEval : bestChild;
        return { ...g, indicators: ordered, count: ordered.length, eval: groupEval };
      })
      .filter(g => g.count > 0)
      .sort((a, b) => comparePlannedSearchEvaluation(a.eval, b.eval));
  }

  /** Group one AoW's indicators by HLO for the expanded Areas-of-Work cards. */
  groupIndicatorsByHlo(indicators: any[] | null | undefined): { title: string; indicators: any[]; split: { code: string | null; name: string } }[] {
    const map = new Map<string, any[]>();
    for (const ind of indicators ?? []) {
      const key = (ind.__hlo as string) || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ind);
    }
    return [...map.entries()].map(([title, inds]) => ({ title, indicators: inds, split: this.splitGroupTitle(title) }));
  }

  isPlannedHloExpanded(title: string): boolean {
    if (this.expandedPlannedHlos().has(title)) return true;
    // While searching on By AOW, auto-open HLO groups that matched via inner indicators.
    return this.plannedSearchExpandHloTitles().has(title);
  }

  togglePlannedHlo(title: string): void {
    this.expandedPlannedHlos.update(set => {
      const next = new Set(set);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  setIndicatorTab(tab: 'outputs' | 'outcomes'): void {
    this.indicatorTab.set(tab);
  }

  isGroupCollapsed(title: string): boolean {
    return !this.expandedGroups().has(title);
  }

  toggleGroup(title: string): void {
    this.expandedGroups.update(set => {
      const next = new Set(set);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  /** Status label derived from progress_percentage (mirrors entity-aow-aow). */
  statusLabel(pct: string | number | null | undefined): string {
    const p = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0)) || 0;
    if (p <= 0) return 'Not started';
    if (p <= 99) return 'In progress';
    if (p === 100) return 'Achieved';
    return 'Overachieved';
  }

  /** Tailwind classes for the status chip (project tokens, ≥4.5:1 text contrast). */
  statusChip(pct: string | number | null | undefined): string {
    switch (this.statusLabel(pct)) {
      case 'Achieved':
        return 'bg-[var(--pr-color-green-50)] text-[var(--pr-color-green-700)]';
      case 'Overachieved':
        return 'bg-[var(--pr-color-blue-50)] text-[var(--pr-color-blue-800)]';
      case 'In progress':
        return 'bg-[var(--pr-color-yellow-75)] text-[var(--pr-color-yellow-600)]';
      default:
        return 'bg-[var(--pr-color-accents-2)] text-[var(--pr-color-accents-6)]';
    }
  }

  /** Tailwind class for the status chip's leading dot. */
  statusDot(pct: string | number | null | undefined): string {
    switch (this.statusLabel(pct)) {
      case 'Achieved':
        return 'bg-[var(--pr-color-green-500)]';
      case 'Overachieved':
        return 'bg-[var(--pr-color-blue-500)]';
      case 'In progress':
        return 'bg-[var(--pr-color-yellow-300)]';
      default:
        return 'bg-[var(--pr-color-accents-3)]';
    }
  }

  /** Raw progress rounded for the % label (may exceed 100 when overachieved). */
  progressValue(pct: string | number | null | undefined): number {
    const p = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0)) || 0;
    return Math.round(p);
  }

  /** Progress clamped to 0–100 for the bar width. */
  progressBarPct(pct: string | number | null | undefined): number {
    return Math.min(Math.max(this.progressValue(pct), 0), 100);
  }

  /** Achieved number color: program accent when there is progress, neutral gray for zero. */
  achievedColor(value: string | number | null | undefined): string {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0)) || 0;
    return n > 0 ? this.accentTheme().solid : 'var(--pr-color-accents-4)';
  }

  /**
   * Split an HLO group title into code + name. The API is not consistent about the
   * shape, so three forms are handled:
   *   "HLO4.AOW1.IO1 Foster motivations"        → HLO4.AOW1.IO1 | Foster motivations
   *   "HLO 3.1 - Targeted innovations…"         → HLO 3.1       | Targeted innovations…
   *   "2.2.2: Policy engagement…"               → 2.2.2         | Policy engagement…
   * Anything else keeps the whole string as the name (no invented code).
   */
  splitGroupTitle(title: string | null | undefined): { code: string | null; name: string } {
    const text = String(title ?? '').trim();
    const hlo = /^(HLO[^\s]*(?:\s*\d[\d.]*)?)\s*[-–:]?\s+(.+)$/i.exec(text);
    if (hlo) return { code: hlo[1].trim(), name: hlo[2].trim() };
    const numeric = /^([\d.]+)\s*[:–-]\s*(.+)$/.exec(text);
    return numeric ? { code: numeric[1], name: numeric[2] } : { code: null, name: text };
  }

  /**
   * `versionId` passed to the ToC family ONLY when the viewer explicitly picked a phase
   * (`tocVersionForKey`, design.md DD-1/DD-4) — with the selector untouched this omits the
   * param exactly as before this spec (OPF-N-1).
   */
  private loadToc(program: string, aow: string): void {
    const versionId = this.tocVersionForKey();
    const key = this.tocCacheKey(program, aow);
    if (this.tocByKey().has(key) || this.loadingTocKeys().has(key)) return;
    this.loadingTocKeys.update(s => new Set(s).add(key));

    // Program-level buckets have their own endpoints and return ONE flat `tocResults` list
    // (no outputs/outcomes split), so they land in `outputs` and the AoW tabs hide.
    if (aow === OUTCOMES_2030_CODE) {
      this.api.resultsSE.GET_2030Outcomes(program, versionId ?? undefined).subscribe({
        next: (res: { response?: { tocResults?: any[] } }) =>
          this.cacheToc(key, { outputs: res?.response?.tocResults ?? [], outcomes: [] }),
        error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
      });
      return;
    }

    if (aow === INTERMEDIATE_OUTCOMES_CODE) {
      this.api.resultsSE.GET_IntermediateOutcomes(program, versionId ?? undefined).subscribe({
        next: (res: { response?: { tocResults?: any[] } }) =>
          this.cacheToc(key, { outputs: res?.response?.tocResults ?? [], outcomes: [] }),
        error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
      });
      return;
    }

    this.api.resultsSE.GET_TocResultsByAowId(program, aow, undefined, versionId ?? undefined).subscribe({
      next: (res: { response?: { tocResultsOutputs?: any[]; tocResultsOutcomes?: any[] } }) =>
        this.cacheToc(key, {
          outputs: res?.response?.tocResultsOutputs ?? [],
          outcomes: res?.response?.tocResultsOutcomes ?? []
        }),
      error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
    });
  }

  private cacheToc(key: string, data: { outputs: any[]; outcomes: any[] }): void {
    this.tocByKey.update(m => new Map(m).set(key, data));
    this.loadingTocKeys.update(s => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  /** Material icon per result-type id (mirrors the entity-details PrimeIcons map). */
  categoryIcon(resultTypeId: number): string {
    switch (resultTypeId) {
      case 7:
        return 'flag';
      case 6:
        return 'menu_book';
      case 5:
        return 'groups';
      case 2:
        return 'wb_sunny';
      case 1:
        return 'folder_open';
      default:
        return 'folder';
    }
  }

  onHoverProgram(sp: SPProgress, event: MouseEvent): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.hoveredProgram.set(sp);
    this.hoverTop.set((event.currentTarget as HTMLElement).getBoundingClientRect().top);
    this.loadAows(sp.initiativeCode);
  }

  /** Delay hiding so the pointer can travel into the interactive flyout. */
  onLeaveProgram(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hoveredProgram.set(null), 160);
  }

  onFlyoutEnter(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  onFlyoutLeave(): void {
    this.hoveredProgram.set(null);
  }

  /** Searching auto-opens the groups that survived the filter. */
  private revealMatches(): void {
    this.expandedGroups.set(new Set(this.indicatorGroups().map(g => g?.result_title).filter(Boolean)));
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  toggleSearch(): void {
    this.searchOpen.update(open => !open);
  }

  /** Closing the filter also clears it — a hidden active filter is a trap. */
  closeSearch(): void {
    this.searchOpen.set(false);
    this.query.set('');
  }

  /** Per-program SP icon (same asset set used by the home cards). */
  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }

  onIconError(code: string): void {
    this.iconErrors.update(set => new Set(set).add(code));
  }

  /**
   * Extract the dominant *vibrant* color from a loaded icon and cache it by code.
   * Samples a 32×32 draw, drops near-white/near-black/low-saturation pixels, and
   * picks the color bucket with the highest saturation×mid-luminance weight.
   */
  extractAccent(event: Event, code: string): void {
    if (this.accentColors().has(code)) return;
    const img = event.target as HTMLImageElement;
    try {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      const buckets = new Map<string, { r: number; g: number; b: number; w: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum > 0.92 || lum < 0.08 || sat < 0.25) continue;
        const weight = sat * (1 - Math.abs(lum - 0.5));
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
        cur.r += r * weight;
        cur.g += g * weight;
        cur.b += b * weight;
        cur.w += weight;
        buckets.set(key, cur);
      }

      let best: { r: number; g: number; b: number; w: number } | null = null;
      for (const bucket of buckets.values()) if (!best || bucket.w > best.w) best = bucket;
      if (!best || best.w <= 0) return;

      const hex = this.toHex(best.r / best.w, best.g / best.w, best.b / best.w);
      this.accentColors.update(map => new Map(map).set(code, hex));
    } catch {
      // Tainted canvas / decode failure → keep the orange fallback.
    }
  }

  /**
   * Per-phase overlay for the progress meter (design.md DD-3, `changes/overview-phase-filter`):
   * `sp.versions` from the shared default payload carries only ONE version per program (today's
   * effective phase — design.md §5), so a look-back to an explicitly selected phase needs its OWN
   * row, fetched via `GET_ScienceProgramsProgress(versionId)` and cached here keyed exactly like
   * `summariesByCode` (`summaryCacheKey`, design.md DD-4).
   */
  private readonly meterOverlayByKey = signal<Map<string, Version | null>>(new Map());
  private readonly loadingMeterKeys = signal<Set<string>>(new Set());

  private loadMeterOverlay(code: string, versionId: number): void {
    const key = this.summaryCacheKey(code, versionId);
    if (this.meterOverlayByKey().has(key) || this.loadingMeterKeys().has(key)) return;
    this.loadingMeterKeys.update(set => new Set(set).add(key));
    this.api.resultsSE.GET_ScienceProgramsProgress(versionId).subscribe({
      next: (res: { response?: { mySciencePrograms?: SPProgress[]; otherSciencePrograms?: SPProgress[] } }) => {
        const all = [...(res?.response?.mySciencePrograms ?? []), ...(res?.response?.otherSciencePrograms ?? [])];
        const match = all.find(sp => sp.initiativeCode === code) ?? null;
        this.cacheMeterOverlay(key, match?.versions?.[0] ?? null);
      },
      error: () => this.cacheMeterOverlay(key, null)
    });
  }

  private cacheMeterOverlay(key: string, version: Version | null): void {
    this.meterOverlayByKey.update(map => new Map(map).set(key, version));
    this.loadingMeterKeys.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  latestVersion(sp: SPProgress | null | undefined): Version | null {
    if (!sp) return null;
    // An EXPLICIT phase selection (Overview only, `activeSelection()`) is served EXCLUSIVELY from
    // the overlay cache below — it must NEVER fall through to the resolution further down. Falling
    // through would silently serve the OPEN phase's row under a CLOSED phase selection, which is
    // exactly the mixed-phase page OPF-R-2 forbids (e.g. Reporting 2026 numbers next to Reporting
    // 2025 cards). `meterOverlayByKey` holds `undefined` while the fetch has not landed yet
    // (`loadingMeter()` distinguishes that from a settled `null`) and `null` once it has resolved to
    // nothing (fetch error / no matching row) — both cases return `null` HERE, so the meter renders
    // its zeroed/empty state either way (OPF-R-5), never someone else's numbers.
    // `activeSelection()` (not raw `selectedVersionId()`) so this is honored ONLY on the Overview
    // tab — same view-gate as `effectiveVersionId`/`tocVersionForKey` (design.md DD-1).
    const explicitVersionId = this.activeSelection();
    if (explicitVersionId !== null) {
      return this.meterOverlayByKey().get(this.summaryCacheKey(sp.initiativeCode, explicitVersionId)) ?? null;
    }
    if (!sp.versions?.length) return null;
    const currentPhaseId = this.dataControlSE?.reportingCurrentPhase?.phaseId;
    const currentPhaseYear = this.dataControlSE?.reportingCurrentPhase?.phaseYear;
    if (currentPhaseId != null) {
      const matchId = sp.versions.find(v => Number(v.versionId) === Number(currentPhaseId));
      if (matchId) return matchId;
    }
    if (currentPhaseYear != null) {
      const matchYear = sp.versions.find(v => Number(v.phaseYear) === Number(currentPhaseYear));
      if (matchYear) return matchYear;
    }
    return sp.versions.reduce((latest, v) => (v.phaseYear > latest.phaseYear ? v : latest), sp.versions[0]);
  }

  totalResults(sp: SPProgress): number {
    const version = this.latestVersion(sp);
    if (version) return version.totalResults;
    // No explicit phase selection → `sp.totalResults` is the default/active-phase number (unchanged
    // pre-spec fallback). An EXPLICIT selection with no resolved version (overlay still loading, or
    // settled `null`) must NOT borrow it — `sp.totalResults` is the OPEN phase's number, and this
    // "results this phase" figure would otherwise leak it under a closed-phase selection, the same
    // mixed-phase class `latestVersion()` above closes for the meter.
    return this.activeSelection() === null ? (sp.totalResults ?? 0) : 0;
  }

  isActive(sp: SPProgress): boolean {
    return this.selected()?.initiativeId === sp.initiativeId;
  }

  private filter(list: SPProgress[]): SPProgress[] {
    const q = this.query().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      sp =>
        sp.initiativeCode?.toLowerCase().includes(q) ||
        sp.initiativeName?.toLowerCase().includes(q) ||
        sp.initiativeShortName?.toLowerCase().includes(q)
    );
  }

  /** Blend a hex toward white (pct>0) or black (pct<0). */
  private shade(hex: string, pct: number): string {
    const n = parseInt(hex.slice(1), 16);
    const target = pct < 0 ? 0 : 255;
    const p = Math.abs(pct);
    const r = (target - ((n >> 16) & 255)) * p + ((n >> 16) & 255);
    const g = (target - ((n >> 8) & 255)) * p + ((n >> 8) & 255);
    const b = (target - (n & 255)) * p + (n & 255);
    return this.toHex(r, g, b);
  }

  private rgba(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  private toHex(r: number, g: number, b: number): string {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
  }
}
