import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  input,
  output,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo, lucideSearch, lucideX, lucideZap } from '@ng-icons/lucide';

export interface BandFilterOption {
  value: string;
  label: string;
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
  imports: [RouterLink, NgIcon],
  templateUrl: './reporting-program-band.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideInfo, lucideSearch, lucideX, lucideZap })]
})
export class ReportingProgramBandComponent {
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
  readonly aowValue = input<string>('all');
  readonly aowOptions = input<BandFilterOption[]>([]);
  readonly viewMode = input<'grouped' | 'flat'>('grouped');
  /** Overview has no filters, so the band renders on its own there. */
  readonly showToolbar = input<boolean>(true);

  readonly searchChange = output<string>();
  readonly statusChange = output<string>();
  readonly typologyChange = output<string>();
  readonly aowChange = output<string>();
  readonly viewModeChange = output<'grouped' | 'flat'>();

  /**
   * Overview is its OWN surface now (`/overview`), not the retired bento at `/home` — sending the
   * tab back there was the bug this route fixes.
   */
  readonly overviewPath = '/result-framework-reporting/overview';
  readonly reportingPath = '/result-framework-reporting/planned-toc';
  readonly emergingPath = '/result-framework-reporting/emerging';

  /** ⓘ popover open state — click toggles, Escape / outside click close (reference :348). */
  readonly infoOpen = signal(false);
  /** Guards the document click that fires in the same tick as the open toggle. */
  private skipNextDocumentClick = false;

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
  readonly statusOptions: readonly BandFilterOption[] = [
    { value: 'all', label: 'Status' },
    { value: 'not-started', label: 'Not started' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'achieved', label: 'Achieved' },
    { value: 'overachieved', label: 'Overachieved' }
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

  onSelect(emitter: { emit: (v: string) => void }, ev: Event): void {
    emitter.emit((ev.target as HTMLSelectElement).value);
  }
}
