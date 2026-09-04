import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';

// @akili-spec changes/indicator-reported-results
// IRR-R-1 / IRR-DD-1 — a third tab inside the drawer (never a second surface): the reported
// results move off the `info` card stack onto their own table.
export type DrawerTab = 'report' | 'info' | 'results';

/** One contributing result, shaped for the Reported results table (IRR-R-2). */
export interface ReportedResultRow {
  id: number | string | null;
  code: string;
  title: string;
  category: string;
  statusId: number | null;
  statusName: string;
  contribution: number | null;
  versionId: number | string | null;
  phaseName: string;
  raw: any;
}

/** Em dash — the single placeholder for "the server did not send it" across every cell. */
const EMPTY_CELL = '\u2014';

/**
 * Contributor DTO → table row (IRR-R-2.2, IRR-R-2.3, IRR-R-2.4; IRR-DD-3).
 *
 * Pure on purpose: the two fallbacks are the whole risk surface and both are silent when wrong.
 *  - Category is the server's `result_type_name`. When it is missing the cell shows an em dash,
 *    NEVER `result_type_id` — a bare `6` in a Category column reads as data, not as a gap.
 *  - Phase is resolved client-side against `PhasesService.phases.reporting`; an id the list does
 *    not know still prints its digits rather than `undefined`.
 */
export function toReportedResultRow(dto: any, phases: any[]): ReportedResultRow {
  const versionId = dto?.version_id ?? null;
  const phase = (phases ?? []).find(p => p?.id === versionId);
  const rawContribution = dto?.contributing_indicator;
  const contribution = rawContribution == null || Number.isNaN(Number(rawContribution)) ? null : Number(rawContribution);
  return {
    id: dto?.result_id ?? null,
    code: dto?.result_code == null ? '' : String(dto.result_code),
    title: dto?.result_title || dto?.title || 'Untitled result',
    category: dto?.result_type_name || EMPTY_CELL,
    statusId: dto?.status_id ?? null,
    statusName: dto?.status_name || EMPTY_CELL,
    contribution,
    versionId,
    phaseName: phase?.phase_name ?? (versionId == null ? EMPTY_CELL : String(versionId)),
    raw: dto
  };
}

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
  // @akili-spec changes/indicator-reported-results
  // IRR-DD-3 — the phase NAME is client-side data: the payload carries only `version_id`, and the
  // shell has already loaded the reporting phases by the time this drawer can open.
  private readonly phasesSE = inject(PhasesService);

  /** The indicator being managed, plus the context it lives in. */
  readonly indicator = input.required<any>();
  readonly groupTitle = input<string>('');
  readonly programCode = input<string>('');
  /** The ToC node the indicator hangs from, and the owning initiative. */
  readonly tocNode = input<any>(null);
  readonly initiativeId = input<number>(0);
  readonly aowCode = input<string>('');
  readonly accent = input<string>('#6b46e5');
  /** Tab to land on — set by the card button that opened the drawer. */
  readonly initialTab = input<DrawerTab>('report');
  /**
   * Whether the user may create a result against this indicator (phase open + member of the
   * program). Forwarded to the form, which hides the submit affordance without it. Defaults to
   * false so a host that forgets to pass it cannot accidentally expose the action.
   */
  readonly canReport = input<boolean>(false);

  readonly closed = output<void>();
  /** The host reserves this much room so the panel never covers the list. */
  readonly widthChange = output<number>();

  /**
   * Panel width, dragged from its left edge. Below the threshold the form runs in
   * one column; above it, two — so widening the panel actually buys the user
   * something instead of just stretching the fields. Defaults above the threshold
   * so the report form opens two-column ("readable at a glance") without dragging.
   */
  readonly width = signal(initialDrawerWidth());
  readonly TWO_COLUMN_AT = 720;
  readonly columns = computed<1 | 2>(() => (this.width() >= this.TWO_COLUMN_AT ? 2 : 1));

  /**
   * Context header (deliverable + chips) collapsed state. On small screens the block
   * eats most of the viewport before the form starts, so it opens collapsed there;
   * the toggle keeps it one tap away on every size.
   */
  readonly contextCollapsed = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  toggleContext(): void {
    this.contextCollapsed.update(v => !v);
  }

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
      // Clamp to the viewport so the drag can never push the panel off-screen on small windows.
      const maxW = Math.min(1100, Math.max(window.innerWidth - 320, 340), window.innerWidth);
      const next = Math.min(Math.max(window.innerWidth - e.clientX, Math.min(380, window.innerWidth)), maxW);
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

  // @akili-spec changes/indicator-reported-results
  // IRR-R-10 — title and icon are a MAP, not a ternary: a third tab turned the old
  // `tab() === 'report' ? a : b` pair into a silent mislabel for anything that is not `report`.
  private static readonly TAB_CHROME: Record<DrawerTab, { title: string; icon: string }> = {
    report: { title: 'Report result', icon: 'edit_note' },
    info: { title: 'Indicator information', icon: 'info' },
    results: { title: 'Reported results', icon: 'fact_check' }
  };
  readonly tabTitle = computed(() => IndicatorDrawerComponent.TAB_CHROME[this.tab()].title);
  readonly tabIcon = computed(() => IndicatorDrawerComponent.TAB_CHROME[this.tab()].icon);
  /** True once the mode is fixed, so the smart default stops overriding. */
  private tabTouched = false;

  // ---- existing results (View results tab) --------------------------------
  readonly existing = signal<any[] | null>(null);
  readonly loadingExisting = signal(false);
  // @akili-spec changes/indicator-reported-results
  // IRR-R-7 — a 404 means "nothing reported here yet" (the server's contract for a virgin
  // indicator) and stays an empty list. Anything else is a FAILURE and must say so: rendering an
  // empty state for a 500 tells the user the indicator has no results, which is a lie.
  readonly loadError = signal<string | null>(null);

  /** Contributing results as table rows, in the default order: contribution desc, then code (IRR-R-6). */
  readonly reportedRows = computed<ReportedResultRow[]>(() => {
    const phases = this.phasesSE?.phases?.reporting ?? [];
    return (this.existing() ?? [])
      .map(dto => toReportedResultRow(dto, phases))
      .sort((a, b) => {
        // Rows without a contribution sort last rather than as zero — "not reported" is not "0".
        const av = a.contribution ?? Number.NEGATIVE_INFINITY;
        const bv = b.contribution ?? Number.NEGATIVE_INFINITY;
        if (av !== bv) return bv - av;
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      });
  });

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
      this.loadError.set(null);
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

  /**
   * Load what has already been reported against this indicator.
   *
   * Two things here are load-bearing and were both wrong:
   *
   *  - The id. The server persists `toc_results_indicator_id = indicatorRow.related_node_id` when a
   *    result is created (`framework-result-toc-indicators.service.ts:72,81`) and the loader filters
   *    on that same column. `related_node_id` and `toc_result_indicator_id` are two DIFFERENT
   *    columns of the indicator payload, so querying with the latter matches nothing.
   *  - The shape. The endpoint answers `{ response: { contributors, … } }` — an OBJECT, never an
   *    array (`get-existing-result-contributors.handler.ts:37-45,69-77`). Reading `response`
   *    straight left `length` undefined, so the list rendered as empty in every case.
   */
  private loadExisting(ind: any): void {
    const tocResultId = ind?.toc_result_id ?? this.indicator()?.toc_result_id;
    const indicatorId = ind?.related_node_id ?? this.indicator()?.related_node_id;
    if (!tocResultId || !indicatorId) {
      this.existing.set([]);
      return;
    }
    this.loadingExisting.set(true);
    this.loadError.set(null);
    // @akili-spec changes/indicator-reported-results
    // `'all'` (IRR-R-3): ONE request per indicator open serves both the Report-tab preview and the
    // Reported results table (IRR-R-3.2), so the wider population is asked for here, once.
    this.api.resultsSE.GET_ExistingResultsContributors(tocResultId, indicatorId, 'all').subscribe({
      next: (res: { response?: { contributors?: any[] } }) => {
        const list = res?.response?.contributors ?? [];
        this.existing.set(list);
        this.loadingExisting.set(false);
        // Smart default: if something is already reported here, someone opening the
        // drawer is likely coming to look — land on the Reported results table, not the
        // blank form. Never override a tab the user already picked by hand.
        //
        // DORMANT since the per-indicator reset effect sets `tabTouched = true` before this
        // resolves (the host's `initialTab` is authoritative — IRR-R-1). Retargeted anyway so a
        // future revival can never land on `info`, which no longer holds the list.
        if (list.length && !this.tabTouched) this.tab.set('results');
      },
      error: (err: { status?: number }) => {
        this.existing.set([]);
        this.loadingExisting.set(false);
        // 404 = virgin indicator, the documented contract. Every other status is a real failure.
        if (err?.status !== 404) this.loadError.set('Could not load reported results');
      }
    });
  }
}

/**
 * Responsive default width for the drawer (@akili-spec responsive follow-up, 2026-08-27):
 * - < 768px viewport: full-bleed sheet (the fixed 740px used to overflow phones);
 * - desktop: 740px baseline, scaling with very wide screens up to 1100px so the
 *   panel does not look like a sliver on 4K monitors, and never covering the list
 *   entirely (viewport - 320px guard).
 */
export function initialDrawerWidth(): number {
  if (typeof window === 'undefined') return 740;
  const vw = window.innerWidth;
  if (vw < 768) return vw;
  return Math.min(Math.max(740, Math.round(vw * 0.38)), 1100, Math.max(vw - 320, 340));
}
