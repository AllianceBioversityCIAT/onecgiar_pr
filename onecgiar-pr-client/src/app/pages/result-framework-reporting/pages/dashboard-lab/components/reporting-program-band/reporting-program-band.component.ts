import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideInfo, lucideSearch, lucideZap } from '@ng-icons/lucide';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';

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
 * ⚠️ px, never rem type utilities — `html` is 12px here, so `text-sm` renders 10.5px (UI-RULES §1.3).
 */
@Component({
  selector: 'app-reporting-program-band',
  standalone: true,
  imports: [RouterLink, NgIcon, PrTooltipDirectiveModule],
  templateUrl: './reporting-program-band.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideChevronDown, lucideInfo, lucideSearch, lucideZap })]
})
export class ReportingProgramBandComponent {
  readonly programCode = input<string>('');
  readonly programName = input<string>('');
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

  readonly searchChange = output<string>();
  readonly statusChange = output<string>();
  readonly typologyChange = output<string>();
  readonly aowChange = output<string>();
  readonly viewModeChange = output<'grouped' | 'flat'>();

  readonly overviewPath = '/result-framework-reporting/home';
  readonly reportingPath = '/result-framework-reporting/planned-toc';
  readonly emergingPath = '/result-framework-reporting/emerging';

  /** `SP01 · REPORTING CYCLE 2026 · P25` — every part comes from data the app already holds. */
  readonly eyebrow = computed(() => {
    const parts: string[] = [];
    if (this.programCode()) parts.push(this.programCode());
    if (this.cycleYear()) parts.push(`Reporting cycle ${this.cycleYear()}`);
    if (this.cyclePhase()) parts.push(this.cyclePhase());
    return parts.join(' · ');
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

  onSelect(emitter: { emit: (v: string) => void }, ev: Event): void {
    emitter.emit((ev.target as HTMLSelectElement).value);
  }
}
