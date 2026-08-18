import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, take, map, distinctUntilChanged } from 'rxjs';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective,
  PrTableLoadingDirective,
} from '../../../../shared/components/pr-table';

export interface BilateralCenterResult {
  id: number;
  result_code: string;
  title: string;
  result_type: string;
  status_id: number;
  status_name: string;
  created_date: string;
  version_id: number;
  source: 'API' | 'Result';
  creation_method?: string;
  is_ai_generated?: boolean | number;
  is_leading_result: 0 | 1;
}

/** Column catalog for the "Columns" picker — mirrors the Results Center pattern (RC_COLUMNS). */
export interface BilateralColumnDef {
  key: string;
  title: string;
  attr: string;
  width: string;
  /** Default visibility when no localStorage preference exists. */
  defaultOn: boolean;
}

// Versioned so older preferences cannot leave the newly required Result type column hidden.
const BILATERAL_COLUMN_STORAGE_KEY = 'pr.bilateralResults.visibleColumns.v2';

/** Full column set (order = picker + table order). Kept to the fields BilateralCenterResult actually has. */
export const BILATERAL_COLUMNS: readonly BilateralColumnDef[] = [
  { key: 'source', title: 'Source', attr: 'source', width: '100px', defaultOn: true },
  { key: 'code', title: 'Code', attr: 'result_code', width: '100px', defaultOn: true },
  { key: 'title', title: 'Title', attr: 'title', width: '280px', defaultOn: true },
  { key: 'type', title: 'Result type', attr: 'result_type', width: '180px', defaultOn: true },
  { key: 'role', title: 'Role', attr: 'is_leading_result', width: '120px', defaultOn: true },
  { key: 'status', title: 'Status', attr: 'status_id', width: '120px', defaultOn: true },
  { key: 'created', title: 'Created', attr: 'created_date', width: '110px', defaultOn: true },
];

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

@Component({
  selector: 'app-bilateral-results-list',
  standalone: true,
  imports: [
    DatePipe,
    BilateralPageHeaderComponent,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    PrTableLoadingDirective,
  ],
  templateUrl: './bilateral-results-list.component.html',
  styleUrl: './bilateral-results-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralResultsListComponent implements OnInit {
  private readonly bilateralApiService = inject(BilateralApiService);
  private readonly phasesService = inject(PhasesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolesService = inject(RolesService);
  private readonly resultsApiService = inject(ResultsApiService);
  readonly ctx = inject(BilateralContextService);

  readonly phases = signal<Phases[]>([]);
  readonly selectedPhase = signal<Phases | null>(null);
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

  // Actions
  readonly confirmingDeleteId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);

  /** Full catalog for the Columns picker. */
  readonly allColumns = BILATERAL_COLUMNS;

  /** Visibility map keyed by BILATERAL_COLUMNS.key — persisted. */
  readonly columnVisibility = signal<Record<string, boolean>>({
    ...defaultColumnVisibility(),
    ...readStoredColumnVisibility(),
  });

  readonly columnsOpen = signal(false);

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

  readonly filteredResults = computed(() => {
    const showW3 = this.showW3();
    const showW1W2 = this.showW1W2();
    const showLead = this.showLead();
    const showContributing = this.showContributing();
    const query = normalise(this.searchQuery());
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

    return this.results().filter(r => {
      const sourceOk =
        (showW3 && r.source === 'API') ||
        (showW1W2 && r.source === 'Result');
      const roleOk =
        (showLead && r.is_leading_result === 1) ||
        (showContributing && r.is_leading_result === 0);

      if (!sourceOk || !roleOk) return false;
      if (!tokens.length) return true;

      const hay = normalise(
        `${r.result_code} ${r.title} ${r.result_type} ${r.source === 'API' ? 'W3 bilateral' : 'W1 W2'}`
      );
      return tokens.every(t => hay.includes(t));
    });
  });

  readonly totalCount = computed(() => this.filteredResults().length);
  readonly totalLoaded = computed(() => this.results().length);

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
      toObservable(this.selectedPhase).pipe(filter((p): p is Phases => !!p)),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([, phase]) => this.loadResults(phase.id));

    // Reset the table to its default sort + page 0 whenever the filtered set changes
    // (filter chips, search, new data) — mirrors the Results Center pattern.
    effect(() => {
      this.filteredResults();
      untracked(() => this.table?.reset());
    });
  }

  ngOnInit(): void {
    const p25Only = (phases: Phases[]) => phases.filter(p => p.obj_portfolio?.acronym === 'P25');

    const reportingPhases = p25Only(this.phasesService.phases.reporting);

    if (reportingPhases.length) {
      this.phases.set(reportingPhases);
      const active = reportingPhases.find(p => p.status) ?? reportingPhases[0] ?? null;
      this.selectedPhase.set(active);
      this.initializing.set(false);
    } else {
      this.phasesService.getPhasesObservable()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(loaded => {
          const p25 = p25Only(loaded);
          this.phases.set(p25);
          const active = p25.find((p: Phases) => p.status) ?? p25[0] ?? null;
          this.selectedPhase.set(active);
          this.initializing.set(false);
        });
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.columnsOpen()) this.columnsOpen.set(false);
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
    this.columnsOpen.update(v => !v);
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
      case 'result_type':
        return result.result_type;
      case 'is_leading_result':
        return result.is_leading_result === 1 ? 'Lead' : 'Contributing';
      case 'status_id':
        return result.status_name;
      case 'created_date':
        return result.created_date;
      default:
        return '';
    }
  }

  selectPhase(phase: Phases): void {
    this.selectedPhase.set(phase);
    this.searchQuery.set('');
  }

  toggleW3(): void {
    if (this.showW3() && !this.showW1W2()) return;
    this.showW3.update(v => !v);
  }

  toggleW1W2(): void {
    if (this.showW1W2() && !this.showW3()) return;
    this.showW1W2.update(v => !v);
  }

  toggleLead(): void {
    if (this.showLead() && !this.showContributing()) return;
    this.showLead.update(v => !v);
  }

  toggleContributing(): void {
    if (this.showContributing() && !this.showLead()) return;
    this.showContributing.update(v => !v);
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

  editResult(result: BilateralCenterResult, event: Event): void {
    event.stopPropagation();
    this.openResult(result);
  }

  requestDelete(result: BilateralCenterResult, event: Event): void {
    event.stopPropagation();
    this.confirmingDeleteId.set(result.id);
  }

  cancelDelete(event: Event): void {
    event.stopPropagation();
    this.confirmingDeleteId.set(null);
  }

  confirmDelete(result: BilateralCenterResult, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(result.id);
    this.resultsApiService.PATCH_DeleteResult(result.id).subscribe({
      next: () => {
        this.results.update(list => list.filter(r => r.id !== result.id));
        this.confirmingDeleteId.set(null);
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }

  loadResults(versionId: number): void {
    const centerId = this.ctx.centerId() || this.ctx.centerAcronym() || '';
    if (!centerId) return;

    this.loading.set(true);
    this.error.set(false);

    this.bilateralApiService.GET_bilateralCenterResults(centerId, versionId).subscribe({
      next: ({ response }) => {
        this.results.set(response ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  openResult(result: BilateralCenterResult): void {
    this.router.navigate(
      ['/bilateral', this.ctx.centerAcronym(), 'result', result.result_code],
      { queryParams: { phase: result.version_id } },
    );
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  statusClass(statusId: number): string {
    return `status_tag status_${statusId ?? ''}`;
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
