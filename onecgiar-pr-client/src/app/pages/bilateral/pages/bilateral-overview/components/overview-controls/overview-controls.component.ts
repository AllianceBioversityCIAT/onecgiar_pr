// @akili-spec bilateral/center-overview-tab (COV-T-5, COV-R-2, COV-R-3, COV-R-4, COV-R-18)
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
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

/** One row of the phase listbox (`COV-R-2` A: `«phase_name» · «phase_year»` + an "Open" badge). */
export interface OverviewPhaseOption {
  id: number;
  label: string;
  isOpen: boolean;
}

/**
 * `COV-R-2` C — `GET /api/versioning` delivers `Phases.id` as a **string** (`'34'`) although the
 * interface types it `number`. `selectedPhaseId` is numeric, so an un-normalized `phase.id ===`
 * matched nothing: the listbox option value never equalled the selected id and the trigger stayed
 * on whatever the page had resolved by fallback.
 */
function phaseVersionId(phase: Phases): number {
  return Number(phase.id);
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
 *
 * The phase control is a token-styled `role="combobox"` trigger over a hand-rolled ARIA 1.2
 * `role="listbox"` in the SAME `cdkConnectedOverlay` mechanism the Filter popover uses, so both
 * open, dismiss and restore focus identically (design §6.2, corrected at `COV-T-8` H-3: the
 * original `pr-select` primitive rendered the legacy grey-input + solid-chevron look and was
 * rejected on the live page). Anchors: the SP Overview "Scope" control and the Drafts project
 * filter.
 */
@Component({
  selector: 'app-overview-controls',
  standalone: true,
  imports: [A11yModule, OverlayModule],
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

  /** Phase listbox open state (`COV-R-2` B) — same overlay mechanism as the Filter popover. */
  readonly phaseOpen = signal(false);
  /** The option the arrow keys are currently on (`aria-activedescendant`), not the selection. */
  readonly activePhaseId = signal<number | null>(null);
  /** Ties the trigger's `aria-controls` to the listbox panel. */
  readonly phaseListboxId = 'overview-phase-listbox';

  /** The Filter trigger — focus goes back to it whenever the popover closes. */
  private readonly filterOrigin = viewChild<CdkOverlayOrigin>('filterOrigin');
  private readonly phaseTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('phaseTrigger');
  private readonly phaseListRef = viewChild<ElementRef<HTMLDivElement>>('phaseList');

  constructor() {
    // Moves DOM focus into the listbox once the overlay's content is actually in the DOM — the
    // portal attaches on the next tick, so a synchronous `.focus()` right after `phaseOpen.set(true)`
    // would miss it (same shape as the SP Overview scope control).
    effect(() => {
      if (this.phaseOpen()) {
        queueMicrotask(() => this.phaseListRef()?.nativeElement.focus());
      }
    });
  }

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

  /** `COV-R-2` A — one row per phase, most recent cycle first. */
  readonly phaseOptions = computed<OverviewPhaseOption[]>(() =>
    [...this.phases()]
      .sort((a, b) => Number(b.phase_year) - Number(a.phase_year))
      .map(phase => ({
        id: phaseVersionId(phase),
        label: `${phase.phase_name} · ${phase.phase_year}`,
        isOpen: Boolean(phase.status),
      })),
  );

  readonly selectedPhase = computed<Phases | null>(
    () => this.phases().find(phase => phaseVersionId(phase) === this.selectedPhaseId()) ?? null,
  );

  /** What the closed trigger reads; the placeholder only shows while the phase list is loading. */
  readonly selectedPhaseLabel = computed<string>(() => {
    const phase = this.selectedPhase();
    return phase ? `${phase.phase_name} · ${phase.phase_year}` : 'Select phase';
  });

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

  // ── Phase combobox + listbox (`COV-R-2`, `COV-R-3` C keyboard rules) ─────────────────────────

  togglePhaseListbox(): void {
    this.phaseOpen() ? this.closePhaseListbox() : this.openPhaseListbox();
  }

  openPhaseListbox(): void {
    if (this.phaseOpen()) return;
    this.activePhaseId.set(this.selectedPhaseId());
    this.phaseOpen.set(true);
  }

  /** Closes WITHOUT emitting; focus returns to the trigger so the keyboard never lands nowhere. */
  closePhaseListbox(refocusTrigger = true): void {
    if (!this.phaseOpen()) return;
    this.phaseOpen.set(false);
    if (refocusTrigger) {
      queueMicrotask(() => this.phaseTriggerRef()?.nativeElement.focus());
    }
  }

  selectPhase(phaseId: number): void {
    this.onPhasePicked(phaseId);
    this.closePhaseListbox();
  }

  /** Stable id per option for `aria-activedescendant`. */
  phaseOptionId(phaseId: number | null): string {
    return `overview-phase-option-${phaseId ?? 'none'}`;
  }

  /** Variable half of an option row's class list — whole strings so Tailwind's scan sees them. */
  phaseOptionClass(phaseId: number): string {
    return this.activePhaseId() === phaseId
      ? 'border-[var(--pr-color-primary-300)] bg-[var(--pr-surface-subtle)]'
      : 'border-transparent';
  }

  onPhaseTriggerKeydown(event: KeyboardEvent): void {
    if (this.phaseOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPhaseListbox();
    }
  }

  onPhaseListKeydown(event: KeyboardEvent): void {
    const ids = this.phaseOptions().map(option => option.id);
    if (!ids.length) return;
    const currentIndex = ids.indexOf(this.activePhaseId() as number);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activePhaseId.set(ids[currentIndex < 0 ? 0 : Math.min(currentIndex + 1, ids.length - 1)]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activePhaseId.set(ids[currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0)]);
        break;
      case 'Home':
        event.preventDefault();
        this.activePhaseId.set(ids[0]);
        break;
      case 'End':
        event.preventDefault();
        this.activePhaseId.set(ids[ids.length - 1]);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const active = this.activePhaseId();
        if (active !== null) this.selectPhase(active);
        break;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closePhaseListbox();
        break;
    }
  }

  /** The overlay's own key stream — `Escape` anywhere in the panel closes without emitting. */
  onPhaseOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closePhaseListbox();
    }
  }

  onPhasePicked(phaseId: number | string | null | undefined): void {
    if (phaseId === null || phaseId === undefined || phaseId === '') return;
    const id = Number(phaseId);
    if (!Number.isFinite(id)) return;
    if (id === this.selectedPhaseId()) return;
    this.phaseChange.emit(id);
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
