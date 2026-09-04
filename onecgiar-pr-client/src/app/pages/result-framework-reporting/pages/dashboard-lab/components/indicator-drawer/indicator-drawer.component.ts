import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
// @akili-spec changes/indicator-reported-results
import {
  PrTableComponent,
  PrTableBodyDirective,
  PrTableEmptyDirective,
  PrTableHeaderDirective,
  PrSortableColumnDirective
} from '../../../../../../shared/components/pr-table';
import { PrToastService } from '../../../../../../shared/components/pr-toast';

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

// @akili-spec changes/indicator-reported-results
/**
 * `status_id` → the `--pr-status-*` fg/bg token PAIRS (IRR-R-2.1).
 *
 * A DELIBERATE local copy of `programme-results.component.ts:127`, which is itself a copy of
 * `result-header.component.ts:17`. Do NOT "DRY it in passing": lifting the map into `shared/`
 * touches three live screens and is its own PR (IRR §12 / the Results-tab folder guide). What must
 * never happen is a fifth colour or a recombined pair — an unknown `status_id` falls back to the
 * *not-started* pair, whole.
 */
const STATUS_TOKENS: Record<string, { fg: string; bg: string }> = {
  1: { fg: 'var(--pr-status-in-progress-fg)', bg: 'var(--pr-status-in-progress-bg)' },
  2: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' },
  3: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }
};

/** Below this many rows the search box is noise, not a tool (IRR-R-6.1). */
const SEARCH_VISIBLE_ABOVE = 8;

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
  imports: [
    DecimalPipe,
    LabReportFormComponent,
    // @akili-spec changes/indicator-reported-results — the Reported results table (IRR-R-2)
    PrTableComponent,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    PrSortableColumnDirective
  ],
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
  // @akili-spec changes/indicator-reported-results — row actions (IRR-R-5).
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly toastSE = inject(PrToastService);

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

  // @akili-spec changes/indicator-reported-results
  // ── Width floor for the Reported results table (IRR-R-8, IRR-R-8.1, IRR-DD-5) ──────────────
  /**
   * The narrowest drawer the seven-column grid is still a TABLE in (§6.3: 84 + 180 + 128 + 118 +
   * 96 + 110 + 36 of tracks, plus the panel's own 24px gutters). A FLOOR, never a set width: a
   * drawer already wider than this is left exactly where the user put it.
   */
  readonly TABLE_FLOOR = 760;

  /**
   * Below this the fixed tracks stop fitting at all and the table would scroll sideways inside the
   * panel, so the same rows render as cards instead (IRR-R-8.1).
   */
  readonly CARD_LAYOUT_BELOW = 640;
  readonly tableLayout = computed(() => this.width() >= this.CARD_LAYOUT_BELOW);

  /**
   * The width the user had before the floor raised it, so leaving the tab gives it back. `null`
   * means there is nothing to give back — either the floor never fired, or the user has since
   * dragged the panel by hand and their width now outranks the remembered one.
   */
  private widthBeforeResults: number | null = null;

  /**
   * The drawer's existing viewport clamp, in ONE place: the drag and the floor must agree, or the
   * floor could set a width the very next drag frame refuses to reproduce (IRR-R-8: "never exceed
   * the existing clamp").
   */
  private widthClamp(): number {
    const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
    return Math.min(1100, Math.max(vw - 320, 340), vw);
  }

  /**
   * Entering the tab: raise a too-narrow drawer to the floor and remember where it was.
   *
   * `current >= floor` returns EARLY and emits nothing — a 900px drawer must not shrink to 760
   * (a floor, not a set), and `widthChange` must not fire for a width that did not change.
   */
  private applyTableFloor(): void {
    const floor = Math.min(this.TABLE_FLOOR, this.widthClamp());
    const current = this.width();
    if (current >= floor) return;
    this.widthBeforeResults = current;
    this.width.set(floor);
    this.widthChange.emit(floor);
  }

  /** Leaving the tab: give the remembered width back, once, and only if it is still owed. */
  private restoreWidthBeforeResults(): void {
    const stored = this.widthBeforeResults;
    this.widthBeforeResults = null;
    if (stored == null || stored === this.width()) return;
    this.width.set(stored);
    this.widthChange.emit(stored);
  }

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
      const maxW = this.widthClamp();
      const next = Math.min(Math.max(window.innerWidth - e.clientX, Math.min(380, window.innerWidth)), maxW);
      // @akili-spec changes/indicator-reported-results
      // IRR-R-8 — the drag keeps working ON the tab, and a width the user set by hand OUTRANKS the
      // one the floor remembered: forget it, so leaving the tab cannot undo the drag they just did.
      if (this.tab() === 'results') this.widthBeforeResults = null;
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

  // Follow-up 2026-09-04 (quick/indicator-reported-results-followups) — the Report-tab preview is
  // a reminder, not a list: three rows and a count, the table is one click away.
  readonly PREVIEW_MAX = 3;
  readonly previewRows = computed<any[]>(() => (this.existing() ?? []).slice(0, this.PREVIEW_MAX));
  readonly previewMore = computed(() => Math.max(0, (this.existing()?.length ?? 0) - this.PREVIEW_MAX));

  /**
   * Where "Back" goes from the results tab. Set only by the Report-tab link, so a drawer opened
   * straight on the table (row menu) shows no back control — there is nowhere to go back to.
   */
  readonly returnTab = signal<DrawerTab | null>(null);

  openResultsFromReport(): void {
    this.returnTab.set('report');
    this.setTab('results');
  }

  backFromResults(): void {
    const target = this.returnTab() ?? 'report';
    this.returnTab.set(null);
    this.setTab(target);
  }
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
      // @akili-spec changes/indicator-reported-results
      // Folder-guide trap: state added here MUST be reset here, or it leaks between indicators —
      // a search typed against indicator A would silently hide indicator B's rows.
      this.searchText.set('');
      this.openMenuKey.set(null);
      this.returnTab.set(null);
      // The remembered width belongs to the indicator that was on screen when the floor fired; a
      // different indicator has no claim on it (IRR-DD-5 / design §6.2 "Reset effect").
      this.widthBeforeResults = null;
      if (ind) this.loadExisting(ind);
    });

    // @akili-spec changes/indicator-reported-results
    // IRR-R-8 / IRR-DD-5 — the floor is a TAB effect, not a new default width.
    //
    // `width()` is read through `untracked` on purpose. If this effect depended on the width it
    // would re-run on every drag frame and shove the panel straight back up to 760 — the "silent,
    // sticky resize" IRR-DD-5 exists to prevent. It reacts to the TAB and to nothing else.
    effect(() => {
      const tab = this.tab();
      untracked(() => (tab === 'results' ? this.applyTableFloor() : this.restoreWidthBeforeResults()));
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

  // ─────────────────────────────────────────────────────────────────────────────
  // @akili-spec changes/indicator-reported-results — Reported results table (IRR-T-3)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Re-issue the request the error block failed on (IRR-R-7). */
  retryLoad(): void {
    const ind = this.indicator();
    if (ind) this.loadExisting(ind);
  }

  // ── Search (IRR-R-6.1) ────────────────────────────────────────────────────
  readonly searchText = signal('');

  /** The box only exists once the list is long enough to need one. */
  readonly showSearch = computed(() => this.reportedRows().length > SEARCH_VISIBLE_ABOVE);

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement)?.value ?? '');
  }

  /** Case-insensitive substring over code OR title — nothing else is searchable text. */
  readonly visibleRows = computed<ReportedResultRow[]>(() => {
    const needle = this.searchText().trim().toLowerCase();
    const rows = this.reportedRows();
    if (!needle) return rows;
    return rows.filter(r => r.code.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle));
  });

  // ── Header strip (IRR-R-4, IRR-R-4.1, IRR-R-11) ───────────────────────────
  /** Σ over the rows. A `null` contribution is NOT zero: it is excluded, not counted (IRR-R-2.4). */
  readonly contributionSum = computed(() => this.reportedRows().reduce((acc, r) => acc + (r.contribution ?? 0), 0));

  readonly targetValue = computed(() => Number(this.indicator()?.target_value_sum ?? 0));

  readonly reportedCountLabel = computed(() => {
    const n = this.reportedRows().length;
    return `${n} result${n === 1 ? '' : 's'} reported`;
  });

  /**
   * IRR-R-4.1 — the disclosure, never silence.
   *
   * This list is `scope=all`, the row's ACHIEVED is the server's reviewed-only roll-up, so the two
   * numbers legitimately differ. Returning `null` when they agree keeps the tooltip off a strip
   * that has nothing to disclose (a permanent tooltip trains people to ignore it).
   */
  stripTitle(): string | null {
    const achieved = Number(this.indicator()?.actual_achieved_value_sum ?? 0);
    const sum = this.contributionSum();
    if (sum === achieved) return null;
    return `Achieved on the row: ${achieved} — it counts reviewed results only; this list sums ${sum} across every status.`;
  }

  /**
   * IRR-R-11 (SHOULD) — the status split, as its OWN line rather than inside the strip.
   *
   * The strip's own string is pinned by IRR-AC-2 (`N results reported · Σ contribution X of target
   * Y`); folding the split into it would have changed a sentence the acceptance criteria quote
   * verbatim. Empty when every row shares one status — a split of one is not a split.
   */
  readonly statusSplit = computed(() => {
    const counts = new Map<string, number>();
    for (const row of this.reportedRows()) counts.set(row.statusName, (counts.get(row.statusName) ?? 0) + 1);
    if (counts.size < 2) return '';
    return [...counts.entries()].map(([name, n]) => `${n} ${name.toLowerCase()}`).join(' · ');
  });

  // ── Status pill (IRR-R-2.1) ───────────────────────────────────────────────
  statusFg(statusId: number | null): string {
    return STATUS_TOKENS[String(statusId)]?.fg ?? 'var(--pr-status-not-started-fg)';
  }

  statusBg(statusId: number | null): string {
    return STATUS_TOKENS[String(statusId)]?.bg ?? 'var(--pr-status-not-started-bg)';
  }

  // ── Sorting (owned by app-pr-table — IRR-R-6) ─────────────────────────────
  /** The direction glyph, exactly as the Results tab renders it. */
  sortArrow(table: PrTableComponent, field: string): string {
    if (!field || table?.activeSortField() !== field) return '';
    return table.activeSortOrder() === 1 ? '↑' : '↓';
  }

  /** `aria-sort` is NOT set here: `prSortableColumn` already host-binds it from the same state. */
  sortColor(table: PrTableComponent, field: string): string {
    return field && table?.activeSortField() === field ? 'var(--pr-color-primary-400)' : 'var(--pr-text-secondary)';
  }

  // ── Row menu (IRR-R-10) ───────────────────────────────────────────────────
  private readonly openMenuKey = signal<string | null>(null);

  /** `id ?? code`: a contributor with no `result_code` would collide with every other one on code. */
  rowKey(row: ReportedResultRow): string {
    return String(row?.id ?? row?.code ?? '');
  }

  isMenuOpen(row: ReportedResultRow): boolean {
    return this.openMenuKey() === this.rowKey(row);
  }

  /** `stopPropagation` is load-bearing: without it the kebab click also opens the result. */
  toggleRowMenu(row: ReportedResultRow, event: Event): void {
    event.stopPropagation();
    const key = this.rowKey(row);
    this.openMenuKey.update(open => (open === key ? null : key));
  }

  closeRowMenu(): void {
    this.openMenuKey.set(null);
  }

  /** Outside click dismisses the menu (hard UI rule 4), same as the Reporting table's. */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openMenuKey() !== null) this.openMenuKey.set(null);
  }

  /**
   * Escape is shared with the drawer's own close. An open menu owns it first — closing the whole
   * panel because a popup was open is the classic "Escape did too much" bug.
   */
  onEscape(): void {
    if (this.openMenuKey() !== null) {
      this.closeRowMenu();
      return;
    }
    this.requestClose();
  }

  // ── A way in (IRR-R-5, IRR-DD-4) ──────────────────────────────────────────
  /**
   * Result Detail with the row's phase — for EVERY row.
   *
   * IRR-DD-4: `programme-results.resultRoute()` diverts a non-AVISA `W3/Bilaterals` result that is
   * not Approved into the bilateral review drawer, on `source_name` / `initiative` fields this
   * payload does not carry. Reproducing the branch here would mean guessing them, so the accepted
   * gap is that a bilateral draft opens Result Detail, where the app's own guards apply.
   */
  resultRoute(row: ReportedResultRow): { commands: any[]; queryParams: Record<string, any> } {
    return {
      commands: ['/result', 'result-detail', row?.code, 'general-information'],
      queryParams: { phase: row?.versionId }
    };
  }

  /** Row click and the menu's "Open result" — one behaviour. */
  openResult(row: ReportedResultRow): void {
    this.closeRowMenu();
    const { commands, queryParams } = this.resultRoute(row);
    this.router.navigate(commands, { queryParams });
  }

  /** IRR-R-12 (MAY) — ctrl/cmd-click opens the same destination in a new tab instead. */
  onRowClick(event: MouseEvent, row: ReportedResultRow): void {
    if (event?.ctrlKey || event?.metaKey) {
      this.openInNewTab(row);
      return;
    }
    this.openResult(row);
  }

  /** IRR-R-12 (MAY) — middle click, the other half of the same habit. */
  onRowAuxClick(event: MouseEvent, row: ReportedResultRow): void {
    if (event?.button !== 1) return;
    event.preventDefault();
    this.openInNewTab(row);
  }

  private openInNewTab(row: ReportedResultRow): void {
    this.closeRowMenu();
    window.open(this.resultLink(row), '_blank', 'noopener');
  }

  /**
   * Space must scroll nothing when the row is the focused control. Typed as `Event` because the
   * `(keydown.enter)` / `(keydown.space)` pseudo-events are declared as `Event` by the template
   * type-checker.
   */
  onRowKeydown(event: Event, row: ReportedResultRow): void {
    event.preventDefault();
    this.openResult(row);
  }

  /** The ABSOLUTE url of the destination `openResult()` opens — built through the router, not concat. */
  resultLink(row: ReportedResultRow): string {
    const { commands, queryParams } = this.resultRoute(row);
    const path = this.router.serializeUrl(this.router.createUrlTree(commands, { queryParams }));
    return `${window.location.origin}${path}`;
  }

  /**
   * Clipboard + toast, then close the menu. The key MUST be `globalUserNotification`: an
   * `<app-pr-toast>` host only renders its own key, and that is the one the app shell mounts
   * unconditionally (`app.component.html:83`). Any other key pushes a toast nobody ever sees.
   */
  copyLink(row: ReportedResultRow): void {
    this.clipboard.copy(this.resultLink(row));
    this.toastSE.add({ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' });
    this.closeRowMenu();
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
