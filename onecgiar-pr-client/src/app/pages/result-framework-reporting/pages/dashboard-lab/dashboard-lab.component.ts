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
import { ReportingProgramBandComponent } from './components/reporting-program-band/reporting-program-band.component';
import {
  ProgramOverviewComponent,
  StatusSegment as OverviewStatusSegment,
  AowProgressRow as OverviewAowProgressRow,
  AttentionRow as OverviewAttentionRow,
  CategoryBar as OverviewCategoryBar
} from './components/program-overview/program-overview.component';
import { ReportingGuideService, TutorialId } from './services/reporting-guide.service';

/** Status tokens for the Overview segmented meter (rule 9 — fixed pairs). */
const OVERVIEW_STATUS_TOKENS: Record<number, { key: string; label: string; bg: string; fg: string }> = {
  1: {
    key: 'in-progress',
    label: 'In progress',
    bg: 'var(--pr-status-in-progress-bg)',
    fg: 'var(--pr-status-in-progress-fg)'
  },
  2: { key: 'in-qa', label: 'In QA', bg: 'var(--pr-status-in-qa-bg)', fg: 'var(--pr-status-in-qa-fg)' },
  3: {
    key: 'submitted',
    label: 'Submitted',
    bg: 'var(--pr-status-submitted-bg)',
    fg: 'var(--pr-status-submitted-fg)'
  },
  4: {
    key: 'not-started',
    label: 'Discontinued',
    bg: 'var(--pr-status-not-started-bg)',
    fg: 'var(--pr-status-not-started-fg)'
  },
  5: {
    key: 'not-started',
    label: 'Pending',
    bg: 'var(--pr-status-not-started-bg)',
    fg: 'var(--pr-status-not-started-fg)'
  },
  6: {
    key: 'approved',
    label: 'Approved',
    bg: 'var(--pr-status-approved-bg)',
    fg: 'var(--pr-status-approved-fg)'
  }
};

const CHART_COLORS = ['var(--pr-chart-1)', 'var(--pr-chart-2)', 'var(--pr-chart-3)', 'var(--pr-chart-4)'];

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

/** One indicator category (result type) with its reporting counts. */
interface IndicatorCategory {
  resultTypeId: number;
  resultTypeName: string;
  editing: number;
  submitted: number;
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
    ProgramOverviewComponent
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

  /** Indicator categories cached by program code + active Outputs/Outcomes tab. */
  readonly summariesByCode = signal<Map<string, IndicatorCategory[]>>(new Map());
  private readonly loadingSummaryCodes = signal<Set<string>>(new Set());
  readonly categoryTab = signal<'outputs' | 'outcomes'>('outputs');

  /** Selected program's categories, split into outputs / outcomes. */
  readonly groupedSummaries = computed(() => {
    const code = this.selected()?.initiativeCode;
    const all = (code ? this.summariesByCode().get(code) : []) ?? [];
    const summaries = all.filter(item => item?.resultTypeName !== 'Innovation Use(IPSR)');
    return {
      outputs: summaries.filter(item => OUTPUT_NAMES.includes(item?.resultTypeName)),
      outcomes: summaries.filter(item => OUTCOME_NAMES.includes(item?.resultTypeName))
    };
  });
  readonly loadingSummaries = computed(() => {
    const code = this.selected()?.initiativeCode;
    return !!code && this.loadingSummaryCodes().has(code) && !this.summariesByCode().has(code);
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

  manageIndicator(indicator: any, groupTitle: string, tab: 'report' | 'info' = 'report'): void {
    // The group carries the ToC node id the existing-results endpoint needs; the
    // indicator row does not, so it is folded in here. Planned browse may pass
    // `__hloNode` / `toc_result_id` when no AoW detail is open.
    const group =
      this.indicatorGroups().find(g => g?.result_title === groupTitle) ?? indicator?.__hloNode ?? null;
    const tocId = indicator?.toc_result_id ?? group?.toc_result_id;
    this.manageTab.set(tab);
    this.managed.set({ indicator: { ...indicator, toc_result_id: tocId }, groupTitle, node: group });
  }

  closeManage(): void {
    this.managed.set(null);
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

  /** ToC results (indicator groups) cached by `${program}::${aow}`. */
  readonly tocByKey = signal<Map<string, { outputs: any[]; outcomes: any[] }>>(new Map());
  private readonly loadingTocKeys = signal<Set<string>>(new Set());

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
    return this.tocByKey().get(`${sp.initiativeCode}::${aow}`) ?? { outputs: [] as any[], outcomes: [] as any[] };
  });

  readonly loadingToc = computed(() => {
    const sp = this.selected();
    const aow = this.activeAowCode();
    if (!sp || !aow) return false;
    const key = `${sp.initiativeCode}::${aow}`;
    return this.loadingTocKeys().has(key) && !this.tocByKey().has(key);
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
    // Load the selected program's Areas of Work + indicator categories on selection change.
    effect(() => {
      const code = this.selected()?.initiativeCode;
      if (code) {
        this.loadAows(code);
        this.loadSummaries(code);
        this.plannedHloAowCode.set(null);
        this.plannedTypeFilter.set([]);
        this.plannedSearch.set('');
      }
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

    // Only the guided flow claims the whole viewport (focus mode). Inside an open
    // Area of Work the header stays, but trimmed to the two reporting entries so it
    // does not compete with the AOW's own navigation.
    effect(() => this.dataControlSE.focusMode.set(this.guidedOpen()));
    effect(() => this.dataControlSE.slimNav.set(this.viewMode() === 'aow'));

    // Default landing: first assigned Science Program under My Programs (skip when
    // `?sp=` is present — restoreFromUrl / the queryParam subscription own that).
    effect(() => {
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
          sp: scope === 'program' ? sp : null,
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

  /** Phase chip taken from the first program's latest version. */
  readonly phaseLabel = computed(() => {
    const v = this.latestVersion(this.allPrograms()[0]);
    return v ? `${v.phaseName} · ${v.phaseYear}` : '';
  });

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

  /** Reporting-status meter + legend — maps phase status counts onto design tokens. */
  readonly overviewStatusSegments = computed<OverviewStatusSegment[]>(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    if (!statuses.length) return [];
    return [...statuses]
      .sort((a, b) => (STATUS_ORDER[a.statusId] ?? 99) - (STATUS_ORDER[b.statusId] ?? 99))
      .map(s => {
        const tok = OVERVIEW_STATUS_TOKENS[s.statusId];
        return {
          key: tok?.key ?? String(s.statusId),
          label: tok?.label ?? s.statusName,
          count: s.count,
          bg: tok?.bg ?? 'var(--pr-status-not-started-bg)',
          fg: tok?.fg ?? 'var(--pr-status-not-started-fg)'
        };
      });
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
        return { code: g.aow.code, name: g.aow.name, done, total: g.count || inds.length };
      })
      .filter(r => r.total > 0);
  });

  /** Needs-attention rows derived from live counts — no invented alerts. */
  readonly overviewAttention = computed<OverviewAttentionRow[]>(() => {
    const rows: OverviewAttentionRow[] = [];
    const p = this.pipelineStats();
    if (p.editing > 0) {
      rows.push({
        text: `${p.editing} result${p.editing === 1 ? '' : 's'} still in Editing`,
        color: 'var(--pr-status-in-progress-fg)'
      });
    }
    if (p.pending > 0) {
      rows.push({
        text: `${p.pending} result${p.pending === 1 ? '' : 's'} pending review`,
        color: 'var(--pr-text-subtle)'
      });
    }
    const emptyAows = this.overviewAowProgress().filter(a => a.total > 0 && a.done === 0);
    for (const a of emptyAows.slice(0, 3)) {
      rows.push({
        text: `${a.code} has no results reported yet`,
        color: 'var(--pr-text-subtle)'
      });
    }
    return rows;
  });

  /** Results by indicator category — from the program's type summaries. */
  readonly overviewCategories = computed<OverviewCategoryBar[]>(() => {
    const { outputs, outcomes } = this.groupedSummaries();
    const all = [...outputs, ...outcomes];
    return all
      .map((c, i) => ({
        name: c.resultTypeName,
        count: (c.editing || 0) + (c.submitted || 0),
        color: CHART_COLORS[i % CHART_COLORS.length]
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  });

  readonly overviewPaceHeadline = computed(() => {
    const pct = this.submittedPct();
    const total = this.selectedTotal();
    if (!total) return 'No results reported for this phase yet.';
    return `${pct}% of ${total} results are quality-assessed or submitted this phase.`;
  });

  readonly overviewPaceSub = computed(() => {
    const p = this.pipelineStats();
    if (!p.total) return 'Start reporting against the planned ToC to build pace.';
    return `${p.editing} still editing · ${p.qaed} in QA · ${p.submitted} submitted.`;
  });

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

  ngOnInit(): void {
    this.restoreFromUrl();
    if (this.allPrograms().length === 0) {
      this.homeSE.getScienceProgramsProgress();
    }
    // React to `?sp=` changes coming from the Spartan sidebar (in-app navigation keeps the
    // component alive, so the snapshot read in restoreFromUrl only covers the first load).
    this.spParamSub = this.route.queryParamMap.subscribe(qp => {
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

  /** Rehydrate the view from the URL so a reload stays on the same program + AOW + Planned mode. */
  private restoreFromUrl(): void {
    const qp = this.route.snapshot.queryParamMap;
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
    this.spParamSub?.unsubscribe();
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

  /** Fetch (and cache) the indicator-contribution summary (result-type categories). */
  private loadSummaries(code: string): void {
    if (this.summariesByCode().has(code) || this.loadingSummaryCodes().has(code)) return;
    this.loadingSummaryCodes.update(set => new Set(set).add(code));
    this.api.resultsSE.GET_IndicatorContributionSummary(code).subscribe({
      next: (res: { response?: { totalsByType?: IndicatorCategory[] } }) => this.cacheSummaries(code, res?.response?.totalsByType ?? []),
      error: () => this.cacheSummaries(code, [])
    });
  }

  private cacheSummaries(code: string, items: IndicatorCategory[]): void {
    this.summariesByCode.update(map => new Map(map).set(code, items));
    this.loadingSummaryCodes.update(set => {
      const next = new Set(set);
      next.delete(code);
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
      const key = `${sp}::${aow.code}`;
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
            __hloNode: g
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
    const matchTypology = (i: ReportingIndicator) =>
      typology === 'all' || (i?.result_type_name || i?.type_name || '').trim() === typology;
    const sp = this.selected()?.initiativeCode;

    // Type filter (CURRENT selType) — which top-level card families stay visible.
    const wantAow = typeFilter === 'all' || typeFilter === 'hlo' || typeFilter === 'outcome';
    const wantIo = typeFilter === 'all' || typeFilter === 'intermediate_outcome';
    const wantO30 = typeFilter === 'all' || typeFilter === 'outcome_2030';

    // Section filter — a real AoW code, or one of the two program-level bucket codes.
    const sectionIsAow =
      aowFilter === 'all' || (aowFilter !== INTERMEDIATE_OUTCOMES_CODE && aowFilter !== OUTCOMES_2030_CODE);
    const sectionIsIo = aowFilter === 'all' || aowFilter === INTERMEDIATE_OUTCOMES_CODE;
    const sectionIsO30 = aowFilter === 'all' || aowFilter === OUTCOMES_2030_CODE;

    // 1) AoW cards — HLOs by default; outcome tier only when Type = Outcome.
    const aowCards: ReportingAowGroup[] = wantAow
      ? this.plannedFilteredAows()
          .filter(aow => sectionIsAow && (aowFilter === 'all' || aow.code === aowFilter))
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
    const ioKey = `${sp}::${INTERMEDIATE_OUTCOMES_CODE}`;
    const ioToc = this.tocByKey().get(ioKey);
    const ioLoading = this.loadingTocKeys().has(ioKey);
    const ioAll = this.flattenBucketIndicators(ioToc?.outputs, INTERMEDIATE_OUTCOMES_CODE, 'Intermediate Outcomes');
    const intermediateCard: ReportingAowGroup | null =
      wantIo && sectionIsIo && (ioAll.length || ioLoading)
        ? {
            aow: { code: INTERMEDIATE_OUTCOMES_CODE, name: 'Intermediate Outcomes' },
            indicators: ioAll.filter(matchTypology),
            count: ioAll.length,
            loading: ioLoading && !ioAll.length,
            kind: 'intermediate'
          }
        : null;

    // 3) 2030 Outcomes — dedicated endpoint.
    const o30Key = `${sp}::${OUTCOMES_2030_CODE}`;
    const o30Toc = this.tocByKey().get(o30Key);
    const o30Loading = this.loadingTocKeys().has(o30Key);
    const o30All = this.flattenBucketIndicators(o30Toc?.outputs, OUTCOMES_2030_CODE, '2030 Outcomes');
    const o30Card: ReportingAowGroup | null =
      wantO30 && sectionIsO30 && (o30All.length || o30Loading)
        ? {
            aow: { code: OUTCOMES_2030_CODE, name: '2030 Outcomes' },
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
  readonly reportingAowFilter = signal<string>('all');
  readonly reportingTypologyFilter = signal<string>('all');
  /** CURRENT selType: all | hlo | outcome | intermediate_outcome | outcome_2030 */
  readonly reportingTypeFilter = signal<string>('all');

  /**
   * Section dropdown = every AoW + Intermediate Outcomes + 2030 Outcomes (CURRENT selSection).
   */
  readonly reportingSectionOptions = computed(() => {
    const aows = this.aows().map(a => ({
      value: a.code,
      label: `${a.code} · ${a.name}`
    }));
    return [
      ...aows,
      { value: INTERMEDIATE_OUTCOMES_CODE, label: 'Intermediate Outcomes' },
      { value: OUTCOMES_2030_CODE, label: '2030 Outcomes' }
    ];
  });

  /**
   * Category options for the band filter, derived from loaded ToCs so the dropdown never
   * offers a type with zero rows. Covers AoW outputs + Intermediate + 2030.
   */
  readonly reportingTypologyOptions = computed(() => {
    const set = new Set<string>();
    const collect = (rows: ReportingIndicator[] | undefined) => {
      for (const i of rows ?? []) {
        const t = i?.result_type_name || i?.type_name;
        if (t) set.add(String(t).trim());
      }
    };
    for (const g of this.indicatorsByAow()) collect(g.indicators);
    const sp = this.selected()?.initiativeCode;
    const map = this.tocByKey();
    collect(this.flattenBucketIndicators(map.get(`${sp}::${INTERMEDIATE_OUTCOMES_CODE}`)?.outputs, INTERMEDIATE_OUTCOMES_CODE, 'IO'));
    collect(this.flattenBucketIndicators(map.get(`${sp}::${OUTCOMES_2030_CODE}`)?.outputs, OUTCOMES_2030_CODE, '2030'));
    return [...set].sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }));
  });

  /** Row click / Report — both land on the existing indicator drawer, on the matching tab. */
  onReportingRowOpen(row: ReportingIndicator): void {
    this.manageIndicator(row, row.__hlo ?? '', 'info');
  }

  onReportingRowReport(row: ReportingIndicator): void {
    this.manageIndicator(row, row.__hlo ?? '', 'report');
  }

  /**
   * Target and Achieved open the same drawer on the tab that answers each question: `info` carries
   * the target breakdown, `report` the reported values. The reference uses popovers; the app already
   * ships this drawer, and forking it to add popovers would put the same data behind two surfaces.
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

  private loadToc(program: string, aow: string): void {
    const key = `${program}::${aow}`;
    if (this.tocByKey().has(key) || this.loadingTocKeys().has(key)) return;
    this.loadingTocKeys.update(s => new Set(s).add(key));

    // Program-level buckets have their own endpoints and return ONE flat `tocResults` list
    // (no outputs/outcomes split), so they land in `outputs` and the AoW tabs hide.
    if (aow === OUTCOMES_2030_CODE) {
      this.api.resultsSE.GET_2030Outcomes(program).subscribe({
        next: (res: { response?: { tocResults?: any[] } }) =>
          this.cacheToc(key, { outputs: res?.response?.tocResults ?? [], outcomes: [] }),
        error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
      });
      return;
    }

    if (aow === INTERMEDIATE_OUTCOMES_CODE) {
      this.api.resultsSE.GET_IntermediateOutcomes(program).subscribe({
        next: (res: { response?: { tocResults?: any[] } }) =>
          this.cacheToc(key, { outputs: res?.response?.tocResults ?? [], outcomes: [] }),
        error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
      });
      return;
    }

    this.api.resultsSE.GET_TocResultsByAowId(program, aow).subscribe({
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

  latestVersion(sp: SPProgress | null | undefined): Version | null {
    if (!sp?.versions?.length) return null;
    return sp.versions.reduce((latest, v) => (v.phaseYear > latest.phaseYear ? v : latest), sp.versions[0]);
  }

  totalResults(sp: SPProgress): number {
    return this.latestVersion(sp)?.totalResults ?? sp.totalResults ?? 0;
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
