import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ResultSectionsService } from '../result-sections-sidebar/result-sections.service';

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
  // `sticky` MUST live on the HOST, not on a div inside it. A sticky element can only travel
  // within its own parent's box, and the host wraps the bar exactly — so with the class on the
  // inner div the travel range was zero and the bar never left its natural position at the end of
  // the form. On the host, the parent is the section container and the bar rides the whole page.
  host: { class: 'sticky bottom-0 z-[6] block' },
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionBottomBarComponent {
  /** Lets a read-only user still save (same escape hatch `app-save-button` has). */
  @Input() editable = false;
  /** Consumer-side veto — a section that knows its own form is not saveable yet. */
  @Input() disabled = false;
  @Input() text = 'Save draft';
  @Output() clickSave = new EventEmitter();

  readonly saveButtonSE = inject(SaveButtonService);
  readonly dataControlSE = inject(DataControlService);
  readonly rolesSE = inject(RolesService);
  private readonly sectionsSE = inject(ResultSectionsService);
  private readonly router = inject(Router);

  /** Open/closed state of the pending-fields popover. */
  readonly pendingOpen = signal(false);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.pathFromUrl())
    ),
    { initialValue: this.pathFromUrl() }
  );

  private readonly currentIndex = computed(() => {
    const path = this.currentPath();
    return this.sectionsSE.sections().findIndex(s => s.path === path);
  });

  readonly total = computed(() => this.sectionsSE.sections().length);
  /** 1-based position, or 0 when the current route is not one of the listed sections. */
  readonly position = computed(() => this.currentIndex() + 1);
  readonly showPosition = computed(() => this.currentIndex() >= 0 && this.total() > 0);

  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() >= 0 && this.currentIndex() < this.total() - 1);

  readonly missingFields = computed(() => this.dataControlSE.fieldFeedbackList());
  readonly isComplete = computed(() => this.missingFields().length === 0);

  get canSave(): boolean {
    return !this.rolesSE.readOnly || this.editable;
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

  /** Last path segment, without the query string. */
  private pathFromUrl(): string {
    return this.router.url.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  }
}
