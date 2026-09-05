import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  input,
  NgZone,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ReportingGuideService } from '../../services/reporting-guide.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsDownUp, lucideChevronsUpDown, lucideInfo, lucideSearch, lucideX, lucideZap } from '@ng-icons/lucide';
import { PrFilterMultiselectModule } from '../../../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { PrFilterSelectComponent } from '../../../../../../shared/components/pr-filter-select/pr-filter-select.component';

export interface BandFilterOption {
  value: string;
  label: string;
}

/** Section options are grouped ("Areas of work" / "Programme-level") like the reference panel. */
export interface BandFilterGroup {
  label: string;
  items: BandFilterOption[];
}

export interface ReportingSummaryStats {
  programsCount: number;
  aowsCount: number;
  totalKpis: number;
  reportedKpis: number;
  /**
   * Program **Planned** — every KPI the ToC plans, zero-target ones included. `totalKpis` is
   * *Counted* (the zero-target rule already applied, `KCR-R-8`), so the two differ by exactly
   * `zeroTargetKpis`; the pair is what `totalKpisTitle` discloses. Optional: a caller with no
   * planned figure to state simply omits both and the figure carries no `title`.
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  plannedKpis?: number;
  /**
   * How many planned KPIs the zero-target rule (`MRF-R-7`) removed from `totalKpis`.
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  zeroTargetKpis?: number;
}

/**
 * Program band + tabs + Reporting toolbar.
 *
 * Reference: `docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html` and its rendered PNG
 * `uploads/pasted-1785766366426-0.png`. Spec: `docs/reporting-redesign/PROGRAM-SHELL-SPEC.md` §3.
 *
 * ⚠️ `html` is 12px — rem Tailwind utilities are 25% short of the mock (px-8 → 24px, not 32px;
 * h-12 → 36px, not 48px). Template uses only arbitrary px values (UI-RULES §1.3).
 *
 * Info popover (`ⓘ` next to the title): reference :345-358 — click (not hover), "About this
 * program", body = program description, footer = "N areas of work · M planned results".
 */
export const SCIENCE_PROGRAM_DESCRIPTIONS: Record<string, string> = {
  SP01:
    'Breeding for Tomorrow modernizes CGIAR and national breeding programs so that farmers get ' +
    'climate-resilient, market-preferred varieties faster. The program connects market intelligence, ' +
    'breeding pipelines, trait discovery, genetic innovation and seed systems into one delivery chain, ' +
    'and works with national agricultural research systems and private seed partners across South Asia, ' +
    'sub-Saharan Africa and Latin America. Reporting covers products delivered to partners, the outcomes ' +
    'those products enable, and progress toward the 2030 outcomes agreed with donors.',
  SP02:
    'Sustainable Farming accelerates the transition to resilient, productive, and sustainable agricultural systems. ' +
    'The program integrates agronomic best practices, digital advisory services, and soil and water management solutions ' +
    'to improve yields, optimize input use, and enhance ecosystem services for farming communities.',
  SP03:
    'Climate Action provides science-based innovations, policy analyses, and investment roadmaps to foster climate ' +
    'resilience and low-emission development. The program focuses on climate-smart agricultural technologies, early warning ' +
    'and disaster risk management systems, and climate finance alignment across vulnerable agri-food regions.',
  SP04:
    'Multifunctional Landscapes advances systemic, landscape-scale solutions to reconcile agricultural production ' +
    'with biodiversity conservation, land restoration, and climate resilience. The program works with communities, ' +
    'national authorities, and private partners across living landscapes to co-design and implement sustainable resource ' +
    'management plans, agroecological innovations, and inclusive governance models that deliver shared ecological and ' +
    'livelihood benefits.',
  SP05:
    'Sustainable Animal & Aquatic Foods advances innovations across livestock and aquaculture value chains. ' +
    'The program develops improved feeds, animal health diagnostics, and sustainable production technologies that ' +
    'enhance productivity, support livelihoods, and reduce environmental footprints.',
  SP06:
    'Better Diets and Nutrition focuses on transforming food environments and consumption patterns to improve nutrition ' +
    'and public health. The program leverages biofortified crops, dietary diversity interventions, and supply chain ' +
    'improvements to make safe, healthy, and affordable diets accessible to vulnerable populations.',
  SP07:
    'Policy Innovations delivers data-driven economic research, policy analysis, and foresight modeling to support national ' +
    'and regional policymakers. The program helps design and evaluate policy incentives, social protection schemes, and ' +
    'agricultural trade strategies for equitable rural growth.',
  SP08:
    'Food Frontiers and Security anticipates and navigates emerging systemic disruptions in global and regional food systems. ' +
    'The program investigates next-generation agricultural technologies, frontier food solutions, and resilience mechanisms ' +
    'to protect long-term food security.',
  SP09:
    'Scaling for Impact bridges research and practice by accelerating the adoption of proven CGIAR innovations through ' +
    'robust partnerships with public, private, and development sector actors.',
  'SGP-02':
    'Accelerating Varietal Improvement in Seed Systems in Africa works with regional and national partners to modernize ' +
    'seed systems and expand access to high-performing, climate-adapted seed varieties.',
  SGP02:
    'Accelerating Varietal Improvement in Seed Systems in Africa works with regional and national partners to modernize ' +
    'seed systems and expand access to high-performing, climate-adapted seed varieties.'
};

@Component({
  selector: 'app-reporting-program-band',
  standalone: true,
  imports: [RouterLink, NgIcon, FormsModule, PrFilterMultiselectModule, PrFilterSelectComponent],
  templateUrl: './reporting-program-band.component.html',
  styleUrls: ['./reporting-program-band.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideChevronsDownUp, lucideChevronsUpDown, lucideInfo, lucideSearch, lucideX, lucideZap })]
})
export class ReportingProgramBandComponent {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly guideSE = inject(ReportingGuideService);

  readonly programCode = input<string>('');
  readonly programName = input<string>('');
  /** Summary statistics banner above reporting heading (PROGRAMS, AOWs, TOTAL KPIs, EVIDENCE). */
  readonly summaryStats = input<ReportingSummaryStats | null>(null);
  /**
   * True while any AoW ToC is still loading. The stats are SUMS over whatever has arrived, so
   * painting them mid-stream shows numbers that then change — a skeleton is honest, a moving
   * figure is not (owner field report 2026-08-31).
   */
  readonly statsLoading = input<boolean>(false);
  /**
   * Long copy for the ⓘ popover body. Empty → fall back to a short placeholder built from the
   * name (the SP list payload still has no description field — NEEDS-BACKEND).
   */
  readonly programDescription = input<string>('');
  /** Count for the popover meta line — `N areas of work`. */
  readonly aowCount = input<number>(0);
  /** Count for the popover meta line — `M planned results`. */
  readonly plannedResultsCount = input<number>(0);

  readonly cycleYear = input<string | number | null>(null);
  readonly cyclePhase = input<string>('');
  /**
   * `changes/overview-phase-filter` OPF-T-4 (Leader remediation): when provided, REPLACES the
   * `cycleYear`/`cyclePhase`-derived tail in `eyebrowCycle` below — the Overview host wires this
   * to its own `effectiveVersionId()`-derived `phaseLabel()` so the eyebrow follows an explicit
   * phase selection instead of always reading the global `reportingCurrentPhase`. Absent (default
   * `''`) keeps `eyebrowCycle`'s original `cycleYear`/`cyclePhase` behavior byte-identical for
   * every other consumer of this band.
   */
  readonly phaseLabelOverride = input<string>('');
  /** Which tab is active. Overview, Reporting and Results are separate routes, not local state. */
  readonly activeTab = input<'overview' | 'reporting' | 'results'>('reporting');
  readonly programDotColor = input<string>('var(--pr-color-primary-300)');

  readonly search = input<string>('');
  readonly statusValue = input<string>('all');
  readonly typologyValue = input<string>('all');
  readonly typologyOptions = input<BandFilterOption[]>([]);
  /** Type filter: hlo | outcome | intermediate_outcome | outcome_2030 | all. */
  readonly typeValue = input<string>('all');
  /** Section is multi-select (reference `selSection`): the picked section codes, empty = no filter. */
  readonly aowValue = input<string[]>([]);
  readonly aowOptions = input<BandFilterGroup[]>([]);
  readonly viewMode = input<'grouped' | 'flat'>('grouped');
  /** By-AOW mode: only Search + Section apply there — Type/Category/Status and the grouping toggle are grouped-view filters. @akili-spec changes/reporting-entry-hub */
  readonly compactFilters = input<boolean>(false);
  /** Any reporting filter active — shows the Clear-filters button. @akili-spec changes/reporting-entry-hub */
  readonly filtersActive = input<boolean>(false);
  /** By-AoW mode: center filter options and selected center */
  readonly centerOptions = input<BandFilterOption[]>([]);
  readonly centerValue = input<string | null>(null);
  readonly centerChange = output<string | null>();
  /** By-AoW mode: result type filter options and selected type */
  readonly byAowTypeOptions = input<BandFilterOption[]>([]);
  readonly byAowTypeValue = input<string | null>(null);
  readonly byAowTypeChange = output<string | null>();
  /**
   * Only-pending toggle (MRF-R-1): hides `complete` and zero-target KPIs. Visible in BOTH
   * reporting modes (grouped table + By-AOW), unlike Type/Category/Status — rendered outside the
   * `compactFilters` gate. @akili-spec changes/mass-reporting-flow
   */
  readonly onlyPending = input<boolean>(false);
  /**
   * Remaining-work | Catalogue sort (MRF-R-2). Default `catalogue` — no silent default change.
   * Same visibility as `onlyPending`. @akili-spec changes/mass-reporting-flow
   */
  readonly burndownSort = input<'catalogue' | 'remaining'>('catalogue');
  /** By-AOW mode: the active AoW + flat options for the single-select switcher (a multiselect is meaningless when exactly one AoW renders). @akili-spec changes/reporting-entry-hub */
  readonly activeAowCode = input<string | null>(null);
  readonly aowSingleOptions = input<{ label: string; value: string }[]>([]);
  /**
   * State of the global disclosure switch (P2-3252): `true` once every AoW / HLO is open, which is
   * what turns `Expand all` into `Collapse all`. The band only renders and announces it — the
   * grouped table owns the actual disclosure state.
   */
  readonly allExpanded = input<boolean>(false);
  /**
   * Whether the surface below the toolbar actually answers to that switch. The Reporting tab has
   * other browse surfaces reachable by URL (`?tocView=byAow` / `?tocView=indicators`) that keep
   * their own inline disclosure state, and the band renders OUTSIDE that switch — so without this
   * the control painted itself over a list it could not move (a button that does nothing).
   */
  readonly canExpandAll = input<boolean>(true);
  /** Overview has no filters, so the band renders on its own there. */
  readonly showToolbar = input<boolean>(true);
  /**
   * Whether the emerging-result CTA is offered at all. False hides BOTH copies (expanded and
   * condensed) — the host uses it for AVISA/SGP-02, a deactivated project whose results are view
   * only (P2-3139): the retired entity-details page hid the whole pathway rather than showing a
   * button that refuses to act.
   */
  readonly canReport = input<boolean>(true);

  readonly searchChange = output<string>();
  readonly statusChange = output<string>();
  readonly typologyChange = output<string>();
  readonly typeChange = output<string>();
  readonly aowChange = output<string[]>();
  /** @akili-spec changes/mass-reporting-flow */
  readonly onlyPendingChange = output<boolean>();
  /** @akili-spec changes/mass-reporting-flow */
  readonly burndownSortChange = output<'catalogue' | 'remaining'>();
  readonly viewModeChange = output<'grouped' | 'flat'>();
  readonly clearAllFilters = output<void>();
  readonly aowSwitch = output<string>();
  /** Expand all / Collapse all was pressed. The host flips the switch; the band stays stateless. */
  readonly toggleExpandAll = output<void>();
  readonly allAowsClick = output<void>();
  readonly whereToReport = output<void>();
  readonly reportEmerging = output<void>();

  onWhereToReportClick(): void {
    this.whereToReport.emit();
    this.reportEmerging.emit();
  }

  startSpTour(): void {
    this.guideSE.startSpTour({
      programName: this.programName(),
      cycleYear: this.cycleYear() ?? undefined,
      activeTab: this.activeTab(),
      onTabNavigate: (tab: 'overview' | 'reporting' | 'results') => {
        const targetPath =
          tab === 'overview'
            ? this.overviewPath()
            : tab === 'results'
              ? this.resultsPath()
              : this.reportingPath();
        return this.router.navigate([targetPath], { queryParamsHandling: 'preserve' }).then(() => {});
      }
    });
  }

  /**
   * Overview is its OWN surface now (`/overview`), not the retired bento at `/home` — sending the
   * tab back there was the bug this route fixes.
   */
  /**
   * Both tabs live UNDER the programme now (`…/entity-details/SP01`), so the trail is
   * path-addressed and shareable. The `?sp=<id>` shape they used before is gone.
   */
  readonly reportingPath = computed(() => `/result-framework-reporting/entity-details/${this.programCode()}`);
  readonly overviewPath = computed(() => `${this.reportingPath()}/overview`);
  /**
   * Third tab (design `tabResults`, PRMS-Reporting.dc.html:418 / :441) — the programme's reported
   * results. Same shape as the other two: a real route under the programme, not local state.
   *
   * ⚠️ The design draws a FOURTH tab, `Drafts` (`tabResults`'s neighbour at :420 / :443), inside
   * `<sc-if value="{{ centerMode }}">`. It belongs to the CENTER view, not the programme view, so
   * it is deliberately NOT rendered here — this is not a missing tab, do not "fix" it.
   */
  readonly resultsPath = computed(() => `${this.reportingPath()}/results`);
  /**
   * Kept, unreferenced: the `/emerging` route still exists (nothing is deleted here) but the CTA no
   * longer navigates to it — it opens the legacy modal in place, which is where reporting an
   * emerging result has always happened.
   */
  readonly emergingPath = '/result-framework-reporting/emerging';

  /** ⓘ popover open state — click toggles, Escape / outside click close (reference :348). */
  readonly infoOpen = signal(false);
  /** Guards the document click that fires in the same tick as the open toggle. */
  private skipNextDocumentClick = false;

  /** Allows callers/tests to opt into collapsing behavior. Default is false (band stays fixed/expanded). */
  readonly collapsible = input<boolean>(false);
  /** Indicates whether document is scrolled down from top (for subtle elevation shadow). */
  readonly isScrolled = signal(false);

  /**
   * `changes/sp-shell-app-viewport` `SAV-DD-2`: true once the host page is viewport-locked (≥ `md`).
   * Drops `sticky` on the band's own box (`SAV-DD-5`) — inside an `overflow: hidden` locked host the
   * host itself is the sticky scrollport, so a `sticky` band would be shoved down by its own `top`
   * offset and open a gap. Below `md`, and on any page that never passes this input, nothing changes.
   */
  readonly frameLocked = input(false);
  /**
   * `SAV-R-6` / `SAV-DD-4`: the work area element the locked page hands the band, so the band's
   * scroll-driven state (`isScrolled`, `bandCollapsed`) tracks the ACTUAL scroller at ≥ `md` instead
   * of the document (which never moves once locked). `null` (default, and every < `md` / unlocked
   * consumer) keeps the window listener as the sole source — byte-identical to before this input
   * existed.
   */
  readonly scrollHost = input<HTMLElement | null>(null);

  /**
   * Scroll offset at which the band condenses. 64px is the height of the compact identity block.
   */
  private static readonly COLLAPSE_THRESHOLD_PX = 64;

  /** True while the page is scrolled past the identity block. Drives the compact band. */
  readonly bandCollapsed = signal(false);

  constructor() {
    // < `md` fallback (`SAV-DD-4`): with no work area handed to the band, the DOCUMENT is the
    // scroller, so the offset comes from `window`. Kept unconditionally — this is the ONE documented
    // window listener the band owns (`SAV-AC-11`). Registered OUTSIDE Angular and only re-enters the
    // zone on the single frame where the threshold is crossed: a zone-bound
    // `@HostListener('window:scroll')` would tick change detection on EVERY scroll frame to
    // maintain a boolean that flips twice per page. Passive: we never preventDefault.
    this.zone.runOutsideAngular(() => {
      const onWindowScroll = () => this.syncBandCollapsed();
      window.addEventListener('scroll', onWindowScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onWindowScroll));
    });

    // ≥ `md` (locked frame, `SAV-R-6`): the work area itself is the real scroller. Re-attaches
    // whenever `scrollHost` changes (a tab switch can hand the band a brand-new element) and detaches
    // the previous element's listener via the effect's own cleanup — covers both re-attachment and
    // destroy, no separate `destroyRef.onDestroy` needed here.
    effect(onCleanup => {
      const host = this.scrollHost();
      if (!host) return;
      const onHostScroll = () => this.syncBandCollapsed();
      this.zone.runOutsideAngular(() => host.addEventListener('scroll', onHostScroll, { passive: true }));
      onCleanup(() => host.removeEventListener('scroll', onHostScroll));
      // First read on (re)attach — a page mounting the band against an already-scrolled work area
      // (or a tab switch re-creating it) must not wait for the next scroll frame to reflect reality
      // (`SAV-R-6`, `SAV-AC-6`).
      this.syncBandCollapsed();
    });

    // A tab switch (Overview ⇄ Reporting) re-creates the band on an already-scrolled document —
    // without this first read the band would render expanded until the next scroll event. Covers the
    // < `md` / no-`scrollHost` case; the effect above covers the ≥ `md` case.
    this.syncBandCollapsed();
  }

  /**
   * Cheap: one `scrollTop`/`scrollY` read + a compare. Nothing happens unless the threshold is
   * crossed. `scrollHost` (the work area, ≥ `md`) and `window` (the document, < `md`) are SUMMED
   * rather than switched on with `matchMedia` in TS (`SAV-DD-4`) — the CSS breakpoint decides which
   * one is actually scrolling at any given width, and the other always contributes 0.
   */
  private syncBandCollapsed(): void {
    const offset = (this.scrollHost()?.scrollTop ?? 0) + (window.scrollY || document.documentElement?.scrollTop || 0);
    const isScrolled = offset > 10;
    if (isScrolled !== this.isScrolled()) {
      this.zone.run(() => this.isScrolled.set(isScrolled));
    }

    if (!this.collapsible()) {
      if (this.bandCollapsed()) {
        this.zone.run(() => this.bandCollapsed.set(false));
      }
      return;
    }

    const collapsed = offset > ReportingProgramBandComponent.COLLAPSE_THRESHOLD_PX;
    if (collapsed === this.bandCollapsed()) return;
    this.zone.run(() => {
      this.bandCollapsed.set(collapsed);
      // The reference drops the popover whenever the band changes shape (:5160) — it is anchored to
      // the identity block, which is exactly what collapses.
      this.infoOpen.set(false);
    });
  }

  /**
   * `· REPORTING CYCLE 2026 · P25` — the code is rendered separately because the reference sets it
   * in JetBrains Mono while the rest of the eyebrow is Manrope (PRMS-Shell.dc.html:338-339).
   */
  readonly eyebrowCycle = computed(() => {
    const tail = this.phaseLabelOverride()?.trim() || this.defaultCycleTail();
    return this.programCode() && tail ? `· ${tail}` : tail;
  });

  /** Original `cycleYear`/`cyclePhase`-derived tail — the fallback when no override is provided. */
  private readonly defaultCycleTail = computed(() => {
    const parts: string[] = [];
    if (this.cycleYear()) parts.push(`Reporting cycle ${this.cycleYear()}`);
    if (this.cyclePhase()) parts.push(this.cyclePhase());
    return parts.join(' · ');
  });

  /**
   * Heading above the Reporting toolbar — reference :1102, `Report results linked to the
   * programme's 2026 ToC`. The year is the CURRENT cycle, never a literal: this surface is reused
   * every cycle and a hardcoded 2026 would silently lie in 2027. With no cycle loaded yet the year
   * is dropped rather than rendering an empty gap.
   */
  readonly reportingHeading = computed(() => {
    const year = this.cycleYear();
    return year ? `Report results linked to the program's ${year} ToC` : "Report results linked to the program's ToC";
  });

  /**
   * Body copy for the popover. Prefer explicit description; otherwise look up from the
   * Science Program catalogue by program code/name, falling back to a contextual statement.
   */
  readonly resolvedDescription = computed(() => {
    const explicit = this.programDescription()?.trim();
    if (explicit) return explicit;

    const code = this.programCode()?.trim().toUpperCase();
    if (code && SCIENCE_PROGRAM_DESCRIPTIONS[code]) {
      return SCIENCE_PROGRAM_DESCRIPTIONS[code];
    }

    const name = this.programName()?.trim();
    if (name) {
      const normalizedName = name.toLowerCase();
      for (const [spCode, desc] of Object.entries(SCIENCE_PROGRAM_DESCRIPTIONS)) {
        if (desc.toLowerCase().startsWith(normalizedName)) {
          return desc;
        }
      }
      return `${name} is a CGIAR research program delivering science, innovations, and partnerships to advance food, land, and water systems transformation and contribute to CGIAR 2030 targets.`;
    }

    return (
      'This program works with partners across the CGIAR portfolio to deliver research, innovations, ' +
      'and outcomes contributing to the 2030 targets.'
    );
  });

  /** Footer: `6 areas of work · 28 planned results` (reference :3235). */
  readonly programMeta = computed(() => {
    const aows = this.aowCount();
    const results = this.plannedResultsCount();
    const aowLabel = aows === 1 ? '1 area of work' : `${aows} areas of work`;
    const resultLabel = results === 1 ? '1 planned result' : `${results} planned results`;
    return `${aowLabel} · ${resultLabel}`;
  });

  readonly activeTabInfo = computed(() => {
    switch (this.activeTab()) {
      case 'overview':
        return {
          title: 'Overview',
          description:
            'Displays the overall progress of results reporting for this Science Program or Accelerator across funding types (W1/W2 and W3/Bilateral), reporting status, and geographic areas of work.'
        };
      case 'results':
        return {
          title: 'Results',
          description:
            'View and manage all reported results linked to this Science Program or Accelerator. Use the filters to explore results by status, type, or contributing centers.'
        };
      case 'reporting':
      default:
        return {
          title: 'Theory of Change Reporting',
          description:
            'The Theory of Change reporting framework for your Science Program. Browse planned Indicators and High-Level Outputs by Area of Work, track progress against targets, and submit new or continuing result reports for the current cycle.'
        };
    }
  });

  /**
   * ⚠️ The reference shows a `48 DAYS LEFT` chip here. It is NOT rendered, and deliberately not
   * faked: `DataControlService.reportingCurrentPhase` carries only `{phaseName, phaseYear, phaseId,
   * portfolioAcronym, portfolioId}` — there is no cycle end date anywhere in the client, so the
   * number cannot be derived. Recorded as NEEDS-BACKEND. The moment a close date exists, feed it
   * here and the chip's four states are already specified in PROGRAM-SHELL-SPEC.md §3.
   */
  /**
   * The `all` row is the panel's way back to "no filter"; the trigger shows the placeholder
   * ("Status") instead of this label whenever the value is `all`.
   */
  readonly statusOptions: BandFilterOption[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'not-started', label: 'Not started' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'achieved', label: 'Achieved' },
    { value: 'overachieved', label: 'Overachieved' }
  ];

  /** CURRENT selType: High level output / Outcome / Intermediate / 2030, plus the reset row. */
  readonly typeOptions: BandFilterOption[] = [
    { value: 'all', label: 'All types' },
    { value: 'hlo', label: 'High level output' },
    { value: 'outcome', label: 'Outcome' },
    { value: 'intermediate_outcome', label: 'Intermediate outcome' },
    { value: 'outcome_2030', label: '2030 outcome' }
  ];

  // ── Reporting JIRA-style Top-Bar Filter State ──
  readonly filterPopoverOpen = signal(false);

  toggleFilterPopover(event: Event): void {
    event.stopPropagation();
    this.filterPopoverOpen.update(v => !v);
  }

  closeFilterPopover(): void {
    this.filterPopoverOpen.set(false);
  }

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.compactFilters()) {
      if (this.centerValue() && this.centerValue() !== 'all') count++;
      if (this.byAowTypeValue() && this.byAowTypeValue() !== 'all') count++;
      if (this.statusValue() && this.statusValue() !== 'all') count++;
      if (this.onlyPending()) count++;
    } else {
      if (this.aowValue() && this.aowValue().length > 0) count += this.aowValue().length;
      if (this.typeValue() && this.typeValue() !== 'all') count++;
      if (this.typologyValue() && this.typologyValue() !== 'all') count++;
      if (this.statusValue() && this.statusValue() !== 'all') count++;
      if (this.onlyPending()) count++;
    }
    return count;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0 || !!this.search());

  readonly activeCenterLabel = computed(() => {
    const val = this.centerValue();
    if (!val || val === 'all') return '';
    const match = this.centerOptions().find(o => o.value === val);
    return match ? match.label.replace(/\s*\(\d+\)$/, '') : val;
  });

  readonly activeByAowTypeLabel = computed(() => {
    const val = this.byAowTypeValue();
    if (!val || val === 'all') return '';
    const match = this.byAowTypeOptions().find(o => o.value === val);
    return match ? match.label.replace(/\s*\(\d+\)$/, '') : val;
  });

  readonly activeAowChips = computed(() => {
    const vals = this.aowValue() || [];
    if (!vals.length) return [];
    const groups = this.aowOptions() || [];
    const map = new Map<string, string>();
    for (const g of groups) {
      for (const item of g.items || []) {
        map.set(item.value, item.label);
      }
    }
    return vals.map(v => ({ value: v, label: map.get(v) || v }));
  });

  readonly activeTypeLabel = computed(() => {
    const val = this.typeValue();
    if (!val || val === 'all') return '';
    return this.typeOptions.find(o => o.value === val)?.label || val;
  });

  readonly activeTypologyLabel = computed(() => {
    const val = this.typologyValue();
    if (!val || val === 'all') return '';
    return this.typologyOptions().find(o => o.value === val)?.label || val;
  });

  readonly activeStatusLabel = computed(() => {
    const val = this.statusValue();
    if (!val || val === 'all') return '';
    return this.statusOptions.find(o => o.value === val)?.label || val;
  });

  removeCenterChip(): void {
    this.centerChange.emit(null);
  }

  removeByAowTypeChip(): void {
    this.byAowTypeChange.emit(null);
  }

  removeAowChip(code: string): void {
    const next = (this.aowValue() || []).filter(v => v !== code);
    this.aowChange.emit(next);
  }

  removeTypeChip(): void {
    this.typeChange.emit('all');
  }

  removeTypologyChip(): void {
    this.typologyChange.emit('all');
  }

  removeStatusChip(): void {
    this.statusChange.emit('all');
  }

  removeOnlyPendingChip(): void {
    this.onlyPendingChange.emit(false);
  }

  /**
   * `title` for the **Total KPIs** figure (`KCR-R-2.1`, `KCR-DD-4`). The figure itself is *Counted*;
   * this states the *Planned* count it was derived from and, when the zero-target rule removed at
   * least one KPI, how many — `11 planned · excludes 2 zero-target KPIs`, or plain `11 planned`
   * when nothing was excluded. Built here rather than in the template: `KCR` design §6.3 forbids
   * template arithmetic, and the pluralisation has to match `reporting-aow-table.countLabel`
   * exactly so the band and the grouped table never disagree on the same sentence.
   *
   * `null` (not `''`) when the host carries no `plannedKpis` — `[attr.title]` then omits the
   * attribute instead of rendering an empty tooltip.
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  totalKpisTitle(stats: ReportingSummaryStats): string | null {
    const planned = stats.plannedKpis;
    if (planned === null || planned === undefined) return null;
    const zeroTarget = stats.zeroTargetKpis ?? 0;
    if (zeroTarget <= 0) return `${planned} planned`;
    return `${planned} planned · excludes ${this.countLabel(zeroTarget, 'zero-target KPI')}`;
  }

  /** Same body as `reporting-aow-table.countLabel` — the pluralisation `KCR-R-2.1` pins. */
  private countLabel(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }

  evidencePercentage(stats: ReportingSummaryStats): number {
    return stats.totalKpis > 0 ? Math.round((stats.reportedKpis / stats.totalKpis) * 100) : 0;
  }

  toggleInfo(event: Event): void {
    event.stopPropagation();
    this.skipNextDocumentClick = true;
    this.infoOpen.update(open => !open);
  }

  closeInfo(): void {
    this.infoOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: MouseEvent): void {
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    if (this.infoOpen()) this.infoOpen.set(false);

    const target = event?.target as HTMLElement | null;
    if (
      target?.closest('.pr-reporting-filter-container') ||
      target?.closest('.p-multiselect-panel') ||
      target?.closest('.p-dropdown-panel')
    ) {
      return;
    }
    if (this.filterPopoverOpen()) {
      this.filterPopoverOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.infoOpen()) this.infoOpen.set(false);
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }
}
