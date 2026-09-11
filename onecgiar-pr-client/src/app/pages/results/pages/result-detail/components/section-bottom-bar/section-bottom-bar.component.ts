import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ResultSectionsService } from '../result-sections-sidebar/result-sections.service';
import { SectionBottomBarSlotService } from './section-bottom-bar-slot.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

/**
 * Bottom bar of a result-detail section: section-to-section navigation, the position in the
 * sequence, whether this section still has missing mandatory fields, and Save.
 *
 * Replaces the floating `app-save-button` block on the result-detail pages. Its API is kept
 * ((clickSave) / [disabled] / [text] / [editable]) so each section keeps owning its own save
 * logic and only the markup changed. `app-save-button` itself is untouched — IPSR, the result
 * creator and the shared "Links to results" section still use it.
 *
 * The completion state reads the section's GREEN CHECK, not the DOM (see `isComplete`). The DOM
 * scan behind `DataControlService.fieldFeedbackList()` — the same signal the old floating
 * "N alerts" chip read — is kept only to name which fields are missing.
 */
@Component({
  selector: 'app-section-bottom-bar',
  templateUrl: './section-bottom-bar.component.html',
  // The bar no longer sticks to anything: it is teleported into the layout's slot (see
  // `SectionBottomBarSlotService`), where it is a plain flex sibling of the scroll container and
  // therefore already sits on the floor of the content column, at its full width. `sticky
  // bottom-0` here used to be the only way to keep it on screen while the whole document
  // scrolled, and it came at the cost of the bar inheriting its ancestor's 885px width.
  // `z-[6]` stays: the floating "Links to results" helpers still overlap this strip.
  host: { class: 'z-[6] block w-full flex-none' },
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionBottomBarComponent implements AfterViewInit, OnDestroy {
  /** Lets a read-only user still save (same escape hatch `app-save-button` has). */
  @Input() editable = false;
  /** Consumer-side veto — a section that knows its own form is not saveable yet. */
  @Input() disabled = false;
  @Input() text = 'Save draft';
  @Output() clickSave = new EventEmitter();

  readonly saveButtonSE = inject(SaveButtonService);
  readonly dataControlSE = inject(DataControlService);
  readonly rolesSE = inject(RolesService);
  readonly sectionsSE = inject(ResultSectionsService);
  readonly fieldsManagerSE = inject(FieldsManagerService);
  private readonly router = inject(Router);
  private readonly slotSE = inject(SectionBottomBarSlotService);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Open/closed state of the pending-fields popover. */
  readonly pendingOpen = signal(false);

  /**
   * True while `Next` is saving the open section before it navigates (P2-3659 / P2-3654). Keeps the
   * button out of reach for a second click, which would emit a second save over the first.
   */
  readonly savingBeforeNext = signal(false);

  // La posición vive en `ResultSectionsService`: el encabezado de la card muestra el MISMO
  // número, y dos contadores independientes se desincronizan en cuanto la lista de secciones
  // se filtra distinto (portafolio, tipo de resultado).
  private readonly currentIndex = this.sectionsSE.currentIndex;

  readonly total = this.sectionsSE.navigableCount;
  /** 1-based position, or 0 when the current route is not one of the listed sections. */
  readonly position = this.sectionsSE.currentPosition;
  readonly showPosition = this.sectionsSE.hasCurrentSection;

  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() >= 0 && this.currentIndex() < this.total() - 1);

  /**
   * Whether `Next` saves the open section before navigating (P2-3659 / P2-3654).
   *
   * QA reproduced the loss on result 9142 (10 Sep 2026) across four sections: everything typed and
   * shown as "Section complete" was gone on revisit, and after a hard reload, unless `Save draft`
   * had been pressed — `goNext` only navigated, and each section's PATCH hangs off that button
   * alone. A reporter filling the form through the natural `Next` flow lost every section but the
   * last one saved.
   *
   * 🛑 Gated on the reporting phase YEAR, never on the portfolio: the P25 portfolio holds the 2025
   * phase too, and writing to a closed phase because someone paged through it is exactly what the
   * epic's governing rule forbids. An unknown year keeps the legacy behaviour — the detail renders
   * before the result lands, so the safe side to fail towards is "navigate, do not write".
   *
   * `canSave` and `disabled` are part of the gate for the same reason: with no Save button on
   * screen (read-only) or with the consumer vetoing it, there is nothing to trigger.
   */
  autoSavesOnNext(): boolean {
    // Deliberately a method and not a `computed`: `disabled` is a plain `@Input` and `canSave` reads
    // `RolesService.readOnly`, a plain boolean — a computed would cache the first answer and never
    // see either of them change.
    return this.fieldsManagerSE.isSectionAutoSaveOnNext2026() && this.canSave && !this.disabled;
  }

  readonly missingFields = computed(() => this.dataControlSE.fieldFeedbackList());

  /**
   * Whether the open section is complete.
   *
   * RSC-1 (2026-09-08, supersedes P2-3542 for this pill only): back to `missingFields().length
   * === 0` — a live, client-side DOM scan — for every route, not just IPSR/the result creator.
   * P2-3542 moved this to the server-computed green check (`currentSectionIsDone()`) because the
   * scan disagreed with it in two ways: (1) only the ACTIVE ToC tab is in the DOM, so other tabs'
   * mandatory fields were invisible to the scan; (2) some completeness rules live only in
   * validation logic with no rendered `.mandatory` marker (e.g. "at least one Contributing CGIAR
   * Center"), so the scan could say "complete" when the green check said otherwise.
   *
   * Both reasons are addressed for the sections this component now covers: (1) `rd-theory-of-change`
   * (the only section with hidden ToC tabs) is P22-only and this bar's autosave/live-completeness
   * behavior is scoped to P25 — moot. (2) The one business rule known to lack a DOM marker
   * (Contributing CGIAR Centers) now has one — see `rd-contributors-and-partners.component.html`'s
   * `appFeedbackValidation` markers bound to `[isComplete]="contributingCentersComplete"` (P2-3249)
   * — so the scan reflects that rule correctly today, verified by that component's own
   * `*.zoneless.spec.ts` running the real scan against the real template.
   *
   * Trade-off accepted: the green check stays authoritative for the SIDEBAR RAIL and for gating
   * Submit (`GreenChecksService`/`ResultSectionsService.currentSectionIsDone()` are untouched) — a
   * save can still turn up a server-side rule this scan does not know about, in which case this
   * pill and the rail can briefly disagree until the next save resolves it. What changes is only
   * this bar's own pill: it now updates instantly as the user types, instead of waiting for a
   * server round-trip, which was the actual ask this ticket exists for.
   */
  readonly isComplete = computed(() => this.missingFields().length === 0);

  /**
   * Label of the "incomplete" button. The count is only honest when the DOM scan is what found the
   * gap; when the section is red for a requirement the scan cannot see, "0 fields missing" would
   * read as a contradiction of the very state it is announcing.
   */
  readonly pendingLabel = computed(() => {
    const count = this.missingFields().length;
    return count ? `${count} field${count === 1 ? '' : 's'} missing` : 'Section incomplete';
  });

  get canSave(): boolean {
    return !this.rolesSE.readOnly || this.editable;
  }

  ngAfterViewInit(): void {
    const el = this.hostRef.nativeElement.querySelector('.sbb-sync-slot') as HTMLElement;
    if (el) {
      this.slotSE.syncSlot.set(el);
    }
  }

  /**
   * Move the host node into the layout's slot, as an effect rather than a one-shot hook: the
   * slot is published by a component that may mount in the same change-detection pass, so
   * reacting to the signal covers both orderings. Does nothing while there is no slot — IPSR
   * and the result creator render sections outside the result-detail layout, and there the bar
   * has to stay exactly where it was declared.
   */
  private readonly teleport = effect(() => {
    this.slotSE.slot()?.appendChild(this.hostRef.nativeElement);
  });

  /**
   * Angular removes a node through its CURRENT parent, so the teleported host is cleaned up on
   * its own. This only guards the case where the slot outlives the bar (switching from one
   * section to another): the outgoing bar is detached before the incoming one appends itself, so
   * the two never stack during the route transition.
   */
  ngOnDestroy(): void {
    this.slotSE.syncSlot.set(null);
    this.hostRef.nativeElement.remove();
  }

  goPrevious(): void {
    this.goTo(this.currentIndex() - 1);
  }

  goNext(): void {
    const index = this.currentIndex() + 1;
    if (!this.sectionsSE.sections()[index]) return;

    if (!this.autoSavesOnNext() || this.savingBeforeNext() || this.saveButtonSE.isSaving()) {
      this.goTo(index);
      return;
    }

    void this.saveThenGo(index);
  }

  /**
   * Saves the open section and only then moves on.
   *
   * Stays on the section when the save FAILED — the error toast raised by `isSavingPipe` is on
   * screen and the rejected values are still in the form, which is the whole point of waiting. Any
   * other outcome navigates: `not-started` means the section never issued a request (its own guard
   * blocked it, or it opened a confirmation modal), and treating that as a failure would leave
   * `Next` doing nothing at all on those sections.
   */
  private async saveThenGo(index: number): Promise<void> {
    this.savingBeforeNext.set(true);
    try {
      const outcome = await this.saveButtonSE.saveAndSettle(() => this.clickSave.emit());
      if (outcome === 'failed') return;
      this.goTo(index);
    } finally {
      this.savingBeforeNext.set(false);
    }
  }

  togglePending(): void {
    this.pendingOpen.update(v => !v);
  }

  closePending(): void {
    this.pendingOpen.set(false);
  }

  /**
   * The guard lives here rather than in the template so it survives a CSS regression — the
   * disabled styling is the second line of defence, never the only one. Same rule
   * `SaveButtonComponent.onClickSave` follows.
   */
  onClickSave(): void {
    if (this.saveButtonSE.isSaving() || this.disabled) return;
    this.clickSave.emit();
  }

  trackByField(_index: number, item: string): string {
    return item;
  }

  private goTo(index: number): void {
    const target = this.sectionsSE.sections()[index];
    if (!target) return;
    this.router.navigate([this.sectionsSE.sectionLink(target)], { queryParams: this.sectionsSE.sectionQueryParams() });
  }
}
