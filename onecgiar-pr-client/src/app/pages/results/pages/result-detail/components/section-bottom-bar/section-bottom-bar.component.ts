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

/**
 * Bottom bar of a result-detail section: section-to-section navigation, the position in the
 * sequence, whether this section still has missing mandatory fields, and Save.
 *
 * Replaces the floating `app-save-button` block on the result-detail pages. Its API is kept
 * ((clickSave) / [disabled] / [text] / [editable]) so each section keeps owning its own save
 * logic and only the markup changed. `app-save-button` itself is untouched — IPSR, the result
 * creator and the shared "Links to results" section still use it.
 *
 * The completion state reads `DataControlService.fieldFeedbackList()`, the same signal the old
 * floating "N alerts" chip read. That list is produced by scanning the DOM for
 * `.pr-input.mandatory` / `.pr-field.mandatory`, which the field redesign did not touch.
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
  private readonly router = inject(Router);
  private readonly slotSE = inject(SectionBottomBarSlotService);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Open/closed state of the pending-fields popover. */
  readonly pendingOpen = signal(false);

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

  readonly missingFields = computed(() => this.dataControlSE.fieldFeedbackList());
  readonly isComplete = computed(() => this.missingFields().length === 0);

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
    this.goTo(this.currentIndex() + 1);
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
