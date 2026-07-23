import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress, Version } from '../../../../shared/interfaces/SP-progress.interface';
import { ApiService } from '../../../../shared/services/api/api.service';
import { Unit } from '../entity-details/interfaces/entity-details.interface';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { GuidedCreationComponent } from './components/guided-creation/guided-creation.component';
import { ReportingNavSidebarComponent } from '../../../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';
import { IndicatorDrawerComponent } from './components/indicator-drawer/indicator-drawer.component';
import { ReportingGuideService, TutorialId } from './services/reporting-guide.service';

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

/** One indicator category (result type) with its reporting counts. */
interface IndicatorCategory {
  resultTypeId: number;
  resultTypeName: string;
  editing: number;
  submitted: number;
}

/**
 * Sentinel AOW code for the 2030 Outcomes view. The units endpoint never returns
 * it (its SQL filters `category IN ('OUTPUT','OUTCOME')` and 2030 items are `EOI`),
 * so the old entity-aow sidebar hardcodes the entry too — see
 * `pages/entity-aow/services/entity-aow.service.ts` `setSideBarItems()`.
 * It resolves to the same `/aow/2030-outcomes` route and its own endpoint.
 */
const OUTCOMES_2030_CODE = '2030-outcomes';

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
  imports: [RouterLink, CustomFieldsModule, DecimalPipe, GuidedCreationComponent, IndicatorDrawerComponent, ReportingNavSidebarComponent],
  templateUrl: './dashboard-lab.component.html',
  styleUrls: ['./dashboard-lab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLabComponent implements OnInit, OnDestroy {
  readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly api = inject(ApiService);
  private readonly dataControlSE = inject(DataControlService);
  private readonly guideSE = inject(ReportingGuideService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** AOW code read from the URL on load, opened once its program's AOWs arrive. */
  private pendingAow: string | null = null;
  /** AOW filters read from the URL, applied right after the AOW reopens (openAow
   *  clears filters, so they must be restored last). */
  private pendingFilters: { typ: string | null; st: string | null; q: string } | null = null;

  /**
   * The landing surface is the workspace overview — no program in context. A
   * program is only "entered" when the user picks one, which keeps the guided
   * entry and the guide itself reachable before any program is chosen.
   */
  readonly scope = signal<'overview' | 'program'>('overview');

  /** Currently selected program id; null → fall back to the first available. */
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
      // On the overview no program blocks are rendered, so claiming one is selected
      // would point the tour at elements that do not exist.
      hasSelectedProgram: this.scope() === 'program' && !!this.selected(),
      hasAows: this.scope() === 'program' && this.aows().length > 0,
      hasCategories: this.scope() === 'program' && (this.groupedSummaries().outputs.length > 0 || this.groupedSummaries().outcomes.length > 0),
      hasCenters: this.scope() === 'program' && this.myCenters().length > 0,
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
    // indicator row does not, so it is folded in here.
    const group = this.indicatorGroups().find(g => g?.result_title === groupTitle);
    this.manageTab.set(tab);
    this.managed.set({ indicator: { ...indicator, toc_result_id: group?.toc_result_id }, groupTitle, node: group });
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
      }
    });

    // Only the guided flow claims the whole viewport (focus mode). Inside an open
    // Area of Work the header stays, but trimmed to the two reporting entries so it
    // does not compete with the AOW's own navigation. Neither applies on the
    // overview or the program bento.
    effect(() => this.dataControlSE.focusMode.set(this.guidedOpen()));
    effect(() => this.dataControlSE.slimNav.set(this.viewMode() === 'aow'));

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

    // Mirror the current view (program + open AOW) into the URL so a reload lands
    // back here. Held off while an AOW restore is still pending, so we never erase
    // the code from the URL before it has been consumed.
    effect(() => {
      const sp = this.selectedId();
      const scope = this.scope();
      const aow = this.activeAowCode();
      const typ = this.typologyFilter();
      const st = this.statusFilter();
      const q = this.indicatorSearch().trim();
      if (this.pendingAow || this.pendingFilters) return;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          sp: scope === 'program' ? sp : null,
          aow: aow ?? null,
          // filters only make sense inside an open AOW
          typ: aow ? typ ?? null : null,
          st: aow ? st ?? null : null,
          q: aow && q ? q : null
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
    if (id == null) return list[0] ?? null;
    return list.find(sp => sp.initiativeId === id) ?? list[0] ?? null;
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
    });
    this.startCenterRotation();
    // The sidebar already says "Reporting workspace · Science Programs · <phase>",
    // so the navbar repeating it is noise on this surface.
    this.dataControlSE.hideWordmark.set(true);
    // The Spartan sidebar now carries the primary navigation, so hide the top nav pill.
    this.dataControlSE.hideMainNav.set(true);
  }

  /** Rehydrate the view from the URL so a reload stays on the same program + AOW. */
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
  }

  /** Leaving the lab must never strand the shell in focus mode — or leak a timer. */
  ngOnDestroy(): void {
    this.dataControlSE.focusMode.set(false);
    this.dataControlSE.hideWordmark.set(false);
    this.dataControlSE.slimNav.set(false);
    this.dataControlSE.hideMainNav.set(false);
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

  /** Back to the workspace overview: no program in context. */
  goToOverview(): void {
    this.scope.set('overview');
    this.viewMode.set('home');
    this.activeAowCode.set(null);
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
  }

  /** Indicators grouped by their AoW (output + outcome tiers), for the panel views. */
  readonly indicatorsByAow = computed(() => {
    const sp = this.selected()?.initiativeCode;
    const map = this.tocByKey();
    const loadingKeys = this.loadingTocKeys();
    return this.aows().map(aow => {
      const key = `${sp}::${aow.code}`;
      const toc = map.get(key);
      const groups = toc ? [...(toc.outputs ?? []), ...(toc.outcomes ?? [])] : [];
      const indicators = groups.flatMap((g: any) => (g?.indicators ?? []).map((i: any) => ({ ...i, __aowCode: aow.code, __hlo: g?.result_title })));
      return { aow, indicators, count: indicators.length, loading: !toc && loadingKeys.has(key) };
    });
  });

  /** Flat list of every indicator in the program, for the "indicators" view. */
  readonly allPanelIndicators = computed(() => this.indicatorsByAow().flatMap(x => x.indicators));

  isPanelAowExpanded(code: string): boolean {
    return this.expandedPanelAows().has(code);
  }

  togglePanelAow(code: string): void {
    this.expandedPanelAows.update(set => {
      const next = new Set(set);
      next.has(code) ? next.delete(code) : next.add(code);
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

    // 2030 Outcomes has its own endpoint and returns ONE flat `tocResults` list
    // (no outputs/outcomes split), so it lands in `outputs` and the tabs hide.
    if (aow === OUTCOMES_2030_CODE) {
      this.api.resultsSE.GET_2030Outcomes(program).subscribe({
        next: (res: { response?: { tocResults?: any[] } }) => this.cacheToc(key, { outputs: res?.response?.tocResults ?? [], outcomes: [] }),
        error: () => this.cacheToc(key, { outputs: [], outcomes: [] })
      });
      return;
    }

    this.api.resultsSE.GET_TocResultsByAowId(program, aow).subscribe({
      next: (res: { response?: { tocResultsOutputs?: any[]; tocResultsOutcomes?: any[] } }) =>
        this.cacheToc(key, { outputs: res?.response?.tocResultsOutputs ?? [], outcomes: res?.response?.tocResultsOutcomes ?? [] }),
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

  /**
   * `selected()` always resolves to a program (it falls back to the first one), so
   * it cannot answer "is this one highlighted?" on its own — on the overview no
   * program is in context and none should look picked.
   */
  isActive(sp: SPProgress): boolean {
    return this.scope() === 'program' && this.selected()?.initiativeId === sp.initiativeId;
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
