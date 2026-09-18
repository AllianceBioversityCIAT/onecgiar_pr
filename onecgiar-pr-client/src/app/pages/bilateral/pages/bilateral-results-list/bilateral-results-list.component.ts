import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, take, map, distinctUntilChanged, forkJoin, switchMap } from 'rxjs';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { FormsModule } from '@angular/forms';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { Clipboard } from '@angular/cdk/clipboard';
import { PrToastService } from '../../../../shared/components/pr-toast';
import { ResultDeletionService } from '../../../result-framework-reporting/services/result-deletion.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ChangePhaseModalModule } from '../../../../shared/components/change-phase-modal/change-phase-modal.module';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective,
  PrTableLoadingDirective,
} from '../../../../shared/components/pr-table';
import { SpTabEmptyStateComponent } from '../../../result-framework-reporting/pages/dashboard-lab/components/sp-tab-empty-state/sp-tab-empty-state.component';
// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-DD-11) — `BilateralCenterResult` moved
// to a shared interface file so both the Results tab and the Overview's pure modules can import
// the row shape without page-to-page coupling; re-exported below for existing imports.
import type { BilateralCenterResult } from '../../services/bilateral-center-result.interface';
// @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-13, COV-R-14, COV-DD-3) — the shared
// query-param contract and filter predicate. The Results tab is now a reader/writer of this
// contract; `applyResultsTabDefaults` is what protects the byte-identical no-param default (W3 +
// Lead) this list shipped before this spec.
import {
  applyResultsTabDefaults,
  BilateralMethod,
  BilateralQueryParams,
  BilateralRole,
  BilateralSource,
  BILATERAL_METHOD_QUERY_PARAM,
  BILATERAL_PHASE_QUERY_PARAM,
  BILATERAL_PROGRAM_QUERY_PARAM,
  BILATERAL_PROJECT_QUERY_PARAM,
  BILATERAL_ROLE_QUERY_PARAM,
  BILATERAL_SEARCH_QUERY_PARAM,
  BILATERAL_CREATED_BY_QUERY_PARAM,
  BILATERAL_SOURCE_QUERY_PARAM,
  BILATERAL_STATUS_QUERY_PARAM,
  BILATERAL_TYPE_QUERY_PARAM,
  parseBilateralQueryParams,
  serializeBilateralQueryParams,
  StatusKey,
} from '../../bilateral-query-params';
import { filterCenterResults } from '../../bilateral-result-filter';

export type { BilateralCenterResult };

/** `COV-R-14` — the Results tab excludes `phase` (shell context) AND `multi` (Reporting-only) from
 *  the "does the URL carry any contract param" test, so a plain `?phase=` tab-link click or a
 *  stray `?multi=1` left over from a Reporting deep link still gets the W3 + Lead default. */
const RESULTS_TAB_IGNORE_KEYS = ['phase', 'multi'] as const;

/** `COV-R-14` — the nine contract keys the Results tab reads AND writes (everything except
 *  `multi`, which is Reporting-only, and `?result=`, which is untouched notification focus). */
const RESULTS_TAB_MANAGED_QUERY_PARAMS = [
  BILATERAL_PHASE_QUERY_PARAM,
  BILATERAL_STATUS_QUERY_PARAM,
  BILATERAL_PROJECT_QUERY_PARAM,
  BILATERAL_PROGRAM_QUERY_PARAM,
  BILATERAL_TYPE_QUERY_PARAM,
  BILATERAL_ROLE_QUERY_PARAM,
  BILATERAL_SOURCE_QUERY_PARAM,
  BILATERAL_METHOD_QUERY_PARAM,
  BILATERAL_SEARCH_QUERY_PARAM,
  BILATERAL_CREATED_BY_QUERY_PARAM,
] as const;

/** `status_id` key → display label for the new **Status** chip group (`COV-R-14`). */
type BilateralFilterChipDimension = 'phase' | 'source' | 'role' | 'status' | 'project' | 'createdBy' | 'search';

interface BilateralFilterChip {
  dimension: BilateralFilterChipDimension;
  value: string;
  label: string;
}

const STATUS_KEY_LABELS: Record<StatusKey, string> = {
  editing: 'Editing',
  qa: 'In QA',
  submitted: 'Submitted',
  discontinued: 'Discontinued',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** Column catalog for the "Columns" picker — mirrors the Results Center pattern (RC_COLUMNS). */
export interface BilateralColumnDef {
  key: string;
  title: string;
  attr: string;
  width: string;
  /** Minimum width (px) when the user resizes a column. */
  minPx: number;
  /** Default visibility when no localStorage preference exists. */
  defaultOn: boolean;
}

// Versioned so older preferences cannot leave a newly required column hidden.
// v4 — Created by column added to the centre dashboard list.
const BILATERAL_COLUMN_STORAGE_KEY = 'pr.bilateralResults.visibleColumns.v4';
export const BILATERAL_COLUMN_WIDTHS_STORAGE_KEY = 'pr.bilateralResults.columnWidths.v1';

/** Full column set (order = picker + table order). Kept to the fields BilateralCenterResult actually has. */
export const BILATERAL_COLUMNS: readonly BilateralColumnDef[] = [
  { key: 'code', title: 'Code', attr: 'result_code', width: '100px', minPx: 80, defaultOn: true },
  { key: 'source', title: 'Source', attr: 'source', width: '100px', minPx: 80, defaultOn: true },
  { key: 'title', title: 'Title', attr: 'title', width: '280px', minPx: 160, defaultOn: true },
  // P2-3152 AC6 — Project name and Description are required on the centre dashboard.
  { key: 'project', title: 'Project name', attr: 'project_name', width: '200px', minPx: 120, defaultOn: true },
  { key: 'description', title: 'Description', attr: 'description', width: '260px', minPx: 140, defaultOn: true },
  { key: 'type', title: 'Result type', attr: 'result_type', width: '180px', minPx: 120, defaultOn: true },
  { key: 'role', title: 'Role', attr: 'is_leading_result', width: '120px', minPx: 100, defaultOn: true },
  { key: 'status', title: 'Status', attr: 'status_id', width: '120px', minPx: 100, defaultOn: true },
  { key: 'createdBy', title: 'Created by', attr: 'created_by_name', width: '160px', minPx: 120, defaultOn: true },
  { key: 'created', title: 'Created', attr: 'created_date', width: '110px', minPx: 90, defaultOn: true },
];

export function readStoredBilateralColumnWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BILATERAL_COLUMN_WIDTHS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeStoredBilateralColumnWidths(widths: Record<string, number>): void {
  try {
    localStorage.setItem(BILATERAL_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // private mode — widths still work for the session
  }
}

function readStoredColumnVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(BILATERAL_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function defaultColumnVisibility(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const col of BILATERAL_COLUMNS) map[col.key] = col.defaultOn;
  return map;
}

/**
 * `COV-R-2` C / `COV-R-5` A — `GET /api/versioning` delivers `Phases.id` as a **string** (`'34'`)
 * although `Phases` types it `number`. `ctx.selectedVersionId` is numeric by contract (it carries
 * the parsed `?phase=`), so a strict `p.id === versionId` never matched a real phase and the shared
 * phase silently degraded to Open. Normalize wherever a phase id is compared or handed on.
 */
function phaseVersionId(phase: Phases): number {
  return Number(phase.id);
}

function parsePhaseIdsFromUrl(raw: string | null): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map(token => {
      const n = Number(token.trim());
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((n): n is number => n !== null);
  return [...new Set(ids)];
}

/**
 * `PMF-R-1` — the row may carry `project_id` as a number OR a numeric string (the APIs deliver ids
 * as strings, the same trap `phaseVersionId` normalizes); anything null, non-numeric or not a
 * positive integer is not a project option and is ignored.
 */
function normalizeProjectId(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** `PMF-R-1` — one selectable Project option, built from the center's own catalog for a phase year. */
interface ProjectFilterOption {
  value: number;
  label: string;
}

/**
 * `PMF-R-1` (pivot) — the catalog's option label: trimmed `shortName` and `fullName` joined with
 * a space, the table column's `A-AG10156 Accelerating Impacts…` format; an entry with no usable
 * name falls back to `Project <id>`.
 */
function catalogProjectLabel(project: { shortName?: unknown; fullName?: unknown }, id: number): string {
  const shortName = typeof project.shortName === 'string' ? project.shortName.trim() : '';
  const fullName = typeof project.fullName === 'string' ? project.fullName.trim() : '';
  return `${shortName} ${fullName}`.trim() || `Project ${id}`;
}

@Component({
  selector: 'app-bilateral-results-list',
  standalone: true,
  imports: [
    DatePipe,
    OverlayModule,
    FormsModule,
    PrFilterMultiselectModule,
    BilateralPageHeaderComponent,
    PrDialogComponent,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    PrTableLoadingDirective,
    ChangePhaseModalModule,
    SpTabEmptyStateComponent,
  ],
  templateUrl: './bilateral-results-list.component.html',
  styleUrl: './bilateral-results-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pr-viewport-page',
  },
})
export class BilateralResultsListComponent implements OnInit, OnDestroy {
  private readonly bilateralApiService = inject(BilateralApiService);
  private readonly phasesService = inject(PhasesService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolesService = inject(RolesService);
  private readonly resultsApiService = inject(ResultsApiService);
  readonly api = inject(ApiService);
  readonly ctx = inject(BilateralContextService);
  private readonly clipboard = inject(Clipboard);
  private readonly toastSE = inject(PrToastService);
  private readonly deletionSE = inject(ResultDeletionService);

  readonly phases = signal<Phases[]>([]);
  /** Reporting phases included in the current Results view — at least one must stay selected. */
  readonly selectedPhaseIds = signal<number[]>([]);
  readonly results = signal<BilateralCenterResult[]>([]);
  readonly loading = signal(false);
  readonly initializing = signal(true);
  readonly error = signal(false);
  readonly searchQuery = signal('');

  // Filter chips
  readonly showW3 = signal(true);
  readonly showW1W2 = signal(false);
  readonly showLead = signal(true);
  readonly showContributing = signal(false);

  // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-14) — additional contract-driven
  // filters with no chip pair of their own; hydrated from the URL, filtered through the shared
  // `filterCenterResults` predicate, and round-tripped back to the URL like every other chip.
  readonly statusFilter = signal<StatusKey[]>([]);
  readonly projectFilter = signal<number[]>([]);
  readonly programFilter = signal<string[]>([]);
  readonly typeFilter = signal<number[]>([]);
  readonly methodFilter = signal<BilateralMethod | null>(null);
  readonly createdByFilter = signal<string[]>([]);

  /** Default phase selection — the Open reporting phase, else the first loaded phase. */
  readonly defaultPhaseIds = computed(() => {
    const phases = this.phases();
    if (!phases.length) return [];
    const open = phases.find(p => p.status) ?? phases[0];
    return open ? [phaseVersionId(open)] : [];
  });

  readonly selectedPhases = computed(() => {
    const ids = new Set(this.selectedPhaseIds());
    return this.phases().filter(phase => ids.has(phaseVersionId(phase)));
  });

  /**
   * `PMF-R-1` (pivot) — the reporting years of the selected phases: the phase scope the center
   * project catalog is fetched for. A year outside the selection can never produce an option.
   */
  readonly selectedPhaseYears = computed(() => {
    const years = new Set<number>();
    for (const phase of this.selectedPhases()) {
      const year = Number(phase.phase_year);
      if (Number.isSafeInteger(year) && year > 0) years.add(year);
    }
    return [...years].sort((a, b) => a - b);
  });

  // ── Project catalog (`PMF-R-1` pivot / `PMF-DD-1`) ─────────────────────────────────
  /** Page-lifetime catalog cache keyed by phase year — one entry per year that loaded. */
  private readonly projectCatalogByYear = signal<ReadonlyMap<number, ProjectFilterOption[]>>(new Map());
  /** Years already requested this page lifetime, succeeded OR failed — a failed year is never
   *  retried, so a failing catalog cannot loop requests (`PMF-NFR-1`). */
  private readonly projectCatalogYearsRequested = new Set<number>();
  /** The center the cached years belong to — switching centers resets the cache so two
   *  centers' catalogs can never mix into one option list (foreign-center exclusion). */
  private projectCatalogCenter: string | null = null;

  /**
   * `COV-DD-2`: the primary phase shared by the other center tabs lives on `BilateralContextService`
   * (`null` = Open). On this tab it tracks the preferred id among `selectedPhaseIds` (Open when
   * selected, otherwise the first selected id).
   */
  readonly selectedPhase = computed<Phases | null>(() => {
    const versionId = this.ctx.selectedVersionId();
    if (versionId !== null) {
      const match = this.phases().find(p => phaseVersionId(p) === versionId);
      if (match) return match;
    }
    return this.selectedPhases()[0] ?? null;
  });

  // Row menu
  readonly openMenuKey = signal<string | null>(null);

  readonly rowMenuPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 4 },
    { originX: 'end', overlayX: 'end', originY: 'top', overlayY: 'bottom', offsetY: -4 },
  ];

  /**
   * P2-3157 AC3 — result code deep-linked from an approval/rejection notification (`?result=`).
   * The matching row is highlighted and scrolled into view.
   */
  readonly focusedResultCode = signal<string | null>(null);

  /** P2-3157 AC4 — rejection justification dialog. */
  readonly justificationVisible = signal(false);
  readonly justificationLoading = signal(false);
  readonly justificationError = signal(false);
  readonly justificationResultCode = signal<string>('');
  readonly justificationEntries = signal<ReviewHistoryEntry[]>([]);

  /** Full catalog for the Columns picker. */
  readonly allColumns = BILATERAL_COLUMNS;

  /** Visibility map keyed by BILATERAL_COLUMNS.key — persisted. */
  readonly columnVisibility = signal<Record<string, boolean>>({
    ...defaultColumnVisibility(),
    ...readStoredColumnVisibility(),
  });

  /** User-resized column widths (px), keyed by BILATERAL_COLUMNS.key — persisted. */
  readonly customWidths = signal<Record<string, number>>(readStoredBilateralColumnWidths());
  readonly isResizing = signal(false);

  readonly columnsOpen = signal(false);
  readonly filterPopoverOpen = signal(false);

  /** Table columns currently visible (order preserved, filtered). */
  readonly visibleColumns = computed(() => {
    const vis = this.columnVisibility();
    return BILATERAL_COLUMNS.filter(c => vis[c.key] !== false);
  });

  /** True when the user can manage (edit/delete) W3 bilateral results for this center. */
  readonly canManageW3 = computed(() => {
    if (this.rolesService.isAdmin) return true;
    const centerId = this.ctx.centerId();
    const acronym = this.ctx.centerAcronym();
    return this.rolesService.getMyCenters().some(
      (c: any) =>
        (centerId && c.center_id === centerId) ||
        (acronym && c.center_acronym === acronym),
    );
  });

  @ViewChild('table') table?: PrTableComponent;

  /**
   * `COV-R-13`/`COV-DD-3` — the chip pair (`showW3`/`showW1W2`, `showLead`/`showContributing`)
   * stays the immediate local state (behaviour-preserving), but is re-expressed as `role`/`source`
   * so the actual filtering runs through the ONE predicate every center tab shares
   * (`filterCenterResults`). Both chips on (or, for role, neither toggle applicable) → `null`
   * ("both" — matches the contract's own null semantics); exactly one on → that literal value.
   */
  private readonly currentContractParams = computed<BilateralQueryParams>(() => {
    const showW3 = this.showW3();
    const showW1W2 = this.showW1W2();
    const showLead = this.showLead();
    const showContributing = this.showContributing();

    let source: BilateralSource | null = null;
    if (showW3 && !showW1W2) source = 'w3';
    else if (showW1W2 && !showW3) source = 'w1w2';

    let role: BilateralRole | null = null;
    if (showLead && !showContributing) role = 'lead';
    else if (showContributing && !showLead) role = 'contributing';

    return {
      phase: this.ctx.selectedVersionId(),
      status: this.statusFilter(),
      project: this.projectFilter(),
      program: this.programFilter(),
      type: this.typeFilter(),
      role,
      source,
      method: this.methodFilter(),
      search: this.searchQuery(),
      createdBy: this.createdByFilter(),
      multi: false,
    };
  });

  /** Distinct creator display names from loaded rows — powers the Created by multiselect. */
  readonly createdByOptions = computed(() => {
    const names = new Set<string>();
    for (const row of this.results()) {
      const name = row.created_by_name?.trim();
      if (name) names.add(name);
    }
    return [...names]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(value => ({ value, label: value }));
  });

  /** Keeps URL-selected creators tickable even when no loaded row currently carries them. */
  readonly createdBySelectOptions = computed(() => {
    const options = this.createdByOptions();
    const selected = this.createdByFilter();
    const missing = selected.filter(value => !options.some(option => option.value === value));
    return missing.length
      ? [...options, ...missing.map(value => ({ value, label: value }))]
      : options;
  });

  /** `PMF-R-1`/`PMF-DD-1` (pivot) — the union of the center's OWN catalog projects for the
   *  selected phase years, deduplicated by project id across phases — never the loaded rows:
   *  rows where the centre only contributes display other Centers' projects, and catalog
   *  projects with zero loaded rows would never become options at all. Labels come from the
   *  catalog (`shortName fullName`, `Project <id>` fallback) and sort case-insensitively. */
  readonly projectOptions = computed(() => {
    const byId = new Map<number, ProjectFilterOption>();
    const cache = this.projectCatalogByYear();
    for (const year of this.selectedPhaseYears()) {
      for (const option of cache.get(year) ?? []) {
        if (!byId.has(option.value)) byId.set(option.value, option);
      }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  });

  /** `PMF-R-2`/`PMF-DD-3` — appends URL-selected ids the catalog union does not carry, so a
   *  deep-linked project stays ticked, labelled `Project <id>`, and removable instead of
   *  silently discarded. */
  readonly projectSelectOptions = computed(() => {
    const options = this.projectOptions();
    const known = new Set(options.map(option => option.value));
    const missing = this.projectFilter()
      .filter(id => !known.has(id))
      .map(id => ({ value: id, label: `Project ${id}` }));
    return missing.length ? [...options, ...missing] : options;
  });

  readonly filteredResults = computed(() => filterCenterResults(this.results(), this.currentContractParams()));

  readonly totalCount = computed(() => this.filteredResults().length);
  readonly totalLoaded = computed(() => this.results().length);

  readonly hasRows = computed(() => this.filteredResults().length > 0);
  readonly isFilteredEmpty = computed(
    () => !this.initializing() && !this.loading() && !this.error() && this.results().length > 0 && !this.filteredResults().length
  );
  readonly isNothingYet = computed(
    () => !this.initializing() && !this.loading() && !this.error() && this.results().length === 0
  );
  readonly isFirstLoad = computed(() => this.initializing() || (this.loading() && !this.hasRows()));

  /** `COV-R-14` — one removable chip per active status key, only when `status` is present. */
  readonly statusChips = computed(() =>
    this.statusFilter().map(key => ({ key, label: STATUS_KEY_LABELS[key] ?? key })),
  );

  /** `COV-R-14` — a chip per active project id, label from a loaded row's `project_name`, else
   *  `Project <id>`, only when `project` is present. */
  readonly projectChips = computed(() => {
    const rows = this.results();
    return this.projectFilter().map(id => {
      const match = rows.find(r => r.project_id != null && Number(r.project_id) === id);
      return { id, label: match?.project_name || `Project ${id}` };
    });
  });

  readonly hasNonDefaultPhaseFilter = computed(() => {
    const selected = [...this.selectedPhaseIds()].sort((a, b) => a - b);
    const defaults = [...this.defaultPhaseIds()].sort((a, b) => a - b);
    return selected.join(',') !== defaults.join(',');
  });

  /** One labelled chip per active filter value — Programme Results toolbar parity (`Phase: …`). */
  readonly activeChips = computed<BilateralFilterChip[]>(() => {
    const chips: BilateralFilterChip[] = [];
    const showW3 = this.showW3();
    const showW1W2 = this.showW1W2();
    const showLead = this.showLead();
    const showContributing = this.showContributing();

    for (const phase of this.selectedPhases()) {
      chips.push({
        dimension: 'phase',
        value: String(phaseVersionId(phase)),
        label: `Phase: ${this.phaseFilterLabel(phase)}`,
      });
    }

    if (showW3 && showW1W2) {
      chips.push(
        { dimension: 'source', value: 'w3', label: 'Source: W3 Bilateral' },
        { dimension: 'source', value: 'w1w2', label: 'Source: W1/W2' },
      );
    } else if (showW1W2 && !showW3) {
      chips.push({ dimension: 'source', value: 'w1w2', label: 'Source: W1/W2' });
    }

    if (showLead && showContributing) {
      chips.push(
        { dimension: 'role', value: 'lead', label: `Center role: Lead · ${this.ctx.centerAcronym()}` },
        { dimension: 'role', value: 'contributing', label: 'Center role: Contributing' },
      );
    } else if (showContributing && !showLead) {
      chips.push({ dimension: 'role', value: 'contributing', label: 'Center role: Contributing' });
    }

    for (const chip of this.statusChips()) {
      chips.push({ dimension: 'status', value: chip.key, label: `Status: ${chip.label}` });
    }

    for (const chip of this.projectChips()) {
      chips.push({ dimension: 'project', value: String(chip.id), label: `Project: ${chip.label}` });
    }

    for (const name of this.createdByFilter()) {
      if (name) chips.push({ dimension: 'createdBy', value: name, label: `Created by: ${name}` });
    }

    const search = this.searchQuery().trim();
    if (search) chips.push({ dimension: 'search', value: search, label: `Search: ${search}` });

    return chips;
  });

  readonly hasActiveFilters = computed(() => this.activeChips().length > 0);

  /** True when the Filter button should use the active (primary-tinted) styling. */
  readonly filterButtonActive = computed(() => this.hasActiveFilters());

  /** Badge count on the Filter button — one per active chip. */
  readonly activeFilterBadgeCount = computed(() => this.activeChips().length);

  /** Clear filters is hidden while only the default phase chip(s) remain. */
  readonly hasClearableFilters = computed(
    () => this.activeChips().some(chip => chip.dimension !== 'phase') || this.hasNonDefaultPhaseFilter(),
  );

  constructor() {
    // Use centerId when resolved; fall back to centerAcronym so admin users browsing
    // centers that aren't in their roles can still trigger the load.
    const centerIdentifier$ = combineLatest([
      toObservable(this.ctx.centerId),
      toObservable(this.ctx.centerAcronym),
    ]).pipe(
      map(([id, acronym]) => id ?? (acronym || null)),
      filter((v): v is string => !!v),
      distinctUntilChanged(),
    );

    combineLatest([
      centerIdentifier$,
      toObservable(this.selectedPhaseIds).pipe(
        filter(ids => ids.length > 0),
        distinctUntilChanged((a, b) => a.length === b.length && a.every((id, index) => id === b[index])),
      ),
    ])
      .pipe(
        takeUntilDestroyed(),
        switchMap(([centerId, phaseIds]) => {
          this.loading.set(true);
          this.error.set(false);

          if (phaseIds.length === 1) {
            return this.bilateralApiService.GET_bilateralCenterResults(centerId, phaseIds[0]).pipe(
              map(({ response }) => response ?? []),
            );
          }

          return forkJoin(
            phaseIds.map(id => this.bilateralApiService.GET_bilateralCenterResults(centerId, id)),
          ).pipe(map(responses => responses.flatMap(({ response }) => response ?? [])));
        }),
      )
      .subscribe({
        next: rows => {
          this.results.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

    // @akili-spec changes/project-multiselect-filter (PMF-T-1 wave 2, PMF-DD-1 pivot) — the
    // Project multiselect's options come from the CENTER'S OWN catalog: one request per
    // selected phase year per page lifetime, and only for years not already requested. A
    // failed year is recorded and never retried; the union of the loaded years feeds
    // `projectOptions` and degrades to the other years (or empty) on failure — no
    // project-specific loading or error surface, and the results pipeline above is never
    // touched by any of it.
    combineLatest([
      centerIdentifier$,
      toObservable(this.selectedPhaseYears).pipe(
        filter(years => years.length > 0),
        distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
      ),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([centerId, years]) => this.loadProjectCatalog(centerId, years));

    // Reset the table to its default sort + page 0 whenever the filtered set changes
    // (filter chips, search, new data) — mirrors the Results Center pattern.
    effect(() => {
      this.filteredResults();
      untracked(() => this.table?.reset());
    });
  }

  ngOnInit(): void {
    // P2-3157 AC3: `?result=<code>` arrives from an approval/rejection notification.
    const focused = this.activatedRoute.snapshot.queryParamMap.get('result');
    if (focused) this.focusedResultCode.set(focused);

    // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-14) — parse the shared contract on
    // init AND on every `queryParamMap` change (deep link, back/forward, header tab click). The
    // Observable emits its current value immediately upon subscription, so one subscription covers
    // both cases.
    this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(map => this.applyUrlParams(map));

    const p25Only = (phases: Phases[]) => phases.filter(p => p.obj_portfolio?.acronym === 'P25');

    const reportingPhases = p25Only(this.phasesService.phases.reporting);

    if (reportingPhases.length) {
      this.phases.set(reportingPhases);
      this.ensureDefaultPhaseSelection();
      this.initializing.set(false);
    } else {
      this.phasesService.getPhasesObservable()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(loaded => {
          this.phases.set(p25Only(loaded));
          this.ensureDefaultPhaseSelection();
          this.initializing.set(false);
        });
    }
  }

  phaseChipLabel(phase: Phases): string {
    const year = phase.phase_year ?? phase.phase_name;
    const portfolio = phase.obj_portfolio?.acronym;
    const base = portfolio ? `${year} · ${portfolio}` : String(year ?? '');
    return phase.status ? `${base} · Open` : base;
  }

  /** Toolbar chip label — matches Programme Results (`Reporting 2026 - P25`). */
  phaseFilterLabel(phase: Phases): string {
    const name = phase.phase_name ?? (phase.phase_year ? `Reporting ${phase.phase_year}` : 'Phase');
    const acronym = phase.obj_portfolio?.acronym;
    return acronym ? `${name} - ${acronym}` : name;
  }

  isPhaseSelected(phase: Phases): boolean {
    return this.selectedPhaseIds().includes(phaseVersionId(phase));
  }

  private ensureDefaultPhaseSelection(): void {
    if (this.selectedPhaseIds().length) return;

    const phases = this.phases();
    if (!phases.length) return;

    const fromCtx = this.ctx.selectedVersionId();
    if (fromCtx !== null && phases.some(phase => phaseVersionId(phase) === fromCtx)) {
      this.selectedPhaseIds.set([fromCtx]);
      return;
    }

    const defaults = this.defaultPhaseIds();
    if (defaults.length) {
      this.selectedPhaseIds.set(defaults);
      this.syncPrimaryPhase();
    }
  }

  private syncPrimaryPhase(): void {
    const ids = this.selectedPhaseIds();
    if (!ids.length) {
      this.ctx.selectedVersionId.set(null);
      return;
    }

    const open = this.phases().find(phase => phase.status);
    const openId = open ? phaseVersionId(open) : null;
    const primary = openId !== null && ids.includes(openId) ? openId : ids[0];
    this.ctx.selectedVersionId.set(primary);
  }

  /**
   * `COV-R-14`/`COV-DD-3` — hydrates the chips, search and the new status/project/program/type/
   * method filters from the URL, applying the Results tab's own no-param default (W3 + Lead) via
   * `applyResultsTabDefaults`. `phase` wins over the shared signal when present and differs
   * (`COV-DD-2`'s "secondary flows": the signal is then updated to the URL value). Invalid tokens
   * are rewritten out of the URL once, using only the still-valid values for the affected keys —
   * never touching an unrelated key or injecting a default the user never asked for.
   */
  private applyUrlParams(map: ParamMap): void {
    const parsedRaw = parseBilateralQueryParams(map);
    const { params, stripped } = applyResultsTabDefaults(parsedRaw, RESULTS_TAB_IGNORE_KEYS);

    if (params.source === null) {
      this.showW3.set(true);
      this.showW1W2.set(true);
    } else {
      this.showW3.set(params.source === 'w3');
      this.showW1W2.set(params.source === 'w1w2');
    }

    if (params.role === null) {
      this.showLead.set(true);
      this.showContributing.set(true);
    } else {
      this.showLead.set(params.role === 'lead');
      this.showContributing.set(params.role === 'contributing');
    }

    // `COV-R-13` BUT ("the destination's own chips and search remain usable"): the search box drives
    // the URL AND is hydrated from it, so a naive `set` makes the field unusable for anything but a
    // single word. `onSearch` writes every keystroke, the emission re-enters this method, and
    // `parseBilateralQueryParams` TRIMS `search` — typing `foo ` would come back as `foo`, the
    // `[value]="searchQuery()"` binding would reset the input, and the next key would yield `foob`,
    // putting the token search (`tokens.every`) permanently out of reach for a two-word query.
    // A URL value that differs from the typed one ONLY by trimming is this component's own echo and
    // is ignored; any genuinely different value still wins — a deep link, a back/forward step, and
    // the empty string left behind by `clearSearch` (`'' !== 'foo'`) all still hydrate normally.
    if (params.search !== this.searchQuery().trim()) this.searchQuery.set(params.search);
    this.statusFilter.set(params.status);
    this.projectFilter.set(params.project);
    this.programFilter.set(params.program);
    this.typeFilter.set(params.type);
    this.methodFilter.set(params.method);
    this.createdByFilter.set(params.createdBy);

    const urlPhaseIds = parsePhaseIdsFromUrl(map.get(BILATERAL_PHASE_QUERY_PARAM));
    if (urlPhaseIds.length) {
      this.selectedPhaseIds.set(urlPhaseIds);
      this.syncPrimaryPhase();
    } else if (params.phase !== null) {
      this.selectedPhaseIds.set([params.phase]);
      this.ctx.selectedVersionId.set(params.phase);
    } else {
      this.ensureDefaultPhaseSelection();
    }

    if (stripped.length) {
      const validSerialized = serializeBilateralQueryParams(parsedRaw.params);
      const affectedKeys = new Set(stripped.map(entry => entry.split('=')[0]));
      const next: Params = {};
      for (const key of affectedKeys) {
        next[key] = key in validSerialized ? validSerialized[key] : null;
      }
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: next,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /**
   * `COV-R-14`/`COV-DD-3` (amendment) — writes the chip/phase/search/status/project state back to
   * the URL (`replaceUrl`, `merge`), called only from a user action (never during hydration, so a
   * plain `/results` load writes nothing). Uses `explicitDefaults: true` so an explicit "both"
   * selection (all four chips on) survives a reload as `role=all&source=all` instead of silently
   * falling back to the W3 + Lead default on the next parse — `serializeBilateralQueryParams`
   * otherwise omits a `null` role/source entirely, and an empty URL re-triggers
   * `applyResultsTabDefaults`. Every managed key not present in the serialized params is explicitly
   * nulled so `merge` clears it from an existing URL rather than leaving it stale; `?result=`
   * (notification focus) is never in the managed set, so it is untouched.
   */
  private syncUrlParams(): void {
    const serialized = serializeBilateralQueryParams(this.currentContractParams(), { explicitDefaults: true });
    const phaseIds = this.selectedPhaseIds();
    if (phaseIds.length) serialized[BILATERAL_PHASE_QUERY_PARAM] = phaseIds.join(',');
    else delete serialized[BILATERAL_PHASE_QUERY_PARAM];

    const current = this.activatedRoute.snapshot.queryParamMap;
    const next: Params = {};
    let changed = false;
    for (const key of RESULTS_TAB_MANAGED_QUERY_PARAMS) {
      const value = key in serialized ? serialized[key] : null;
      next[key] = value;
      if ((current.get(key) ?? null) !== (value ?? null)) changed = true;
    }
    if (!changed) return;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: next,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** `COV-R-14` — removes one status from the Status chip group and writes the URL. */
  removeStatusFilter(key: StatusKey): void {
    this.statusFilter.update(keys => keys.filter(k => k !== key));
    this.syncUrlParams();
  }

  /** `COV-R-14` — removes one project id from the Project chip and writes the URL. */
  removeProjectFilter(id: number): void {
    this.projectFilter.update(ids => ids.filter(existing => existing !== id));
    this.syncUrlParams();
  }

  /** Removes one creator from the Created by multiselect and writes the URL. */
  removeCreatedByFilter(name: string): void {
    this.createdByFilter.update(values => values.filter(existing => existing !== name));
    this.syncUrlParams();
  }

  onCreatedByFilterChange(values: string[]): void {
    this.createdByFilter.set(values ?? []);
    this.syncUrlParams();
  }

  /** `PMF-R-1` — the multiselect's emitted array normalized to unique positive ids, then routed
   *  through the existing project signal, predicate, chips and URL synchronization (`PMF-DD-2`:
   *  no second state path, no HTTP call). Invalid emitted ids are ignored. */
  onProjectFilterChange(values: number[]): void {
    const ids = [...new Set((values ?? []).map(normalizeProjectId).filter((id): id is number => id !== null))];
    this.projectFilter.set(ids);
    this.syncUrlParams();
  }

  /**
   * `PMF-R-1` (pivot) — requests the center catalog for every selected phase year not already
   *  requested this page lifetime (`PMF-NFR-1`: at most one request per year, so repeated
   *  popover opens, selections or phase toggles cannot refetch a loaded year, and a failing
   *  year cannot loop). Options are derived per year, cached, and unioned by the
   *  `projectOptions` computed; loading and failure stay implicit — the control simply shows
   *  what the cache holds, never a project-specific loading or error state.
   */
  private loadProjectCatalog(centerId: string, years: number[]): void {
    if (this.projectCatalogCenter !== centerId) {
      this.projectCatalogByYear.set(new Map());
      this.projectCatalogYearsRequested.clear();
      this.projectCatalogCenter = centerId;
    }

    for (const year of years) {
      if (this.projectCatalogYearsRequested.has(year)) continue;
      this.projectCatalogYearsRequested.add(year);

      this.bilateralApiService.GET_bilateralProjects(centerId, year).subscribe({
        next: ({ response }) => {
          const projects: unknown[] = response?.projects ?? [];
          const options: ProjectFilterOption[] = [];
          const seen = new Set<number>();
          for (const project of projects) {
            const id = normalizeProjectId((project as { id?: number | string })?.id);
            if (id === null || seen.has(id)) continue;
            seen.add(id);
            options.push({ value: id, label: catalogProjectLabel(project as { shortName?: unknown; fullName?: unknown }, id) });
          }
          this.projectCatalogByYear.update(cache => new Map(cache).set(year, options));
        },
        error: () => {
          // Recorded above, never retried: the year stays absent from the cache and the
          // union degrades to what the other selected years provide (or empty).
        },
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: MouseEvent): void {
    if (this.openMenuKey()) this.openMenuKey.set(null);
    if (this.columnsOpen()) this.columnsOpen.set(false);

    const target = event?.target as HTMLElement | null;
    if (target?.closest?.('.brl-filter-container')) return;
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.openMenuKey()) this.openMenuKey.set(null);
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  toggleFilterPopover(event: Event): void {
    event.stopPropagation();
    this.closeRowMenu();
    this.columnsOpen.set(false);
    this.filterPopoverOpen.update(open => !open);
  }

  closeFilterPopover(): void {
    this.filterPopoverOpen.set(false);
  }

  clearAllFilters(): void {
    this.selectedPhaseIds.set(this.defaultPhaseIds());
    this.syncPrimaryPhase();
    this.showW3.set(true);
    this.showW1W2.set(false);
    this.showLead.set(true);
    this.showContributing.set(false);
    this.statusFilter.set([]);
    this.projectFilter.set([]);
    this.programFilter.set([]);
    this.typeFilter.set([]);
    this.methodFilter.set(null);
    this.createdByFilter.set([]);
    this.searchQuery.set('');
    this.syncUrlParams();
  }

  clearChip(chip: BilateralFilterChip): void {
    switch (chip.dimension) {
      case 'phase': {
        const id = Number(chip.value);
        const next = this.selectedPhaseIds().filter(existing => existing !== id);
        this.selectedPhaseIds.set(next.length ? next : this.defaultPhaseIds());
        this.syncPrimaryPhase();
        break;
      }
      case 'source':
        if (chip.value === 'w3') this.toggleW3();
        else if (chip.value === 'w1w2') this.toggleW1W2();
        return;
      case 'role':
        if (chip.value === 'lead') this.toggleLead();
        else if (chip.value === 'contributing') this.toggleContributing();
        return;
      case 'status':
        this.removeStatusFilter(chip.value as StatusKey);
        return;
      case 'project':
        this.removeProjectFilter(Number(chip.value));
        return;
      case 'createdBy':
        this.removeCreatedByFilter(chip.value);
        return;
      case 'search':
        this.clearSearch();
        return;
    }
    this.syncUrlParams();
  }

  isColumnVisible(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }

  toggleColumn(key: string, event?: Event): void {
    event?.stopPropagation();
    // Keep at least one column visible so the table never collapses to empty.
    const next = { ...this.columnVisibility() };
    const turningOff = next[key] !== false;
    if (turningOff) {
      const remaining = BILATERAL_COLUMNS.filter(c => c.key !== key && next[c.key] !== false).length;
      if (remaining === 0) return;
    }
    next[key] = !turningOff;
    this.columnVisibility.set(next);
    try {
      localStorage.setItem(BILATERAL_COLUMN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode — visibility still works for the session
    }
  }

  toggleColumnsPanel(event?: Event): void {
    event?.stopPropagation();
    this.closeRowMenu();
    this.filterPopoverOpen.set(false);
    this.columnsOpen.update(v => !v);
  }

  /** Resolved width for a column — custom resize wins over the catalog default. */
  columnWidth(column: BilateralColumnDef): string {
    const custom = this.customWidths()[column.key];
    return custom ? `${custom}px` : column.width;
  }

  // ── Column resizing (Programme Results parity) ───────────────────────────────
  private activeResize: {
    columnKey: string;
    startX: number;
    startWidth: number;
    minPx: number;
  } | null = null;

  private readonly onWindowMouseMove = (event: MouseEvent): void => {
    if (!this.activeResize) return;
    const deltaX = event.clientX - this.activeResize.startX;
    const newWidth = Math.max(this.activeResize.minPx, Math.round(this.activeResize.startWidth + deltaX));
    this.customWidths.update(prev => ({ ...prev, [this.activeResize!.columnKey]: newWidth }));
  };

  private readonly onWindowMouseUp = (): void => {
    if (!this.activeResize) return;
    this.activeResize = null;
    this.isResizing.set(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    writeStoredBilateralColumnWidths(this.customWidths());
  };

  onResizeStart(event: MouseEvent, column: BilateralColumnDef, thElement: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeResize = {
      columnKey: column.key,
      startX: event.clientX,
      startWidth: thElement.getBoundingClientRect().width,
      minPx: column.minPx,
    };
    this.isResizing.set(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  onResizeReset(column: BilateralColumnDef, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.customWidths.update(prev => {
      const next = { ...prev };
      delete next[column.key];
      writeStoredBilateralColumnWidths(next);
      return next;
    });
  }

  ngOnDestroy(): void {
    if (!this.activeResize) return;
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  /** Immediate client-side CSV of the currently filtered rows and visible columns. */
  exportCsv(): void {
    const cols = this.visibleColumns();
    const rows = this.filteredResults();
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = cols.map(c => escape(c.title)).join(',');
    const lines = rows.map(r => cols.map(c => escape(this.cellText(r, c.attr))).join(','));
    const csv = [header, ...lines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bilateral-results-${this.ctx.centerAcronym() || 'center'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private cellText(result: BilateralCenterResult, attr: string): string {
    switch (attr) {
      case 'source':
        return result.source === 'API' ? 'W3 Bilateral' : 'W1/W2';
      case 'result_code':
        return result.result_code;
      case 'title':
        return result.title;
      case 'project_name':
        return result.project_name ?? '';
      case 'description':
        return result.description ?? '';
      case 'result_type':
        return result.result_type;
      case 'is_leading_result':
        return result.is_leading_result === 1 ? 'Lead' : 'Contributing';
      case 'status_id':
        return result.status_name;
      case 'created_date':
        return result.created_date;
      case 'created_by_name':
        return result.created_by_name ?? '';
      default:
        return '';
    }
  }

  /** Toggles a reporting phase in the Results filter — at least one phase must remain selected. */
  togglePhase(phase: Phases): void {
    const id = phaseVersionId(phase);
    const current = this.selectedPhaseIds();

    if (current.includes(id)) {
      if (current.length === 1) return;
      this.selectedPhaseIds.set(current.filter(existing => existing !== id));
    } else {
      this.selectedPhaseIds.set([...current, id].sort((a, b) => a - b));
    }

    this.syncPrimaryPhase();
    this.syncUrlParams();
  }

  toggleW3(): void {
    if (this.showW3() && !this.showW1W2()) return;
    this.showW3.update(v => !v);
    this.syncUrlParams();
  }

  toggleW1W2(): void {
    if (this.showW1W2() && !this.showW3()) return;
    this.showW1W2.update(v => !v);
    this.syncUrlParams();
  }

  toggleLead(): void {
    if (this.showLead() && !this.showContributing()) return;
    this.showLead.update(v => !v);
    this.syncUrlParams();
  }

  toggleContributing(): void {
    if (this.showContributing() && !this.showLead()) return;
    this.showContributing.update(v => !v);
    this.syncUrlParams();
  }

  /** Any W3 result the current user can open and edit. */
  canEditResult(result: BilateralCenterResult): boolean {
    return result.source === 'API' && this.canManageW3();
  }

  /** W3 results that can be deleted.
   * Admins may delete regardless of status; center users only while in Editing. */
  canDeleteResult(result: BilateralCenterResult): boolean {
    if (!this.canManageW3() || result.source !== 'API') return false;
    return this.rolesService.isAdmin || result.status_id === 1;
  }

  isAiResult(result: BilateralCenterResult): boolean {
    return result.is_ai_generated === true ||
      result.is_ai_generated === 1 ||
      result.creation_method?.toUpperCase() === 'AI';
  }

  // ── Row menu ────────────────────────────────────────────────────────────
  rowKey(result: BilateralCenterResult): string {
    return `${result?.result_code ?? ''}|${result?.version_id ?? ''}`;
  }

  isMenuOpen(result: BilateralCenterResult): boolean {
    return this.openMenuKey() === this.rowKey(result);
  }

  toggleRowMenu(result: BilateralCenterResult, event: Event): void {
    event.stopPropagation();
    this.columnsOpen.set(false);
    this.filterPopoverOpen.set(false);
    const key = this.rowKey(result);
    this.openMenuKey.update(open => (open === key ? null : key));
  }

  closeRowMenu(): void {
    this.openMenuKey.set(null);
  }

  onRowMenuDetach(result: BilateralCenterResult): void {
    if (this.isMenuOpen(result)) this.closeRowMenu();
  }

  openResultFromMenu(result: BilateralCenterResult): void {
    this.closeRowMenu();
    this.openResult(result);
  }

  editResult(result: BilateralCenterResult, event?: Event): void {
    event?.stopPropagation();
    this.closeRowMenu();
    this.openResult(result);
  }

  pdfHref(result: BilateralCenterResult): string {
    return `/reports/result-details/${result?.result_code}?phase=${result?.version_id}`;
  }

  resultLink(result: BilateralCenterResult): string {
    const path = this.router.serializeUrl(
      this.router.createUrlTree(
        ['/bilateral', this.ctx.centerAcronym(), 'result', result.result_code],
        { queryParams: { phase: result.version_id } },
      ),
    );
    return `${window.location.origin}${path}`;
  }

  copyLink(result: BilateralCenterResult): void {
    this.clipboard.copy(this.resultLink(result));
    this.toastSE.add({
      key: 'globalUserNotification',
      severity: 'success',
      summary: 'Result link copied',
    });
    this.closeRowMenu();
  }

  deleteResult(result: BilateralCenterResult): void {
    this.closeRowMenu();
    this.deletionSE.deleteWithConfirmation(result, {
      onSuccess: () => {
        this.results.update(list => list.filter(r => r.id !== result.id));
      },
    });
  }

  /**
   * P2-3229 offered "Update result" for an approved bilateral result of a previous phase — but only
   * from the Results Center row menu. From this list, the centre's own, there was no way to carry a
   * 2025 result into the open phase (Nicoleta Trifa via Ángel Jarrín, 2026-09-03: "not sure where I
   * should go to proceed with the update"). Same rule as the Results Center (`ApiService.
   * canUpdateBilateral`): past phase, Approved, user of the lead centre or admin. The row carries no
   * `lead_center`/`phase_year`, so both are derived here: this list IS the centre's, and the phase
   * year comes from the phase the row belongs to.
   */
  canUpdateResult(result: BilateralCenterResult): boolean {
    if (result.source !== 'API') return false;
    return this.api.canUpdateBilateral(this.asCurrentResult(result), this.api.dataControlSE.reportingCurrentPhase);
  }

  updateResult(result: BilateralCenterResult, event?: Event): void {
    event?.stopPropagation();
    this.closeRowMenu();
    this.api.dataControlSE.currentResult = this.asCurrentResult(result);
    this.api.dataControlSE.chagePhaseModal = true;
  }

  /** The shape `ApiService.canUpdateBilateral` and `app-change-phase-modal` read from `currentResult`. */
  private asCurrentResult(result: BilateralCenterResult): any {
    const phase = this.phases().find(item => item.id === result.version_id);
    return {
      ...result,
      source_name: 'W3/Bilaterals',
      lead_center: this.ctx.centerAcronym(),
      phase_year: phase?.phase_year ?? null,
      // P2-3653. The modal's "From phase" reads `phase_name`, which this row does not carry — it
      // rendered blank from this list and populated from the Results Center, breaking the "same
      // interaction pattern" AC1 asks for. Formatted as the Results Center list formats it
      // (`CONCAT(v.phase_name, ' - ', cp.acronym)` in result.repository.ts) so the two modals read
      // identically; the acronym is dropped rather than faked when the phase carries no portfolio.
      phase_name: this.phaseNameWithPortfolio(phase),
    };
  }

  /** "Reporting 2025 - P25", or just the phase name when the phase has no portfolio acronym. */
  private phaseNameWithPortfolio(phase: Phases | undefined): string | null {
    if (!phase?.phase_name) return null;
    const acronym = phase.obj_portfolio?.acronym;
    return acronym ? `${phase.phase_name} - ${acronym}` : phase.phase_name;
  }

  /**
   * Navigates by `result_code` + phase, which is what the detail endpoint resolves when a phase is
   * present — and what the user sees in the URL. ⚠️ The code is NOT the internal `result.id` (5804
   * of 9667 results on prtest differ), so nothing downstream may treat this route parameter as an
   * id: only the detail response can publish that. See `BilateralCreationService.loadResult`.
   */
  openResult(result: BilateralCenterResult): void {
    this.router.navigate(
      ['/bilateral', this.ctx.centerAcronym(), 'result', result.result_code],
      { queryParams: { phase: result.version_id } },
    );
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.syncUrlParams();
  }

  /** `COV-R-14` — clears the search box and writes the URL (used by the search field's clear button). */
  clearSearch(): void {
    this.searchQuery.set('');
    this.syncUrlParams();
  }

  statusClass(statusId: number): string {
    return `status_tag status_${statusId ?? ''}`;
  }

  /** P2-3157 AC4 — Rejected (7) is the only status carrying a justification worth reading back. */
  isRejected(result: BilateralCenterResult): boolean {
    return Number(result?.status_id) === REJECTED_STATUS_ID;
  }

  /** P2-3157 AC3 — the row deep-linked from the notification. */
  isFocused(result: BilateralCenterResult): boolean {
    const focused = this.focusedResultCode();
    return !!focused && String(result?.result_code) === focused;
  }

  /**
   * P2-3157 AC4 — opens the review trail for a rejected result. The Science Program's justification
   * is the `comment` of the most recent REJECTED entry.
   */
  openJustification(result: BilateralCenterResult): void {
    this.justificationResultCode.set(String(result?.result_code ?? ''));
    this.justificationEntries.set([]);
    this.justificationError.set(false);
    this.justificationLoading.set(true);
    this.justificationVisible.set(true);

    this.bilateralApiService.GET_bilateralReviewHistory(result.id).subscribe({
      next: ({ response }) => {
        this.justificationEntries.set(response ?? []);
        this.justificationLoading.set(false);
      },
      error: () => {
        this.justificationError.set(true);
        this.justificationLoading.set(false);
      },
    });
  }

  closeJustification(): void {
    this.justificationVisible.set(false);
    this.justificationEntries.set([]);
  }

  /** Most recent rejection entry, which is what the centre needs to act on. */
  readonly rejectionEntry = computed(() =>
    this.justificationEntries().find(entry => entry?.action === 'REJECTED' || entry?.action === 'REJECT'),
  );

  reviewerName(entry: ReviewHistoryEntry): string {
    return `${entry?.first_name ?? ''} ${entry?.last_name ?? ''}`.trim() || entry?.email || 'the Science Program';
  }
}

/** `result_status.result_status_id` for Rejected — see shared/constants/result-status.enum.ts on the server. */
const REJECTED_STATUS_ID = 7;

/** One row of `result_review_history`, as returned by GET /api/results/bilateral/:id/review-history. */
export interface ReviewHistoryEntry {
  id: number;
  result_id: number;
  action: string;
  comment: string | null;
  created_at: string;
  created_by: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}
