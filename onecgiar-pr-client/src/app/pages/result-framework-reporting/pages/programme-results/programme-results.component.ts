import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideCog, lucideDownload, lucideMoreHorizontal, lucideSearch, lucideX } from '@ng-icons/lucide';

import {
  PrSortableColumnDirective,
  PrTableBodyDirective,
  PrTableComponent,
  PrTableHeaderDirective,
  PrTableLoadingDirective
} from '../../../../shared/components/pr-table';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ChangePhaseModalModule } from '../../../../shared/components/change-phase-modal/change-phase-modal.module';
import {
  BandFilterGroup,
  ReportingProgramBandComponent
} from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import {
  BilateralResultsService,
  REVIEW_RESULT_ID_QUERY_PARAM,
  REVIEW_RESULT_QUERY_PARAM
} from '../bilateral-results/bilateral-results.service';
import { PrToastService } from '../../../../shared/components/pr-toast';
import { ProgrammeResultRow, ProgrammeResultsService } from './services/programme-results.service';
import {
  ProgrammeResultsFilterChip,
  ProgrammeResultsFilterService,
  buildCategoryFilterOptions,
  buildStatusCounts
} from './services/programme-results-filter.service';
import { PROGRAMME_RESULTS_QUERY_PARAM_MAP } from './services/programme-results-query-params';

/**
 * Router commands + query params for one result. Same shape as
 * `results-list.component.ts:20 ResultRoute`.
 */
export interface PgrResultRoute {
  commands: unknown[];
  queryParams: Record<string, unknown>;
}

/**
 * One column of the Results table.
 *
 * `track` / `minPx` are the design's `prGrid` / `prMinWidth` bindings made explicit: both the
 * header row and every data row are ONE css grid built from the SAME visible-column list, which
 * is the only thing that stops them from desynchronising when an optional column toggles
 * (design spec, "OPTIONAL COLUMN TOGGLES").
 */
export interface PgrColumnDef {
  key: string;
  /** Header label, verbatim from the design (rendered uppercase by css). */
  label: string;
  /** `ProgrammeResultRow` key handed to `app-pr-table`'s sort. '' = not sortable. */
  sortField: string;
  /** CSS grid track. */
  track: string;
  /** The track's minimum in px — feeds the shared `min-width`. */
  minPx: number;
  /** True = hidden behind the Columns picker, default OFF (design: all four optional cols off). */
  optional: boolean;
}

/**
 * Column catalog, in design order:
 * select · CODE · RESULT · SECTION · CATEGORY · STATUS · (CREATED BY · CREATED · ORIGIN · CENTER) ·
 * UPDATED, plus the sticky actions track appended by `grid()`.
 */
export const PGR_COLUMNS: readonly PgrColumnDef[] = [
  { key: 'select', label: '', sortField: '', track: '16px', minPx: 16, optional: false },
  { key: 'code', label: 'Code', sortField: 'code', track: '92px', minPx: 92, optional: false },
  { key: 'title', label: 'Result', sortField: 'title', track: 'minmax(240px,2fr)', minPx: 240, optional: false },
  { key: 'section', label: 'Section', sortField: '', track: 'minmax(200px,1.4fr)', minPx: 200, optional: false },
  { key: 'category', label: 'Category', sortField: 'category', track: 'minmax(140px,1fr)', minPx: 140, optional: false },
  { key: 'status', label: 'Status', sortField: 'statusName', track: '120px', minPx: 120, optional: false },
  { key: 'createdBy', label: 'Created by', sortField: 'createdBy', track: 'minmax(140px,1fr)', minPx: 140, optional: true },
  { key: 'created', label: 'Created', sortField: 'created', track: '100px', minPx: 100, optional: true },
  { key: 'origin', label: 'Origin', sortField: 'origin', track: '120px', minPx: 120, optional: true },
  { key: 'center', label: 'Center', sortField: 'center', track: 'minmax(140px,1fr)', minPx: 140, optional: true },
  { key: 'updated', label: 'Updated', sortField: 'updated', track: '100px', minPx: 100, optional: false }
];

/** Sticky-right actions column — always last, never optional, never sortable. */
const PGR_ACTIONS_TRACK = '40px';
const PGR_ACTIONS_MIN_PX = 40;
/** Design: `gap:12px` on the row grid and `padding:0 20px` / `8px 20px` on the row. */
const PGR_GRID_GAP = 12;
const PGR_ROW_PADDING = 40;

export const PGR_COLUMN_STORAGE_KEY = 'pr.programmeResults.visibleColumns';

/**
 * `status_id` → the `--pr-status-*` fg/bg token PAIRS. Copied verbatim from
 * `result-detail/components/result-header/result-header.component.ts:17` so the Results tab paints
 * a status exactly like the result page does. UI-RULES rule 9: never recombine a pair, never
 * invent a sixth colour.
 */
const STATUS_TOKENS: Record<string, { fg: string; bg: string }> = {
  1: { fg: 'var(--pr-status-in-progress-fg)', bg: 'var(--pr-status-in-progress-bg)' },
  2: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' },
  3: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }
};

/** Programme-level Section buckets — same codes as `dashboard-lab.component.ts:164-165`. */
const INTERMEDIATE_OUTCOMES_CODE = 'intermediate-outcomes';
const OUTCOMES_2030_CODE = '2030-outcomes';

/** `dd MMM yyyy`, the format the other three results tables already use. '' stays ''. */
function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Results tab of the programme shell (`/result-framework-reporting/entity-details/:entityId/results`).
 *
 * Built 1:1 from the live Claude Design, `PRMS Reporting.dc.html` → `<sc-if value="{{ showProgResults }}">`
 * (:1333-1540). Six stacked children at 16px: title row, filter row, chip row, counts row, table,
 * empty states — with the programme band above them, exactly like the Overview and Reporting tabs
 * (`dashboard-lab.component.html:1150`).
 *
 * State: `ProgrammeResultsService` (rows + option lists) and `ProgrammeResultsFilterService`
 * (the five filter dimensions) are provided HERE, not in root, so leaving the tab drops them
 * instead of leaking one programme's rows into the next.
 *
 * ⚠️ `html` is 12px, so rem-based Tailwind type/size utilities land 25% short of the mockup —
 * every measurement in the template is an arbitrary px value (client `CLAUDE.md` §5, UI-RULES §1.3).
 */
import { PrTabIntroComponent } from '../../../../shared/components/pr-tab-intro/pr-tab-intro.component';

@Component({
  selector: 'app-programme-results',
  standalone: true,
  templateUrl: './programme-results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NgIcon,
    ReportingProgramBandComponent,
    PrTableComponent,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableLoadingDirective,
    PrSortableColumnDirective,
    PrFilterSelectComponent,
    PrFilterMultiselectModule,
    ChangePhaseModalModule,
    PrTabIntroComponent
  ],
  providers: [
    ProgrammeResultsService,
    ProgrammeResultsFilterService,
    provideIcons({ lucideCheck, lucideChevronDown, lucideCog, lucideDownload, lucideMoreHorizontal, lucideSearch, lucideX })
  ],
  styles: [
    `
      :host {
        display: block;
      }

      /* ── Popover entrance ─────────────────────────────────────────────────────────────────
         The design's '@keyframes prmsPop' (.16s on the Columns popover and the filter panels,
         .12s on the row menu). At-rules are one of the sanctioned SCSS exceptions to
         Tailwind-first (client CLAUDE.md §5). */
      @keyframes prmsPop {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      .pgr-pop {
        animation: prmsPop 0.16s ease-out;
      }

      .pgr-pop--menu {
        animation-duration: 0.12s;
      }

      @media (prefers-reduced-motion: reduce) {
        .pgr-pop {
          animation: none;
        }
      }

      /* ── Filter pills ─────────────────────────────────────────────────────────────────────
         'app-pr-filter-select' / 'app-pr-filter-multiselect' reshaped to the design's 40px /
         8px-radius / 14px trigger. Copied from the toolbar that already does exactly this,
         'reporting-program-band.component.scss' '.pr-band-filter', so the two toolbars cannot
         drift apart. These styles target the shared '.custom_select' shell inside a child
         component — the "projected / 3rd-party DOM" exception, not new page styling. */
      .pgr-filter {
        flex-shrink: 0;
      }

      .pgr-filter ::ng-deep .custom_select {
        width: 100%;
      }

      .pgr-filter ::ng-deep .custom_select .field {
        min-height: 40px;
        height: 40px;
        padding: 0 36px 0 12px;
        border: 1px solid var(--pr-border);
        border-radius: 8px;
        background: var(--pr-surface-card);
        box-shadow: none;
        gap: 8px;
        transition: border-color 150ms ease;
      }

      .pgr-filter ::ng-deep .custom_select .field:hover {
        border-color: var(--pr-border-strong);
      }

      .pgr-filter ::ng-deep .custom_select .field:focus-within {
        border-color: var(--pr-color-primary-200);
        box-shadow: 0 0 0 3px rgba(107, 70, 229, 0.12);
      }

      .pgr-filter ::ng-deep .custom_select .field .text {
        padding-right: 0;
        font-size: 14px;
        font-weight: 400;
        color: var(--pr-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pgr-filter ::ng-deep .custom_select .field .text.select_placeholder {
        color: var(--pr-text-subtle);
      }

      .pgr-filter ::ng-deep .custom_select .field .icon_container {
        display: none !important;
      }

      .pgr-filter ::ng-deep .custom_select .field .icon_dropdown {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2;
        font-size: 12px;
        color: var(--pr-text-muted) !important;
        pointer-events: none;
      }

      .pgr-filter ::ng-deep .custom_select .field .options {
        top: calc(100% + 4px);
        bottom: auto;
        left: 0;
        min-width: 100%;
        width: max-content;
        max-width: 320px;
        max-height: 280px;
        border: 1px solid var(--pr-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(25, 21, 36, 0.1);
        overflow: hidden;
        transform-origin: top center;
      }

      /* The Section panel is taller than the other three (design: 320px vs 280px). */
      .pgr-filter--section ::ng-deep .custom_select .field .options {
        max-height: 320px;
      }

      /* ── Filter chips ─────────────────────────────────────────────────────────────────────
         The global '.pr-chip' / '.pr-chip-remove' (styles.scss:569) carry the app's chip
         contract; the design's chip is 26px / 999px / brand-100. '.pr-chip' is declared OUTSIDE
         every @layer, so a Tailwind utility (which lives in @layer utilities) can never win
         against it — the reshape has to be a real rule, and it belongs here. */
      .pr-chip.pgr-chip {
        height: 26px;
        gap: 6px;
        padding: 0 6px 0 10px;
        border-radius: 999px;
        background: var(--pr-color-primary-100);
        color: var(--pr-color-primary-400);
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
      }

      .pr-chip .pgr-chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 999px;
        background: none;
        color: var(--pr-color-primary-400);
        cursor: pointer;
      }

      .pr-chip .pgr-chip-remove:hover {
        background: var(--pr-color-primary-200);
      }

      /* ── The table ────────────────────────────────────────────────────────────────────────
         'app-pr-table' owns sorting, the empty/loading slots and the horizontal-scroll shell;
         the design's table is a CSS GRID ('grid-template-columns' on the header row and on every
         data row, a sticky-right actions cell, a shared 'min-width'), which a 'table-row' layout
         cannot express — 'minmax(240px,2fr)' has no table equivalent. So the rows are turned into
         grid containers.

         Every selector below is qualified with '.pgr-table' on purpose: pr-table's own skin is
         ':host ::ng-deep .pr-table thead th' (specificity 0,2,2) and it paints a dark navy header
         with white text. Winning by source order would be luck; these are (0,4,2)+, so they win
         deterministically. */
      :host ::ng-deep .pr-table-wrap.pgr-table {
        overflow-x: auto;
        background: var(--pr-surface-card);
        border: 1px solid var(--pr-border);
        border-radius: 12px;
      }

      /* Design '.x-scroll': 8px bar, rounded thumb, transparent track. */
      :host ::ng-deep .pr-table-wrap.pgr-table::-webkit-scrollbar {
        height: 8px;
      }

      :host ::ng-deep .pr-table-wrap.pgr-table::-webkit-scrollbar-track {
        background: transparent;
      }

      :host ::ng-deep .pr-table-wrap.pgr-table::-webkit-scrollbar-thumb {
        background: #cfc9de;
        border-radius: 999px;
      }

      :host ::ng-deep .pr-table-wrap.pgr-table::-webkit-scrollbar-thumb:hover {
        background: var(--pr-text-subtle);
      }

      /* width:100%, never max-content. Under max-content sizing a minmax(240px,2fr) track
         resolves its fr against the widest cell rather than a share of the row, so one long
         title blew the grid to 5678px inside a 1276px shell (Result 2357px, Section 1650px,
         Category 1179px) and pushed every column after Status out of view, while the ellipsis
         never fired. With width:100% the fr tracks share the real row width, titles ellipsize,
         and the row min-width (sum of per-column minimums, see minWidth()) is what turns on the
         shell's horizontal scroll once the columns no longer fit. Same contract results-list
         gets from table-layout:fixed + min-width:1100px + width:100%. */
      :host ::ng-deep .pgr-table .pr-table {
        display: block;
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }

      :host ::ng-deep .pgr-table .pr-table thead,
      :host ::ng-deep .pgr-table .pr-table tbody {
        display: block;
      }

      :host ::ng-deep .pgr-table .pr-table tr.pgr-row {
        display: grid;
        gap: 12px;
        align-items: center;
      }

      :host ::ng-deep .pgr-table .pr-table tr.pgr-head {
        height: 40px;
        padding: 0 20px;
        background: var(--pr-surface-app);
        border-bottom: 1px solid var(--pr-border);
        /* 11px, not 12px: it nests inside the shell's 1px border. */
        border-radius: 11px 11px 0 0;
      }

      :host ::ng-deep .pgr-table .pr-table tr.pgr-data-row {
        /* min-height, not height — the two-line RESULT cell has to be able to grow. */
        min-height: 52px;
        padding: 8px 20px;
        /* Lighter than the header's border, per the design. */
        border-bottom: 1px solid var(--pr-border-divider);
        cursor: pointer;
        background: var(--pr-surface-card);
        transition: background 0.2s ease-out;
      }

      :host ::ng-deep .pgr-table .pr-table tr.pgr-data-row:hover {
        /* No token for the design's row-hover tint yet (between --pr-surface-card and
           --pr-surface-app). Kept literal rather than snapped to a token that would change the
           colour. */
        background: #fafafb;
      }

      :host ::ng-deep .pgr-table .pr-table tr.pgr-data-row:focus-visible {
        outline: 2px solid var(--pr-color-primary-300);
        outline-offset: -2px;
      }

      @media (prefers-reduced-motion: reduce) {
        :host ::ng-deep .pgr-table .pr-table tr.pgr-data-row {
          transition: none;
        }
      }

      /* Strip pr-table's navy header skin and its padded cells. */
      :host ::ng-deep .pgr-table .pr-table thead th.pgr-th {
        min-width: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        background: none;
        text-align: left;
        vertical-align: middle;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        text-transform: uppercase;
        /* .04em here — the sibling table in the mockup uses .08em; this one does not. */
        letter-spacing: 0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      :host ::ng-deep .pgr-table .pr-table thead th.pgr-th--sortable {
        cursor: pointer;
      }

      :host ::ng-deep .pgr-table .pr-table thead th.pgr-th--soon {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: visible;
        cursor: not-allowed;
      }

      :host ::ng-deep .pgr-table .pr-table tbody td.pgr-td {
        min-width: 0;
        padding: 0;
        border: none;
        vertical-align: middle;
        color: inherit;
      }

      /* Sticky right: the header's empty spacer paints the header grey so content scrolls behind
         it; the row's actions cell uses 'background: inherit' so it picks up the row / hover
         colour instead of letting scrolled cells bleed through. */
      :host ::ng-deep .pgr-table .pr-table thead th.pgr-sticky-head {
        position: sticky;
        right: 0;
        z-index: 3;
        align-self: stretch;
        padding: 0;
        border: none;
        background: var(--pr-surface-app);
      }

      :host ::ng-deep .pgr-table .pr-table tbody td.pgr-actions {
        position: sticky;
        right: 0;
        z-index: 3;
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        background: inherit;
      }

      /* Every actions cell is sticky at the SAME z-index, so among equals the DOM order decides and
         the rows BELOW paint their own opaque 'background: inherit' over an open row menu — the
         menu's own 'z-30' cannot help, it only ranks inside its own cell's stacking context. The
         open row has to out-rank its siblings at the CELL level. */
      :host ::ng-deep .pgr-table .pr-table tbody td.pgr-actions.pgr-actions--open {
        z-index: 10;
      }
    `
  ]
})
export class ProgrammeResultsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataControlSE = inject(DataControlService);
  private readonly api = inject(ApiService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly bilateralSE = inject(BilateralResultsService);
  private readonly clipboard = inject(Clipboard);
  private readonly toastSE = inject(PrToastService);

  readonly data = inject(ProgrammeResultsService);
  readonly filter = inject(ProgrammeResultsFilterService);

  /** Full catalog, for the header/cell loops. */
  readonly allColumns = PGR_COLUMNS;
  /** Only the four the Columns picker offers (Created by · Created · Origin · Center). */
  readonly optionalColumns = PGR_COLUMNS.filter(column => column.optional);

  /** Programme official code from the route (`entity-details/:entityId/results`). */
  readonly programmeCode = toSignal(this.route.paramMap.pipe(map(params => params.get('entityId') ?? '')), { initialValue: '' });

  /**
   * The route's query params, as a signal — the read side of the URL ↔ filter bridge
   * (RFD-DD-1..5). `initialValue` mirrors the design's exact wording so the first hydrate run
   * (before the observable has emitted) still sees the real params instead of an empty map.
   */
  readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  // ── Toolbar / popover state ─────────────────────────────────────────────────────────────
  readonly columnsOpen = signal(false);
  /** Which row's kebab menu is open — one at a time (design: `r.menuOpen` is per row). */
  readonly openMenuKey = signal<string | null>(null);
  /** Undebounced mirror of the search box, so typing does not fight the 300ms debounce. */
  readonly searchDraft = signal('');

  private readonly searchInput = new Subject<string>();

  readonly columnVisibility = signal<Record<string, boolean>>({
    ...defaultColumnVisibility(),
    ...readStoredColumnVisibility()
  });

  /** Columns actually rendered, in design order. The actions track is appended by `grid()`. */
  readonly visibleColumns = computed(() => {
    const visible = this.columnVisibility();
    return PGR_COLUMNS.filter(column => !column.optional || visible[column.key] === true);
  });

  /** `grid-template-columns` shared by the header row and every data row. */
  readonly grid = computed(() => [...this.visibleColumns().map(column => column.track), PGR_ACTIONS_TRACK].join(' '));

  /**
   * The `min-width` both rows carry — that shared value is what keeps header and cells aligned
   * while the shell scrolls horizontally. Recomputed from the same list as `grid()`, so a column
   * toggle can never leave one of the three out of step.
   */
  readonly minWidth = computed(() => {
    const columns = this.visibleColumns();
    const tracks = columns.length + 1;
    const content = columns.reduce((total, column) => total + column.minPx, 0) + PGR_ACTIONS_MIN_PX;
    return `${content + PGR_GRID_GAP * (tracks - 1) + PGR_ROW_PADDING}px`;
  });

  // ── Rows ────────────────────────────────────────────────────────────────────────────────
  readonly filteredRows = computed(() => this.filter.filterRows(this.data.rows()));

  /**
   * Status counters over the rows filtered by EVERYTHING EXCEPT status — the only way each pill
   * keeps a meaningful count while one status is selected, which is what makes them clickable
   * (design spec, "CLICKABLE STATUS COUNTS").
   */
  readonly statusCounts = computed(() => buildStatusCounts(this.filter.filterRows(this.data.rows(), { ignoreStatus: true })));

  readonly totalLabel = computed(() => {
    const shown = this.filteredRows().length;
    const noun = shown === 1 ? 'result' : 'results';
    // Partial-response guard from the data service: say so instead of presenting a truncated
    // set as if it were the whole programme.
    if (this.data.isPartial()) return `${shown} of ${this.data.totalReported()} ${noun}`;
    return `${shown} ${noun}`;
  });

  /** The three states are MUTUALLY EXCLUSIVE, unlike the mockup's three independent blocks. */
  readonly hasRows = computed(() => this.filteredRows().length > 0);
  readonly isFilteredEmpty = computed(() => !this.data.loading() && !this.filteredRows().length && this.filter.hasActiveFilters());
  readonly isNothingYet = computed(() => !this.data.loading() && !this.filteredRows().length && !this.filter.hasActiveFilters());
  readonly isFirstLoad = computed(() => this.data.loading() && !this.filteredRows().length);

  // ── Filter options ──────────────────────────────────────────────────────────────────────
  readonly phaseSelectOptions = computed(() => this.data.phaseOptions().map(value => ({ value, label: value })));
  readonly statusSelectOptions = computed(() => this.data.statusOptions().map(value => ({ value, label: value })));
  /**
   * P2-3312 — the RF categories only, plus one `Other` bucket. NOT
   * `categoryOptions().map(...)` like its four neighbours: the flat list mixed the six Results
   * Framework categories with `Other output` / `Other outcome` / `Capacity change` /
   * `Impact contribution`, which is what end users asked us to stop doing. See
   * `buildCategoryFilterOptions` for why the selected value is threaded in.
   */
  readonly categorySelectOptions = computed(() => buildCategoryFilterOptions(this.data.categoryOptions(), this.filter.selectedCategory()));
  readonly originSelectOptions = computed(() => this.data.originOptions().map(value => ({ value, label: value })));
  readonly centerSelectOptions = computed(() => this.data.centerOptions().map(value => ({ value, label: value })));

  /**
   * Section options, grouped "Areas of work" / "Programme-level" exactly like
   * `dashboard-lab.component.ts:1600 reportingSectionOptions()`.
   *
   * P2-3398 — the control ships DISABLED: no endpoint returns a programme's full result set with
   * an AoW/Section field, so every row's `section` is ''. The options stay wired (and the
   * Areas-of-work group fills itself the moment rows carry a section) so enabling it is one flag.
   */
  readonly sectionOptions = computed<BandFilterGroup[]>(() => {
    const codes = [...new Set(this.data.rows().map(row => row.section).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [
      { label: 'Areas of work', items: codes.map(code => ({ value: code, label: code })) },
      {
        label: 'Program-level',
        items: [
          { value: INTERMEDIATE_OUTCOMES_CODE, label: 'Intermediate outcomes' },
          { value: OUTCOMES_2030_CODE, label: '2030 outcomes' }
        ]
      }
    ];
  });

  // ── Programme band ──────────────────────────────────────────────────────────────────────
  private readonly programme = computed(() => {
    const wanted = this.programmeCode().toUpperCase();
    const all = [...this.homeSE.mySPsList(), ...this.homeSE.otherSPsList(), ...this.homeSE.otherProjectsList()];
    return all.find(programme => String(programme?.initiativeCode ?? '').toUpperCase() === wanted) ?? null;
  });

  readonly programmeName = computed(() => this.programme()?.initiativeShortName || this.programme()?.initiativeName || '');

  /** The Reporting tab's path — the "Go to Reporting" button of the nothing-yet empty state. */
  readonly reportingPath = computed(() => `/result-framework-reporting/entity-details/${this.programmeCode()}`);

  /** The design draws a BUTTON here (`onClick={{ tabReporting.go }}`), not a link. */
  goToReporting(): void {
    this.router.navigateByUrl(this.reportingPath());
  }

  get cycleYear(): string | number | null {
    return this.dataControlSE.reportingCurrentPhase?.phaseYear ?? null;
  }

  get cyclePhase(): string {
    return this.dataControlSE.reportingCurrentPhase?.portfolioAcronym ?? '';
  }

  constructor() {
    effect(() => {
      const code = this.programmeCode();
      if (code) this.data.load(code);
      else this.data.reset();
    });

    // Controlled input + 300ms debounce: the signal stays the single source of truth for both the
    // row list and the chip, but every keystroke does not re-filter 476 rows.
    this.searchInput.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(value => this.filter.searchText.set(value));

    // ── URL → filters (RFD-R-1) ─────────────────────────────────────────────────────────────
    // Runs on init and on every param change (Back/Forward, external navigation while on the
    // tab). Writes each signal ONLY when its value actually differs from the param — that
    // equality guard is one half of what stops this from fighting the mirror effect below
    // (RFD-DD-5). Predicates are pure and case-insensitive (`normalize()` in the filter
    // service), so an unknown value is applied as-is and simply matches nothing.
    //
    // The comparison/write happens inside `untracked`: this effect's only dependency must be
    // `this.queryParams()`. Reading the filter signals OUTSIDE `untracked` would make the
    // effect re-run whenever a dropdown sets one of them (e.g. `onCenterChange`) — at which
    // point the still-unchanged (still-null) URL param would win and stomp the value straight
    // back, reopening the exact hydrate ↔ mirror loop the equality guard exists to close.
    effect(() => {
      const params = this.queryParams();

      untracked(() => {
        const phase = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.phase);
        const status = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.status);
        const category = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.category);
        const origin = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.origin);
        const center = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.center);

        if (phase !== this.filter.selectedPhase()) this.filter.selectedPhase.set(phase);
        if (status !== this.filter.selectedStatus()) this.filter.selectedStatus.set(status);
        if (category !== this.filter.selectedCategory()) this.filter.selectedCategory.set(category);
        if (origin !== this.filter.selectedOrigin()) this.filter.selectedOrigin.set(origin);
        if (center !== this.filter.selectedCenter()) this.filter.selectedCenter.set(center);
      });
    });

    // ── Filters → URL (RFD-R-2) ─────────────────────────────────────────────────────────────
    // The second half of the anti-loop guard: read the five filter signals (tracked), then
    // diff them against the route's OWN last-known snapshot inside `untracked` so reading the
    // snapshot never becomes a dependency. Hydrating the same value the URL already carries
    // recomputes an identical `next` and skips `navigate` entirely — that is what breaks the
    // hydrate ↔ mirror cycle, not a `pending*` flag (RFD-DD-5).
    effect(() => {
      const phase = this.filter.selectedPhase();
      const status = this.filter.selectedStatus();
      const category = this.filter.selectedCategory();
      const origin = this.filter.selectedOrigin();
      const center = this.filter.selectedCenter();

      untracked(() => {
        const current = this.route.snapshot.queryParamMap;
        const next: Record<string, string | null> = {
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.phase]: phase,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.status]: status,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.category]: category,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.origin]: origin,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.center]: center
        };
        const changed = Object.entries(next).some(([key, value]) => (current.get(key) ?? null) !== (value ?? null));
        if (!changed) return;

        // `merge` preserves other params; `replaceUrl` keeps a filter
        // tweak from becoming a Back-button trap (RFD-DD-4) — same stance as dashboard-lab's
        // mirror effect (`dashboard-lab.component.ts`).
        this.router.navigate([], { relativeTo: this.route, queryParams: next, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchDraft.set(value);
    this.searchInput.next(value);
  }

  // ── Chips ───────────────────────────────────────────────────────────────────────────────
  clearChip(chip: ProgrammeResultsFilterChip): void {
    if (chip?.dimension === 'search') this.searchDraft.set('');
    this.filter.clearChip(chip);
  }

  clearAll(): void {
    this.searchDraft.set('');
    this.filter.clearAll();
  }

  // ── Single-select filters ───────────────────────────────────────────────────────────────
  /** `app-pr-filter-select`'s empty sentinel is `'all'`; the filter service's is `null`. */
  private toFilterValue(value: unknown): string | null {
    return !value || value === 'all' ? null : String(value);
  }

  selectValue(value: string | null): string {
    return value ?? 'all';
  }

  onPhaseChange(value: unknown): void {
    this.filter.selectedPhase.set(this.toFilterValue(value));
  }

  onStatusChange(value: unknown): void {
    this.filter.selectedStatus.set(this.toFilterValue(value));
  }

  onCategoryChange(value: unknown): void {
    this.filter.selectedCategory.set(this.toFilterValue(value));
  }

  onOriginChange(value: unknown): void {
    this.filter.selectedOrigin.set(this.toFilterValue(value));
  }

  onCenterChange(value: unknown): void {
    this.filter.selectedCenter.set(this.toFilterValue(value));
  }

  // ── Status counters ─────────────────────────────────────────────────────────────────────
  isStatusActive(statusName: string): boolean {
    return this.filter.selectedStatus() === statusName;
  }

  /** Clicking a counter applies that status (and clicking the active one clears it). */
  onStatusCountClick(statusName: string): void {
    this.filter.toggleStatus(statusName);
  }

  statusFg(statusId: number | null): string {
    return STATUS_TOKENS[String(statusId)]?.fg ?? 'var(--pr-status-not-started-fg)';
  }

  statusBg(statusId: number | null): string {
    return STATUS_TOKENS[String(statusId)]?.bg ?? 'var(--pr-status-not-started-bg)';
  }

  // ── Columns picker ──────────────────────────────────────────────────────────────────────
  // NOTE (duplication, deliberate): the same picker exists inline in
  // `results-list.component.ts:47-140` and again in `bilateral-results-list.component.ts`. It is
  // NOT extracted to a shared component, and extracting it here would mean editing two live
  // screens — out of scope. Follow-up: lift all three into
  // `shared/components/pr-columns-picker/` in its own PR.
  isColumnVisible(key: string): boolean {
    return this.columnVisibility()[key] === true;
  }

  toggleColumn(key: string, event?: Event): void {
    event?.stopPropagation();
    const next = { ...this.columnVisibility(), [key]: !this.isColumnVisible(key) };
    this.columnVisibility.set(next);
    try {
      localStorage.setItem(PGR_COLUMN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode — the toggle still works for this session.
    }
  }

  toggleColumnsPanel(event?: Event): void {
    event?.stopPropagation();
    this.openMenuKey.set(null);
    this.columnsOpen.update(open => !open);
  }

  // ── Sorting (owned by app-pr-table) ─────────────────────────────────────────────────────
  /** The design renders the direction as a glyph after a literal space, not as an icon slot. */
  sortArrow(table: PrTableComponent, field: string): string {
    if (!field || table?.activeSortField() !== field) return '';
    return table.activeSortOrder() === 1 ? '↑' : '↓';
  }

  /** `aria-sort` is NOT set here: `prSortableColumn` already host-binds it from the same state. */
  sortColor(table: PrTableComponent, field: string): string {
    return field && table?.activeSortField() === field ? 'var(--pr-color-primary-400)' : 'var(--pr-text-secondary)';
  }

  // ── Row menu ────────────────────────────────────────────────────────────────────────────
  rowKey(row: ProgrammeResultRow): string {
    return `${row?.code ?? ''}|${row?.versionId ?? ''}`;
  }

  isMenuOpen(row: ProgrammeResultRow): boolean {
    return this.openMenuKey() === this.rowKey(row);
  }

  toggleRowMenu(row: ProgrammeResultRow, event: Event): void {
    event.stopPropagation();
    this.columnsOpen.set(false);
    const key = this.rowKey(row);
    this.openMenuKey.update(open => (open === key ? null : key));
  }

  closeRowMenu(): void {
    this.openMenuKey.set(null);
  }

  // ── Update result (P2-3508) ─────────────────────────────────────────────────────────────
  /**
   * Mounts the phase-replication modal only once someone asks for it.
   *
   * `ChangePhaseModalComponent.ngOnInit` fires `getCurrentPhases()` and
   * `GET_phaseReportingInitiatives()`, so mounting it unconditionally would cost two requests on
   * every visit to a tab where most rows cannot be updated at all. Once mounted it stays: the
   * modal owns its own visibility through `chagePhaseModal`, and tearing it down mid-close would
   * cut its own flag handling.
   */
  readonly changePhaseModalMounted = signal(false);

  /**
   * Whether this row may be carried into the current phase.
   *
   * The rule is NOT re-derived here: it is the same branch `results-list.component.ts:483`
   * (`onPressAction`) runs. A W3/Bilateral row that is not AVISA goes through
   * `canUpdateBilateral` (lead centre + Approved + past phase); everything else, including
   * AVISA, goes through `shouldShowUpdate` (initiative membership + past phase). Forking these
   * would let this screen offer an update the old list refuses, or refuse one it offers.
   *
   * This is UX only. `versionProcessV2` enforces the same rules server-side — a hidden menu
   * item was never authorisation.
   */
  canUpdateResult(row: ProgrammeResultRow): boolean {
    const result = row?.raw as any;
    if (!result) return false;

    const phase = this.dataControlSE.reportingCurrentPhase;
    return this.usesBilateralReviewFlow(row)
      ? this.api.canUpdateBilateral(result, phase)
      : this.api.shouldShowUpdate(result, phase);
  }

  /**
   * Opens the phase-replication modal for this row.
   *
   * `ChangePhaseModalComponent` reads the result off `DataControlService.currentResult` rather
   * than through an input, so the contract is: set it (and `resultsSE.currentResultId`, which
   * the modal's siblings rely on) BEFORE flipping the flag — exactly what
   * `results-list.component.ts:483` does. `chagePhaseModal` keeps its historical misspelling.
   */
  updateResult(row: ProgrammeResultRow): void {
    this.closeRowMenu();

    const result = row?.raw as any;
    if (!result) return;

    this.api.resultsSE.currentResultId = result.id;
    this.dataControlSE.currentResult = result;
    this.changePhaseModalMounted.set(true);
    this.dataControlSE.chagePhaseModal = true;
  }

  // ── Row activation ──────────────────────────────────────────────────────────────────────
  /**
   * AVISA (`SGP-02`) reports bilaterals through the normal Result Detail, not the review drawer.
   * Same guard as `results-list.component.ts:358`.
   */
  private isW3BilateralsAvisa(row: ProgrammeResultRow): boolean {
    if (row?.origin !== 'W3/Bilaterals') return false;
    return row?.submitterCode === 'SGP-02' || row?.submitterCode === 'SGP02';
  }

  /** True when the result opens in the bilateral review drawer instead of Result Detail. */
  usesBilateralReviewFlow(row: ProgrammeResultRow): boolean {
    if (this.isW3BilateralsAvisa(row) || row?.statusName === 'Approved') return false;
    return row?.origin === 'W3/Bilaterals';
  }

  /**
   * Destination for one result. Same branching as `results-list.component.ts:634 getResultRoute()`
   * — a W3/Bilaterals result that is neither AVISA nor Approved deep-links into the programme's
   * `results-review` drawer; everything else opens Result Detail with its `?phase=`.
   */
  resultRoute(row: ProgrammeResultRow): PgrResultRoute {
    if (this.usesBilateralReviewFlow(row)) {
      return {
        commands: ['/result-framework-reporting', 'entity-details', row?.submitterCode || this.programmeCode(), 'results-review'],
        queryParams: { [REVIEW_RESULT_QUERY_PARAM]: row?.code, [REVIEW_RESULT_ID_QUERY_PARAM]: row?.id }
      };
    }
    return {
      commands: ['/result', 'result-detail', row?.code, 'general-information'],
      queryParams: { phase: row?.versionId }
    };
  }

  /** Row click and the menu's "Open result" — one behaviour, per the design. */
  openResult(row: ProgrammeResultRow): void {
    this.closeRowMenu();
    const { commands, queryParams } = this.resultRoute(row);

    if (this.usesBilateralReviewFlow(row)) {
      this.bilateralSE.currentResultToReview.set(row);
      this.router.navigate(commands, { queryParams }).then(() => this.bilateralSE.showReviewDrawer.set(true));
      return;
    }

    this.router.navigate(commands, { queryParams });
  }

  /**
   * Space must scroll nothing when the row is the focused control. Typed as `Event` because the
   * `(keydown.enter)` / `(keydown.space)` pseudo-events are declared as `Event` by the template
   * type-checker.
   */
  onRowKeydown(event: Event, row: ProgrammeResultRow): void {
    event.preventDefault();
    this.openResult(row);
  }

  /**
   * "Download PDF" — the anchor the app already uses in two places
   * (`results-list.component.ts:425 pdfHref()`, `aow-view-results-drawer.component.html:76`).
   */
  pdfHref(row: ProgrammeResultRow): string {
    return `/reports/result-details/${row?.code}?phase=${row?.versionId}`;
  }

  /**
   * "Copy link" — the ABSOLUTE url of the destination `openResult()` navigates to, so what the
   * recipient opens is exactly what the menu's first item opens: Result Detail with its `?phase=`,
   * or the programme's review drawer deep-link for a bilateral still in review.
   *
   * Decided by Yeck on 2026-08-24, closing the product question P2-3396 left open: the sibling
   * "Download PDF" already hands out the report url, so copying that one here would duplicate it
   * and never give anyone the result page itself. Built through the router (not string concat like
   * `pdfHref`) because the review branch carries two query params that must be encoded.
   */
  resultLink(row: ProgrammeResultRow): string {
    const { commands, queryParams } = this.resultRoute(row);
    const path = this.router.serializeUrl(this.router.createUrlTree(commands, { queryParams }));
    return `${window.location.origin}${path}`;
  }

  /**
   * Clipboard + toast, then close the menu. The toast is keyed `globalUserNotification` because
   * that is the ONLY `<app-pr-toast>` host mounted unconditionally by the app shell
   * (`app.component.html:83`) — a host filters by key, so any other key would push a toast this
   * page can never render.
   */
  copyLink(row: ProgrammeResultRow): void {
    this.clipboard.copy(this.resultLink(row));
    this.toastSE.add({ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' });
    this.closeRowMenu();
  }

  // ── Cells ───────────────────────────────────────────────────────────────────────────────
  /** One place that turns a row + column into text — used by the cells AND by the CSV export. */
  cellText(row: ProgrammeResultRow, key: string): string {
    switch (key) {
      case 'code':
        return row?.code ?? '';
      case 'title':
        return row?.title ?? '';
      // Always '' in v1 — no endpoint exposes the AoW for a programme's full result set.
      case 'section':
        return row?.section ?? '';
      case 'category':
        return row?.category ?? '';
      case 'status':
        return row?.statusName ?? '';
      case 'phase':
        return row?.phaseName || (row?.phaseYear ? `Phase ${row.phaseYear}` : '');
      case 'createdBy':
        return row?.createdBy ?? '';
      case 'created':
        return formatDate(row?.created ?? '');
      case 'origin':
        return row?.origin ?? '';
      case 'center':
        return row?.center ?? '';
      // Blank-tolerant on purpose: the list payload carries no last-updated timestamp yet.
      case 'updated':
        return formatDate(row?.updated ?? '');
      default:
        return '';
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────────────────
  /**
   * Immediate client-side CSV of the filtered rows and the currently visible columns.
   *
   * Same implementation as `bilateral-results-list.component.ts:299 exportCsv()` — reused rather
   * than reinvented. NOT `ExportTablesService`: that service only writes `.xlsx` through exceljs
   * (`exportExcel()` → `saveAsExcelFile()`), so wiring the design's "Export CSV" button to it
   * would hand the user a spreadsheet under a CSV label.
   */
  exportCsv(): void {
    const columns = this.visibleColumns().filter(column => column.key !== 'select');
    const rows = this.filteredRows();
    if (!rows.length) return;

    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = columns.map(column => escape(column.label)).join(',');
    const lines = rows.map(row => columns.map(column => escape(this.cellText(row, column.key))).join(','));
    const csv = [header, ...lines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.programmeCode() || 'program'}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Dismissal ───────────────────────────────────────────────────────────────────────────
  /** Outside click closes the Columns popover and any open row menu (the mockup draws neither). */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.columnsOpen()) this.columnsOpen.set(false);
    if (this.openMenuKey()) this.openMenuKey.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onDocumentClick();
  }
}

function defaultColumnVisibility(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  // Design: all four optional columns default OFF.
  for (const column of PGR_COLUMNS) map[column.key] = !column.optional;
  return map;
}

function readStoredColumnVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PGR_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
