// @akili-spec results/impact-results-reporting/impact-previous-results-dropdown (IPD-T-1, design §6.1, IPD-DD-1..3)
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { ImpactPreviousResult, ImpactPreviousResultsSearchParams } from '../../../../../../../../../shared/interfaces/impact-level.interface';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../../../../shared/enum/api.enum';
import { resultTypeFilterLabel } from '../../../../../../../../../shared/utils/impact-result.util';

export const PICKER_PAGE_LIMIT = 20;
export const PICKER_SEARCH_DEBOUNCE_MS = 300;

export interface PickerPortfolio {
  id: number | string;
  acronym: string;
}

export interface PickerTypeOption {
  id: number | string;
  label: string;
}

/** One E5 request; `append` travels with it so a stale "Load more" can never be merged into a newer list. */
interface LoadRequest {
  page: number;
  append: boolean;
}

/**
 * Inline "Please select a result" dropdown (IPD-R-1..3). Controlled by the page: it reads `selection` and emits
 * the whole new array on every toggle / Clear selection (IPD-A-3). Filter changes never emit.
 */
@Component({
  selector: 'app-previous-results-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './previous-results-picker.component.html',
  styleUrl: './previous-results-picker.component.scss',
  host: { '(document:click)': 'onDocumentClick($event)' }
})
export class PreviousResultsPickerComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Sent as `excludeResultId`: the current result is never offered. */
  readonly resultId = input<number | string | null>(null);
  readonly selection = input<ImpactPreviousResult[]>([]);
  readonly selectionChange = output<ImpactPreviousResult[]>();

  readonly field = viewChild<ElementRef<HTMLElement>>('fieldRef');

  readonly open = signal(false);
  readonly items = signal<ImpactPreviousResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  readonly searchText = signal('');
  readonly portfolios = signal<PickerPortfolio[]>([]);
  readonly typeOptions = signal<PickerTypeOption[]>([]);
  readonly portfolioFilter = signal<number | string | null>(null);
  readonly typeFilter = signal<Array<number | string>>([]);

  readonly selectedIds = computed(() => new Set(this.selection().map(item => item.result_id)));
  readonly hasMore = computed(() => this.page() < this.totalPages());
  readonly announcement = computed(() => {
    if (this.loading()) return 'Loading results';
    if (this.error()) return 'Results could not be loaded';
    return `${this.total()} ${this.total() === 1 ? 'result' : 'results'} found`;
  });

  private query = '';
  private loaded = false;
  private lastRequest: LoadRequest = { page: 1, append: false };
  private readonly typing$ = new Subject<string>();
  private readonly load$ = new Subject<LoadRequest>();

  constructor() {
    // One request per typing burst: debounced, and only when it differs from the query already APPLIED (not from the
    // last raw string seen), so Reset / clear-search can never leave a later identical query suppressed.
    this.typing$
      .pipe(
        debounceTime(PICKER_SEARCH_DEBOUNCE_MS),
        filter(query => query.trim() !== this.query),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(query => {
        this.query = query.trim();
        this.load(1, false);
      });

    // `switchMap` cancels the in-flight request, so a stale response (append or not) never overwrites a newer one.
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(request =>
          this.api.resultsSE.GET_impactPreviousResultsSearch(this.buildParams(request.page)).pipe(
            map(result => ({ request, result })),
            catchError(() => of({ request, result: null }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ request, result }) => {
        this.loading.set(false);
        if (!result) {
          this.error.set(true);
          if (!request.append) this.items.set([]);
          return;
        }
        const response = result.response;
        const incoming = response?.items ?? [];
        this.items.update(list => (request.append ? [...list, ...incoming] : incoming));
        this.page.set(request.page);
        this.total.set(response?.meta?.total ?? 0);
        this.totalPages.set(response?.meta?.totalPages ?? 0);
      });
  }

  buildParams(page: number): ImpactPreviousResultsSearchParams {
    return {
      q: this.query,
      portfolioId: this.portfolioFilter(),
      typeIds: this.typeFilter(),
      excludeResultId: this.resultId(),
      page,
      limit: PICKER_PAGE_LIMIT
    };
  }

  /** Field click toggles; the first open triggers the first E5 call and the filter catalogs (design §6.1). */
  toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    this.open.set(true);
    if (this.loaded) return;
    this.loaded = true;
    this.loadFilterOptions();
    this.load(1, false);
  }

  /** Lets the page park focus on the field when the control that had it is removed (IPD-R-3). */
  focusField(): void {
    this.field()?.nativeElement.focus();
  }

  close(focusField = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (focusField) this.field()?.nativeElement.focus();
  }

  onEscape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.close(true);
  }

  onDocumentClick(event: Event): void {
    if (!this.open()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;
    // Focus goes back to the field only when it would otherwise be lost (inside the panel, or already on <body>);
    // a control the user just clicked keeps it.
    const active = document.activeElement;
    const focusLost = !active || active === document.body || this.host.nativeElement.contains(active);
    this.close(focusLost);
  }

  /** Portfolio segments come from the distinct `obj_portfolio` of the versioning rows (IPD-A-1); types from the catalog (IPD-A-2). */
  private loadFilterOptions(): void {
    this.api.resultsSE
      .GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        const seen = new Map<number | string, PickerPortfolio>();
        ((result?.response ?? []) as any[]).forEach(phase => {
          const portfolio = phase?.obj_portfolio;
          if (portfolio?.id !== undefined && portfolio?.id !== null && !seen.has(portfolio.id)) seen.set(portfolio.id, { id: portfolio.id, acronym: portfolio.acronym });
        });
        this.portfolios.set([...seen.values()]);
      });

    this.api.resultsSE
      .GET_resultTypes()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => this.typeOptions.set((result?.response ?? []).map(type => ({ id: type.id, label: resultTypeFilterLabel(type.id, type.name) }))));
  }

  onQueryInput(value: string): void {
    this.searchText.set(value ?? '');
    this.typing$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchText.set('');
    this.query = '';
    this.load(1, false);
  }

  toggleType(id: number | string): void {
    this.typeFilter.update(list => (list.includes(id) ? list.filter(value => value !== id) : [...list, id]));
    this.load(1, false);
  }

  isTypeActive(id: number | string): boolean {
    return this.typeFilter().includes(id);
  }

  setPortfolio(id: number | string | null): void {
    this.portfolioFilter.set(id);
    this.load(1, false);
  }

  resetFilters(): void {
    this.searchText.set('');
    this.query = '';
    this.typeFilter.set([]);
    this.portfolioFilter.set(null);
    this.load(1, false);
  }

  retry(): void {
    if (this.loading()) return;
    this.load$.next(this.lastRequest);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.load(this.page() + 1, true);
  }

  isSelected(item: ImpactPreviousResult): boolean {
    return this.selectedIds().has(item.result_id);
  }

  /** Applies at once (IPD-A-3): emits the new array; nothing is stored until the section Save. */
  toggleItem(item: ImpactPreviousResult): void {
    const current = this.selection();
    this.selectionChange.emit(this.isSelected(item) ? current.filter(entry => entry.result_id !== item.result_id) : [...current, item]);
  }

  clearSelection(): void {
    this.selectionChange.emit([]);
  }

  private load(page: number, append: boolean): void {
    this.lastRequest = { page, append };
    this.load$.next(this.lastRequest);
  }
}
