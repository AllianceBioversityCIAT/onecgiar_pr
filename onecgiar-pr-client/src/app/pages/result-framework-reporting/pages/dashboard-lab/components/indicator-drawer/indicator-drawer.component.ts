import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';

type DrawerTab = 'report' | 'info';

/**
 * INDICATOR DRAWER — the manage surface for one planned indicator.
 *
 * Slides in from the right instead of covering the screen with a dialog, so the
 * indicator list stays visible behind it and the user keeps their place. Holds the
 * three things you can do with an indicator: report against it, see what has
 * already been reported, and inspect how its target is split per Center and year.
 *
 * The "Report result" tab is the integration point for the existing create form
 * (`aow-hlo-create-modal`). That component has no inputs today — it reads
 * `EntityAowService.currentResultToReport()` / `entityDetails()` directly and wraps
 * itself in `app-pr-dialog` — so hosting it here means extracting its body first.
 * That refactor touches the old view and is deliberately not done blind.
 */
@Component({
  selector: 'app-indicator-drawer',
  standalone: true,
  imports: [DecimalPipe, LabReportFormComponent],
  templateUrl: './indicator-drawer.component.html',
  styleUrls: ['./indicator-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorDrawerComponent {
  private readonly api = inject(ApiService);

  /** The indicator being managed, plus the context it lives in. */
  readonly indicator = input.required<any>();
  readonly groupTitle = input<string>('');
  readonly programCode = input<string>('');
  /** The ToC node the indicator hangs from, and the owning initiative. */
  readonly tocNode = input<any>(null);
  readonly initiativeId = input<number>(0);
  readonly aowCode = input<string>('');
  readonly accent = input<string>('#6b6dc4');
  /** Tab to land on — set by the card button that opened the drawer. */
  readonly initialTab = input<DrawerTab>('report');

  readonly closed = output<void>();
  /** The host reserves this much room so the panel never covers the list. */
  readonly widthChange = output<number>();

  /**
   * Panel width, dragged from its left edge. Below the threshold the form runs in
   * one column; above it, two — so widening the panel actually buys the user
   * something instead of just stretching the fields. Defaults above the threshold
   * so the report form opens two-column ("readable at a glance") without dragging.
   */
  readonly width = signal(740);
  readonly TWO_COLUMN_AT = 720;
  readonly columns = computed<1 | 2>(() => (this.width() >= this.TWO_COLUMN_AT ? 2 : 1));

  /** Unsaved work in the form; closing or switching indicator must warn first. */
  readonly formDirty = signal(false);
  readonly confirmingExit = signal<null | 'close'>(null);

  private dragging = false;

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    const move = (e: MouseEvent) => {
      if (!this.dragging) return;
      // Dragged from the left edge: the further left, the wider the panel.
      const next = Math.min(Math.max(window.innerWidth - e.clientX, 380), Math.min(1100, window.innerWidth - 320));
      this.width.set(next);
      this.widthChange.emit(next);
    };
    const up = () => {
      this.dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  onDirtyChange(dirty: boolean): void {
    this.formDirty.set(dirty);
  }

  requestClose(): void {
    if (this.formDirty()) {
      this.confirmingExit.set('close');
      return;
    }
    this.close();
  }

  cancelExit(): void {
    this.confirmingExit.set(null);
  }

  discardAndClose(): void {
    this.confirmingExit.set(null);
    this.formDirty.set(false);
    this.close();
  }

  /** Which drawer this is — set once by the card button, no in-drawer tab switching. */
  readonly tab = signal<DrawerTab>('report');
  /** True once the mode is fixed, so the smart default stops overriding. */
  private tabTouched = false;

  // ---- existing results (View results tab) --------------------------------
  readonly existing = signal<any[] | null>(null);
  readonly loadingExisting = signal(false);

  /** Target split per Center and year, straight off the indicator payload. */
  readonly targetsByCenter = computed<any[]>(() => this.indicator()?.targets_by_center?.targets ?? []);

  constructor() {
    // Reset per indicator: the drawer is reused rather than re-created. The tab is
    // the explicit choice of the card button that opened it, so honour it and don't
    // let the smart default override.
    effect(() => {
      const ind = this.indicator();
      this.tab.set(this.initialTab());
      this.tabTouched = true;
      this.existing.set(null);
      this.formDirty.set(false);
      if (ind) this.loadExisting(ind);
    });
  }

  setTab(tab: DrawerTab): void {
    this.tabTouched = true;
    this.tab.set(tab);
  }

  close(): void {
    this.closed.emit();
  }

  private loadExisting(ind: any): void {
    const tocResultId = ind?.toc_result_id ?? this.indicator()?.toc_result_id;
    const indicatorId = ind?.toc_result_indicator_id;
    if (!tocResultId || !indicatorId) {
      this.existing.set([]);
      return;
    }
    this.loadingExisting.set(true);
    this.api.resultsSE.GET_ExistingResultsContributors(tocResultId, indicatorId).subscribe({
      next: (res: { response?: any[] }) => {
        const list = res?.response ?? [];
        this.existing.set(list);
        this.loadingExisting.set(false);
        // Smart default: if something is already reported here, someone opening the
        // drawer is likely coming to look — land on Information, not the blank form.
        // Never override a tab the user already picked by hand.
        if (list.length && !this.tabTouched) this.tab.set('info');
      },
      error: () => {
        this.existing.set([]);
        this.loadingExisting.set(false);
      }
    });
  }
}
