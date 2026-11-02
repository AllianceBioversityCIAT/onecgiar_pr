// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-4, design §6.3, IRD-DD-4)
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';
import { HlmInput } from '@spartan/input';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { ImpactPreviousResult, ImpactPreviousResultsSearchParams } from '../../../../../../../../../shared/interfaces/impact-level.interface';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../../../../shared/enum/api.enum';
import { resultTypeFilterLabel } from '../../../../../../../../../shared/utils/impact-result.util';
import { PrFilterSelectComponent } from '../../../../../../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { PrFilterMultiselectModule } from '../../../../../../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';

/** Passed through `HlmDialogService.open(..., { context })` (it cannot bind `@Input()`s). */
export interface PreviousResultsPickerContext {
  /** Sent as `excludeResultId`: the current result is never offered. */
  resultId: number | string | null;
  /** The page's current list; copied into the dialog's working selection. */
  initialSelection: ImpactPreviousResult[];
}

/** Dialog result: the working selection on Done, `undefined` on Cancel / Escape. */
export type PreviousResultsPickerResult = ImpactPreviousResult[] | undefined;

export const PICKER_PAGE_LIMIT = 20;
export const PICKER_SEARCH_DEBOUNCE_MS = 300;
export const PICKER_ALL_PHASES = 'all';

interface FilterOption {
  value: number | string;
  label: string;
}

/**
 * Phase option label with its portfolio ("P25 · Reporting 2025 - (Open)"), so the user can see and choose the
 * portfolio (IRD-R-6, IRD-A-3). `obj_portfolio` comes with the versioning rows; without it the plain phase label is kept.
 */
export function phaseOptionLabel(phase: any): string {
  const base = phase?.phase_name_status ?? phase?.phase_name;
  const acronym = phase?.obj_portfolio?.acronym;
  return acronym ? `${acronym} · ${base}` : base;
}

/**
 * Previous-results picker (R-6). Spartan dialog content: CDK gives the focus trap, autofocus and focus
 * restore. The selection is a working copy; the page list is replaced only on Done.
 */
@Component({
  selector: 'app-previous-results-picker',
  standalone: true,
  imports: [FormsModule, HlmButton, HlmInput, HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, PrFilterSelectComponent, PrFilterMultiselectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './previous-results-picker.component.html'
})
export class PreviousResultsPickerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialogRef = inject(BrnDialogRef<PreviousResultsPickerResult>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = injectBrnDialogContext<PreviousResultsPickerContext>({ optional: true });

  readonly pageLimit = PICKER_PAGE_LIMIT;

  readonly items = signal<ImpactPreviousResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  readonly phaseOptions = signal<FilterOption[]>([{ value: PICKER_ALL_PHASES, label: 'All phases' }]);
  readonly typeOptions = signal<FilterOption[]>([]);
  readonly versionFilter = signal<number | string>(PICKER_ALL_PHASES);
  readonly typeFilter = signal<Array<number | string>>([]);

  /** Working selection, edited here; emitted on Done. */
  readonly selection = signal<ImpactPreviousResult[]>([]);
  readonly selectedIds = computed(() => new Set(this.selection().map(item => item.result_id)));

  readonly hasPrev = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() < this.totalPages());
  readonly announcement = computed(() => {
    if (this.loading()) return 'Loading results';
    if (this.error()) return 'Results could not be loaded';
    return `${this.total()} ${this.total() === 1 ? 'result' : 'results'} found`;
  });

  private query = '';
  private readonly typing$ = new Subject<string>();
  private readonly load$ = new Subject<void>();

  ngOnInit(): void {
    this.selection.set([...(this.context?.initialSelection ?? [])]);

    // One request per typing burst: debounced, distinct, and a new query goes back to page 1.
    this.typing$.pipe(debounceTime(PICKER_SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(query => {
      this.query = query.trim();
      this.page.set(1);
      this.load$.next();
    });

    // `switchMap` cancels the in-flight request, so a stale response can never overwrite a newer one.
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(() =>
          this.api.resultsSE.GET_impactPreviousResultsSearch(this.buildParams()).pipe(
            catchError(() => {
              this.error.set(true);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        this.loading.set(false);
        if (!result) {
          this.items.set([]);
          return;
        }
        const response = result.response;
        this.items.set(response?.items ?? []);
        this.total.set(response?.meta?.total ?? 0);
        this.totalPages.set(response?.meta?.totalPages ?? 0);
      });

    this.loadFilterOptions();
    this.load$.next();
  }

  buildParams(): ImpactPreviousResultsSearchParams {
    const version = this.versionFilter();
    return {
      q: this.query,
      versionId: version === PICKER_ALL_PHASES ? null : version,
      typeIds: this.typeFilter(),
      excludeResultId: this.context?.resultId ?? null,
      page: this.page(),
      limit: PICKER_PAGE_LIMIT
    };
  }

  /** Phase options come from versioning (IRD-A-3); the type filter from the plain result types catalog. A failure here only empties that filter. */
  private loadFilterOptions(): void {
    this.api.resultsSE
      .GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        const phases: any[] = result?.response ?? [];
        this.phaseOptions.set([{ value: PICKER_ALL_PHASES, label: 'All phases' }, ...phases.map(phase => ({ value: phase.id, label: phaseOptionLabel(phase) }))]);
      });

    this.api.resultsSE
      .GET_resultTypes()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => this.typeOptions.set((result?.response ?? []).map(type => ({ value: type.id, label: resultTypeFilterLabel(type.id, type.name) }))));
  }

  onQueryInput(value: string): void {
    this.typing$.next(value ?? '');
  }

  onVersionChange(value: number | string): void {
    this.versionFilter.set(value ?? PICKER_ALL_PHASES);
    this.reload();
  }

  onTypesChange(values: Array<number | string>): void {
    this.typeFilter.set(values ?? []);
    this.reload();
  }

  retry(): void {
    this.load$.next();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load$.next();
  }

  isSelected(item: ImpactPreviousResult): boolean {
    return this.selectedIds().has(item.result_id);
  }

  /** A result already in the working selection cannot be added again (Scenario 6.4). */
  add(item: ImpactPreviousResult): void {
    if (this.isSelected(item)) return;
    this.selection.update(list => [...list, item]);
  }

  remove(resultId: number): void {
    this.selection.update(list => list.filter(item => item.result_id !== resultId));
  }

  done(): void {
    this.dialogRef.close(this.selection());
  }

  /**
   * IRD-T-8 F-5. The shared filter dropdowns (`.custom_select`) are open while focus is inside them, and a
   * keydown bubbling out of one reaches the CDK dialog's Escape handler on <body>. While one is open, Escape only
   * closes it (blur) and is swallowed; with none open it propagates and the dialog closes (Cancel semantics).
   */
  onEscape(event: Event): void {
    const active = document.activeElement as HTMLElement | null;
    const target = event.target as HTMLElement | null;
    const dropdown = (target?.closest?.('.custom_select') ?? active?.closest?.('.custom_select')) as HTMLElement | null;
    if (!dropdown) return;
    event.stopPropagation();
    if (active && dropdown.contains(active)) active.blur();
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  /** A filter change is a new query: back to page 1. */
  private reload(): void {
    this.page.set(1);
    this.load$.next();
  }
}
