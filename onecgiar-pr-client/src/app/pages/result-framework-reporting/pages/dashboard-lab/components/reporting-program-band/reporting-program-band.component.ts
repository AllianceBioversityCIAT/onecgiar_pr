import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  input,
  NgZone,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  readonly programCode = input<string>('');
  readonly programName = input<string>('');
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
  /** Which tab is active. Overview and Reporting are separate routes, not local state. */
  readonly activeTab = input<'overview' | 'reporting'>('reporting');
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
  readonly viewModeChange = output<'grouped' | 'flat'>();
  /** Expand all / Collapse all was pressed. The host flips the switch; the band stays stateless. */
  readonly toggleExpandAll = output<void>();
  /**
   * The emerging pathway is a MODAL owned by the host, not a page. The band only announces the
   * intent so both CTA copies (expanded + condensed) stay a single behaviour.
   */
  readonly reportEmerging = output<void>();

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
   * Kept, unreferenced: the `/emerging` route still exists (nothing is deleted here) but the CTA no
   * longer navigates to it — it opens the legacy modal in place, which is where reporting an
   * emerging result has always happened.
   */
  readonly emergingPath = '/result-framework-reporting/emerging';

  /** ⓘ popover open state — click toggles, Escape / outside click close (reference :348). */
  readonly infoOpen = signal(false);
  /** Guards the document click that fires in the same tick as the open toggle. */
  private skipNextDocumentClick = false;

  /**
   * Scroll offset at which the band condenses. 88px is the exact height of the identity block
   * (reference :329) — the moment it would have scrolled away is the moment the reference swaps to
   * its `bandCollapsed` bar (:383): dot + programme name + tabs + `Report emerging result`, 48px.
   */
  private static readonly COLLAPSE_THRESHOLD_PX = 88;

  /** True while the page is scrolled past the identity block. Drives the compact band. */
  readonly bandCollapsed = signal(false);

  constructor() {
    // The DOCUMENT is the scroller here (the band is `sticky top-[56px]`, not inside an overflow
    // box), so the offset comes from `window`. The listener is registered OUTSIDE Angular and only
    // re-enters the zone on the single frame where the threshold is crossed: a zone-bound
    // `@HostListener('window:scroll')` would tick change detection on EVERY scroll frame to
    // maintain a boolean that flips twice per page. Passive: we never preventDefault.
    this.zone.runOutsideAngular(() => {
      const onScroll = () => this.syncBandCollapsed();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
    // A tab switch (Overview ⇄ Reporting) re-creates the band on an already-scrolled document —
    // without this first read the band would render expanded until the next scroll event.
    this.syncBandCollapsed();
  }

  /** Cheap: one `scrollY` read + a compare. Nothing happens unless the threshold is crossed. */
  private syncBandCollapsed(): void {
    const offset = window.scrollY || document.documentElement?.scrollTop || 0;
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
    const parts: string[] = [];
    if (this.cycleYear()) parts.push(`Reporting cycle ${this.cycleYear()}`);
    if (this.cyclePhase()) parts.push(this.cyclePhase());
    const tail = parts.join(' · ');
    return this.programCode() && tail ? `· ${tail}` : tail;
  });

  /**
   * Heading above the Reporting toolbar — reference :1102, `Report results linked to the
   * programme's 2026 ToC`. The year is the CURRENT cycle, never a literal: this surface is reused
   * every cycle and a hardcoded 2026 would silently lie in 2027. With no cycle loaded yet the year
   * is dropped rather than rendering an empty gap.
   */
  readonly reportingHeading = computed(() => {
    const year = this.cycleYear();
    return year ? `Report results linked to the programme's ${year} ToC` : "Report results linked to the programme's ToC";
  });

  /**
   * Body copy for the popover. Prefer the explicit description; otherwise the SP01 mock from the
   * reference (:1677) so the surface matches the design until the SP payload carries a real field.
   */
  readonly resolvedDescription = computed(() => {
    const explicit = this.programDescription()?.trim();
    if (explicit) return explicit;
    // Verbatim from PRMS-Shell.dc.html:1677 — placeholder until NEEDS-BACKEND description lands.
    return (
      'Breeding for Tomorrow modernizes CGIAR and national breeding programmes so that farmers get ' +
      'climate-resilient, market-preferred varieties faster. The programme connects market intelligence, ' +
      'breeding pipelines, trait discovery, genetic innovation and seed systems into one delivery chain, ' +
      'and works with national agricultural research systems and private seed partners across South Asia, ' +
      'sub-Saharan Africa and Latin America. Reporting covers products delivered to partners, the outcomes ' +
      'those products enable, and progress toward the 2030 outcomes agreed with donors.'
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

  toggleInfo(event: Event): void {
    event.stopPropagation();
    this.skipNextDocumentClick = true;
    this.infoOpen.update(open => !open);
  }

  closeInfo(): void {
    this.infoOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    if (this.infoOpen()) this.infoOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.infoOpen()) this.infoOpen.set(false);
  }

}
