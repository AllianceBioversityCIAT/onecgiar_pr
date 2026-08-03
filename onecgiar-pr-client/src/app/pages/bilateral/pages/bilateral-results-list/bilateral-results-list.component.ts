import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, take } from 'rxjs';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';

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
  is_leading_result: 0 | 1;
}

const PAGE_SIZE = 25;

@Component({
  selector: 'app-bilateral-results-list',
  standalone: true,
  imports: [DatePipe, BilateralPageHeaderComponent],
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

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

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

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE))
  );

  readonly pagedResults = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredResults().slice(start, start + PAGE_SIZE);
  });

  readonly pageStart = computed(() =>
    this.totalCount() === 0
      ? 0
      : (this.currentPage() - 1) * PAGE_SIZE + 1
  );

  readonly pageEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.totalCount())
  );

  /** Page numbers to render — handles ellipsis when > 7 total pages. */
  readonly pageNumbers = computed<(number | '…')[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '…')[] = [1];

    const left  = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);

    if (left > 2)       pages.push('…');
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < total - 1) pages.push('…');

    pages.push(total);
    return pages;
  });

  constructor() {
    combineLatest([
      toObservable(this.ctx.centerId).pipe(filter((id): id is string => !!id)),
      toObservable(this.selectedPhase).pipe(filter((p): p is Phases => !!p)),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([, phase]) => this.loadResults(phase.id));

    // Reset to page 1 whenever the filtered set changes (filter chips, search, new data).
    effect(() => {
      this.filteredResults();
      untracked(() => this.currentPage.set(1));
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

  selectPhase(phase: Phases): void {
    this.selectedPhase.set(phase);
    this.searchQuery.set('');
  }

  goToPage(page: number | '…'): void {
    if (page === '…') return;
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  toggleW3(): void {
    if (!this.showW3() && !this.showW1W2()) return;
    this.showW3.update(v => !v);
  }

  toggleW1W2(): void {
    if (this.showW1W2() && !this.showW3()) return;
    this.showW1W2.update(v => !v);
  }

  toggleLead(): void {
    if (!this.showLead() && !this.showContributing()) return;
    this.showLead.update(v => !v);
  }

  toggleContributing(): void {
    if (this.showContributing() && !this.showLead()) return;
    this.showContributing.update(v => !v);
  }

  /** W3 results in Editing status that the current user can manage. */
  canManageResult(result: BilateralCenterResult): boolean {
    return result.source === 'API' && result.status_id === 1 && this.canManageW3();
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
    const centerId = this.ctx.centerId();
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
    const map: Record<number, string> = {
      1: 'draft',
      2: 'active',
      3: 'active',
      5: 'pending',
      6: 'approved',
      7: 'rejected',
    };
    return map[statusId] ?? 'draft';
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
