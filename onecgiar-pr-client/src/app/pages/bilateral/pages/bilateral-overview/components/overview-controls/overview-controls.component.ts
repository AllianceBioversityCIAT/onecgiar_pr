// @akili-spec bilateral/center-overview-tab (COV-T-5, COV-R-2, COV-R-3, COV-R-4, COV-R-18)
import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { Phases } from '../../../../../../shared/interfaces/phasesList.interface';
import {
  BilateralMethod,
  BilateralQueryParams,
  BilateralRole,
  BilateralSource,
} from '../../../../bilateral-query-params';

/** One selectable value in a filter dimension (`COV-R-3`'s table). */
export interface OverviewFilterOption<T> {
  value: T;
  label: string;
}

/** The six filter dimensions, in the order `COV-R-3` lists them. */
export type OverviewFilterDimension = 'program' | 'project' | 'type' | 'role' | 'source' | 'method';

/** One rendered chip next to the Filter button — `Program: SP03`, `Source: W3/Bilateral`, … */
export interface OverviewFilterChip {
  dimension: OverviewFilterDimension;
  label: string;
  value: string;
}

const ROLE_LABELS: Record<BilateralRole, string> = { lead: 'Lead', contributing: 'Contributing' };
const SOURCE_LABELS: Record<BilateralSource, string> = { w3: 'W3/Bilateral', w1w2: 'W1/W2' };
const METHOD_LABELS: Record<BilateralMethod, string> = { ai: 'AI-assisted', manual: 'Manual' };

/** Phase option shape handed to `app-pr-select` (`optionLabel`/`optionValue`/`optionBadgeLabel`). */
interface PhaseSelectOption {
  id: number;
  select_label: string;
  select_badge: string;
  select_badge_tone: string;
}

/**
 * The Overview's docked controls row (`COV-R-2`, `COV-R-3`, `COV-R-4`): a phase selector, a single
 * Filter button opening a six-dimension popover, one removable chip per active dimension and a
 * Clear action. Deliberately **presentational** — it owns no data, no URL and no service: every
 * option list arrives as an input and every user action leaves as an output, so the page stays the
 * one place that reconciles URL ↔ state (`design.md` §6.2).
 *
 * The popover edits a DRAFT copy of the applied params; `Escape`, a backdrop click or `Cancel`
 * throw that draft away without emitting (hard rule 4 / `COV-R-3` Scenario C).
 *
 * Focus is trapped inside the popover while it is open and returned to the Filter trigger when it
 * closes (`COV-R-3` C "keyboard-operable", hard rule 4): the CDK appends the overlay at the END of
 * `<body>`, so without the trap a keyboard user would have to tab through the whole page to reach
 * a dialog that visually sits under the button they just pressed.
 */
@Component({
  selector: 'app-overview-controls',
  standalone: true,
  imports: [FormsModule, A11yModule, OverlayModule, CustomFieldsModule],
  templateUrl: './overview-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewControlsComponent {
  /** P25 reporting phases, already filtered and sorted by the page (`COV-R-2` A). */
  readonly phases = input<Phases[]>([]);
  /** The resolved effective phase id (`null` only while the phase list is still loading). */
  readonly selectedPhaseId = input<number | null>(null);
  /** The APPLIED filter state (the URL's, not the popover draft's). */
  readonly params = input.required<BilateralQueryParams>();
  readonly programOptions = input<OverviewFilterOption<string>[]>([]);
  readonly projectOptions = input<OverviewFilterOption<number>[]>([]);
  readonly typeOptions = input<OverviewFilterOption<number>[]>([]);

  readonly phaseChange = output<number>();
  /** The full filter state to apply — `phase` is carried through untouched (`COV-R-3` B). */
  readonly filtersChange = output<BilateralQueryParams>();
  readonly clearFilters = output<void>();

  readonly popoverOpen = signal(false);

  /** The Filter trigger — focus goes back to it whenever the popover closes. */
  private readonly filterOrigin = viewChild<CdkOverlayOrigin>('filterOrigin');

  /** The popover's in-progress edit; committed only by `Apply`. */
  private readonly draft = signal<BilateralQueryParams | null>(null);

  readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  readonly roleChoices: OverviewFilterOption<BilateralRole>[] = [
    { value: 'lead', label: ROLE_LABELS.lead },
    { value: 'contributing', label: ROLE_LABELS.contributing },
  ];
  readonly sourceChoices: OverviewFilterOption<BilateralSource>[] = [
    { value: 'w3', label: SOURCE_LABELS.w3 },
    { value: 'w1w2', label: SOURCE_LABELS.w1w2 },
  ];
  readonly methodChoices: OverviewFilterOption<BilateralMethod>[] = [
    { value: 'ai', label: METHOD_LABELS.ai },
    { value: 'manual', label: METHOD_LABELS.manual },
  ];

  readonly phaseSelectOptions = computed<PhaseSelectOption[]>(() =>
    this.phases().map(phase => ({
      id: phase.id,
      select_label: `${phase.phase_name} · ${phase.phase_year}`,
      select_badge: phase.status ? 'Open' : '',
      select_badge_tone: 'match',
    })),
  );

  readonly selectedPhase = computed<Phases | null>(
    () => this.phases().find(phase => phase.id === this.selectedPhaseId()) ?? null,
  );

  /** `COV-R-3` A — one badge unit per ACTIVE dimension, not per selected value. */
  readonly activeFilterCount = computed(() => this.chips().length);

  readonly chips = computed<OverviewFilterChip[]>(() => {
    const params = this.params();
    const chips: OverviewFilterChip[] = [];

    if (params.program.length) {
      chips.push({ dimension: 'program', label: 'Program', value: this.joinLabels(params.program, this.programOptions()) });
    }
    if (params.project.length) {
      chips.push({ dimension: 'project', label: 'Project', value: this.joinLabels(params.project, this.projectOptions()) });
    }
    if (params.type.length) {
      chips.push({ dimension: 'type', label: 'Result type', value: this.joinLabels(params.type, this.typeOptions()) });
    }
    if (params.role) chips.push({ dimension: 'role', label: 'Role', value: ROLE_LABELS[params.role] });
    if (params.source) chips.push({ dimension: 'source', label: 'Source', value: SOURCE_LABELS[params.source] });
    if (params.method) chips.push({ dimension: 'method', label: 'Creation method', value: METHOD_LABELS[params.method] });

    return chips;
  });

  /** The draft the popover binds to — falls back to the applied params before the first open. */
  readonly draftParams = computed<BilateralQueryParams>(() => this.draft() ?? this.params());

  /**
   * Variable half of a control's class list (the static half stays on the element's `class`
   * attribute, which Angular merges with a `[class]` binding). Written as whole utility strings so
   * Tailwind's source scan sees them — a concatenated or interpolated class name would not be
   * generated (`onecgiar-pr-client/CLAUDE.md` §5 rule 19).
   */
  filterButtonClass(): string {
    return this.activeFilterCount() > 0
      ? 'border-[var(--pr-color-primary-300)] bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-600)] font-semibold'
      : 'border-[var(--pr-border)] bg-[var(--pr-surface-card)] text-[var(--pr-text-heading)]';
  }

  checkboxBoxClass(checked: boolean): string {
    return checked
      ? 'border-[var(--pr-color-primary-300)] bg-[var(--pr-color-primary-300)]'
      : 'border-[var(--pr-border-strong)] bg-[var(--pr-surface-card)]';
  }

  choiceChipClass(active: boolean): string {
    return active
      ? 'border-[var(--pr-color-primary-300)] bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-600)]'
      : 'border-[var(--pr-border)] bg-[var(--pr-surface-card)] text-[var(--pr-text-secondary)]';
  }

  togglePopover(): void {
    if (this.popoverOpen()) {
      this.closePopover();
      return;
    }
    this.draft.set({ ...this.params() });
    this.popoverOpen.set(true);
  }

  /** `COV-R-3` C — closes WITHOUT applying: the draft is discarded, nothing is emitted. */
  closePopover(): void {
    const wasOpen = this.popoverOpen();
    this.popoverOpen.set(false);
    this.draft.set(null);
    if (wasOpen) this.restoreTriggerFocus();
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closePopover();
    }
  }

  applyDraft(): void {
    const draft = this.draft();
    const wasOpen = this.popoverOpen();
    this.popoverOpen.set(false);
    this.draft.set(null);
    if (wasOpen) this.restoreTriggerFocus();
    if (draft) this.filtersChange.emit(draft);
  }

  /**
   * Returns focus to the Filter trigger. `cdkTrapFocusAutoCapture` restores it too, but only when
   * the overlay is actually torn down — doing it here makes the restore happen on the same turn as
   * the close, whichever path closed the popover (`Escape`, backdrop, `Cancel`, `Apply`).
   */
  private restoreTriggerFocus(): void {
    this.filterOrigin()?.elementRef.nativeElement.focus();
  }

  onPhasePicked(phaseId: number | null | undefined): void {
    if (phaseId === null || phaseId === undefined) return;
    if (phaseId === this.selectedPhaseId()) return;
    this.phaseChange.emit(Number(phaseId));
  }

  isProgramChecked(code: string): boolean {
    return this.draftParams().program.includes(code);
  }

  isProjectChecked(id: number): boolean {
    return this.draftParams().project.includes(id);
  }

  isTypeChecked(id: number): boolean {
    return this.draftParams().type.includes(id);
  }

  toggleProgram(code: string): void {
    this.draft.set({ ...this.draftParams(), program: toggleValue(this.draftParams().program, code) });
  }

  toggleProject(id: number): void {
    this.draft.set({ ...this.draftParams(), project: toggleValue(this.draftParams().project, id) });
  }

  toggleType(id: number): void {
    this.draft.set({ ...this.draftParams(), type: toggleValue(this.draftParams().type, id) });
  }

  /** Single-selection dimensions: picking the active value again returns to "both" (`null`). */
  selectRole(role: BilateralRole | null): void {
    this.draft.set({ ...this.draftParams(), role: this.draftParams().role === role ? null : role });
  }

  selectSource(source: BilateralSource | null): void {
    this.draft.set({ ...this.draftParams(), source: this.draftParams().source === source ? null : source });
  }

  selectMethod(method: BilateralMethod | null): void {
    this.draft.set({ ...this.draftParams(), method: this.draftParams().method === method ? null : method });
  }

  /** Removes one chip's whole dimension and applies immediately (`COV-R-3` B). */
  removeChip(dimension: OverviewFilterDimension): void {
    const params = this.params();
    const next: BilateralQueryParams = { ...params };
    if (dimension === 'program') next.program = [];
    if (dimension === 'project') next.project = [];
    if (dimension === 'type') next.type = [];
    if (dimension === 'role') next.role = null;
    if (dimension === 'source') next.source = null;
    if (dimension === 'method') next.method = null;
    this.filtersChange.emit(next);
  }

  onClear(): void {
    this.closePopover();
    this.clearFilters.emit();
  }

  private joinLabels<T extends string | number>(values: readonly T[], options: OverviewFilterOption<T>[]): string {
    return values.map(value => options.find(option => option.value === value)?.label ?? String(value)).join(', ');
  }
}

function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter(existing => existing !== value) : [...values, value];
}
