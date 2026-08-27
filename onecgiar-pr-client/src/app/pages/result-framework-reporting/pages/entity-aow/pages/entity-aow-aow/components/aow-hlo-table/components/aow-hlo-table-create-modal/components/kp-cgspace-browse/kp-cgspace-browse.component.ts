import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, Subscription, switchMap, timer } from 'rxjs';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';

export interface CgspaceItemDto {
  uuid: string;
  handle: string;
  handleUrl: string;
  itemUrl: string;
  title: string;
  type: string;
  year: number | null;
  authors: string[];
  affiliations: string[];
  countries: string[];
  doi: string | null;
  uri: string;
}

export interface FacetOption {
  label: string;
  value: string;
}

export interface YearOption {
  label: string;
  value: number;
}

export const DEFAULT_CGSPACE_TYPES: FacetOption[] = [
  { label: 'Journal Article', value: 'Journal Article' },
  { label: 'Report', value: 'Report' },
  { label: 'Brief', value: 'Brief' },
  { label: 'Book Chapter', value: 'Book Chapter' },
  { label: 'Working Paper', value: 'Working Paper' },
  { label: 'Conference Paper', value: 'Conference Paper' },
  { label: 'Book', value: 'Book' },
  { label: 'Policy Brief', value: 'Policy Brief' },
  { label: 'Technical Report', value: 'Technical Report' },
  { label: 'Manual', value: 'Manual' },
  { label: 'Data Paper', value: 'Data Paper' },
  { label: 'Dataset', value: 'Dataset' },
  { label: 'Poster', value: 'Poster' },
  { label: 'Presentation', value: 'Presentation' },
  { label: 'Preprint', value: 'Preprint' },
  { label: 'Other', value: 'Other' }
];

export const DEFAULT_CGSPACE_CENTERS: FacetOption[] = [
  { label: 'Africa Rice Center', value: 'Africa Rice Center' },
  { label: 'Alliance of Bioversity International and CIAT', value: 'Alliance of Bioversity International and CIAT' },
  { label: 'Bioversity International', value: 'Bioversity International' },
  { label: 'Center for International Forestry Research', value: 'Center for International Forestry Research' },
  { label: 'International Center for Agricultural Research in the Dry Areas', value: 'International Center for Agricultural Research in the Dry Areas' },
  { label: 'International Center for Tropical Agriculture', value: 'International Center for Tropical Agriculture' },
  { label: 'International Crops Research Institute for the Semi-Arid Tropics', value: 'International Crops Research Institute for the Semi-Arid Tropics' },
  { label: 'International Food Policy Research Institute', value: 'International Food Policy Research Institute' },
  { label: 'International Institute of Tropical Agriculture', value: 'International Institute of Tropical Agriculture' },
  { label: 'International Livestock Research Institute', value: 'International Livestock Research Institute' },
  { label: 'International Maize and Wheat Improvement Center', value: 'International Maize and Wheat Improvement Center' },
  { label: 'International Potato Center', value: 'International Potato Center' },
  { label: 'International Rice Research Institute', value: 'International Rice Research Institute' },
  { label: 'International Water Management Institute', value: 'International Water Management Institute' },
  { label: 'World Agroforestry', value: 'World Agroforestry' },
  { label: 'WorldFish', value: 'WorldFish' }
];

@Component({
  selector: 'app-kp-cgspace-browse',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './kp-cgspace-browse.component.html',
  styleUrls: ['./kp-cgspace-browse.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpCgspaceBrowseComponent implements OnInit, OnDestroy {
  readonly resultsApiSE = inject(ResultsApiService);

  // Inputs
  readonly busy = input<boolean>(false);
  readonly phaseYear = input<number>(new Date().getFullYear());
  readonly isAdmin = input<boolean>(false);

  // Outputs
  readonly itemSelected = output<CgspaceItemDto>();
  readonly switchToManual = output<void>();

  // State Signals
  readonly query = signal<string>('');
  readonly selectedType = signal<string | null>(null);
  readonly selectedCenter = signal<string | null>(null);
  readonly selectedYear = signal<number | string | null>(null);
  readonly items = signal<CgspaceItemDto[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(0);
  readonly status = signal<'idle' | 'loading' | 'empty' | 'error' | 'results'>('idle');
  readonly loadingMore = signal<boolean>(false);

  readonly typeOptions = signal<FacetOption[]>([]);
  readonly centerOptions = signal<FacetOption[]>([]);

  readonly adminYearOptions = computed<YearOption[]>(() => {
    const current = this.phaseYear();
    const options: YearOption[] = [];
    for (let y = current; y >= current - 10; y--) {
      options.push({ label: String(y), value: y });
    }
    return options;
  });

  /** Design §7 / §6.2: View details may only open these hosts. */
  readonly ALLOWED_HOSTS = ['cgspace.cgiar.org', 'hdl.handle.net'];

  /** Minimum free-text length before a query is sent upstream (R-2, AC-8). */
  readonly MIN_QUERY_LENGTH = 3;

  private readonly searchTrigger$ = new Subject<{ page: number; append: boolean; immediate: boolean }>();
  private searchSubscription?: Subscription;

  /** Center prefix type-ahead (design §4.1): debounced facet reload with `prefix`. */
  readonly centerSearch = signal<string>('');
  readonly selectingItem = signal<string | null>(null);
  private readonly centerPrefix$ = new Subject<string>();
  private centerPrefixSubscription?: Subscription;

  constructor() {
    effect(() => {
      if (!this.busy()) {
        this.selectingItem.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.selectedYear.set(this.phaseYear());
    this.loadFacets();
    this.initCenterTypeAhead();
    this.initSearchPipeline();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.centerPrefixSubscription?.unsubscribe();
  }

  private mapFacetValues(res: any): FacetOption[] {
    const raw = res?.response?.values ?? res?.response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      label: v.label || v.value || v.name || String(v),
      value: v.value || v.name || String(v)
    }));
  }

  private initCenterTypeAhead(): void {
    this.centerPrefixSubscription = this.centerPrefix$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(prefix =>
          this.resultsApiSE
            .GET_cgspaceFacet('affiliation', prefix || undefined, 100)
            .pipe(catchError(() => of(null)))
        )
      )
      .subscribe(res => {
        if (res) this.centerOptions.set(this.mapFacetValues(res));
      });
  }

  onCenterSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.centerSearch.set(target.value);
    this.centerPrefix$.next((target.value || '').trim());
  }

  private loadFacets(): void {
    this.resultsApiSE
      .GET_cgspaceFacet('itemtype')
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        const raw = res?.response?.values ?? res?.response ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
          this.typeOptions.set(
            raw.map((v: any) => ({
              label: v.label || v.value || v.name || String(v),
              value: v.value || v.name || String(v)
            }))
          );
        } else if (this.typeOptions().length === 0) {
          this.typeOptions.set(DEFAULT_CGSPACE_TYPES);
        }
      });

    this.resultsApiSE
      .GET_cgspaceFacet('affiliation')
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        const raw = res?.response?.values ?? res?.response ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
          this.centerOptions.set(
            raw.map((v: any) => ({
              label: v.label || v.value || v.name || String(v),
              value: v.value || v.name || String(v)
            }))
          );
        } else if (this.centerOptions().length === 0) {
          this.centerOptions.set(DEFAULT_CGSPACE_CENTERS);
        }
      });
  }

  private initSearchPipeline(): void {
    this.searchSubscription = this.searchTrigger$
      .pipe(
        switchMap(req => {
          if (req.immediate) {
            return of(req);
          }
          return timer(400).pipe(map(() => req));
        }),
        map(req => ({ req, params: this.buildSearchParams(req.page) })),
        // Design §6.2: identical debounced params do not re-fire; an explicit Enter/Load more always runs.
        distinctUntilChanged(
          (prev, curr) => !curr.req.immediate && JSON.stringify(prev.params) === JSON.stringify(curr.params)
        ),
        switchMap(({ req, params }) => {
          if (!req.append) {
            this.status.set('loading');
          }
          this.page.set(req.page);

          return this.resultsApiSE.GET_cgspaceSearch(params).pipe(
            map(res => ({ res, req, error: null })),
            catchError(err => of({ res: null, req, error: err }))
          );
        })
      )
      .subscribe(({ res, req, error }) => {
        this.loadingMore.set(false);

        if (error || (res && res.status && res.status >= 400)) {
          this.status.set('error');
          this.items.set([]);
          this.total.set(0);
          return;
        }

        const items: CgspaceItemDto[] = res?.response?.items ?? [];
        const total: number =
          res?.response?.page?.totalElements ??
          res?.response?.total ??
          (items.length > 0 ? items.length : 0);

        if (items.length > 0) {
          this.status.set('results');
          if (req.append) {
            this.items.set([...this.items(), ...items]);
          } else {
            this.items.set(items);
          }
          this.total.set(total);
        } else {
          if (req.append) {
            // Reached end of pagination
          } else {
            this.status.set('empty');
            this.items.set([]);
            this.total.set(0);
          }
        }
      });
  }

  private buildSearchParams(page: number): Record<string, any> {
    const params: Record<string, any> = { page, size: 10 };

    const q = (this.query() || '').trim();
    // R-2 / AC-8: text shorter than MIN_QUERY_LENGTH is never sent upstream.
    if (q.length >= this.MIN_QUERY_LENGTH) {
      params['query'] = q;
    }

    if (this.selectedType()) {
      params['type'] = this.selectedType();
    }

    if (this.selectedCenter()) {
      params['center'] = this.selectedCenter();
    }

    if (!this.isAdmin()) {
      params['year'] = this.phaseYear();
    } else if (this.selectedYear() !== null && this.selectedYear() !== undefined && this.selectedYear() !== '') {
      params['year'] = this.selectedYear();
    }

    return params;
  }

  /**
   * An explicit filter chosen by the user: Type, Center, or (admin only) a Year that differs from the
   * default `phaseYear`. The admin default year is NOT a filter for the min-length rule (AC-8).
   */
  hasActiveFilter(): boolean {
    if (this.selectedType() !== null && this.selectedType() !== '') return true;
    if (this.selectedCenter() !== null && this.selectedCenter() !== '') return true;
    if (this.isAdmin() && this.selectedYear() !== this.phaseYear()) return true;
    return false;
  }

  /** Search runs when the text has ≥ 3 chars, or when it is empty and an explicit filter is set. */
  canSearch(): boolean {
    const q = (this.query() || '').trim();
    if (q.length >= this.MIN_QUERY_LENGTH) return true;
    if (q.length === 0 && this.hasActiveFilter()) return true;
    return false;
  }

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.query.set(target.value);
    this.onQueryChange();
  }

  onQueryChange(): void {
    if (!this.canSearch()) {
      this.status.set('idle');
      this.items.set([]);
      this.total.set(0);
      return;
    }
    this.searchTrigger$.next({ page: 0, append: false, immediate: false });
  }

  onFilterChange(): void {
    if (!this.canSearch()) {
      this.status.set('idle');
      this.items.set([]);
      this.total.set(0);
      return;
    }
    this.searchTrigger$.next({ page: 0, append: false, immediate: false });
  }

  onTypeSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedType.set(val);
    this.onFilterChange();
  }

  onCenterSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedCenter.set(val);
    this.onFilterChange();
  }

  onYearSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedYear.set(val);
    this.onFilterChange();
  }

  onEnter(): void {
    if (!this.canSearch()) {
      return;
    }
    this.runSearch(0, false);
  }

  retrySearch(): void {
    if (this.typeOptions().length === 0 || this.centerOptions().length === 0) {
      this.loadFacets();
    }
    if (!this.canSearch()) {
      return;
    }
    this.status.set('loading');
    this.runSearch(0, false);
  }

  runSearch(page: number = 0, append: boolean = false): void {
    if (!this.canSearch()) {
      this.status.set('idle');
      this.items.set([]);
      this.total.set(0);
      return;
    }
    this.searchTrigger$.next({ page, append, immediate: true });
  }

  loadMore(): void {
    if (this.loadingMore() || this.status() === 'loading') return;
    const nextPage = this.page() + 1;
    this.loadingMore.set(true);
    this.runSearch(nextPage, true);
  }

  onSelect(item: CgspaceItemDto): void {
    this.selectingItem.set(item.uuid || item.handle || null);
    this.itemSelected.emit(item);
  }

  formatAuthors(authors?: string[] | null): string {
    if (!authors || authors.length === 0) {
      return '';
    }
    if (authors.length === 1) {
      return authors[0];
    }
    return `${authors[0]} et al.`;
  }

  formatMeta(item: CgspaceItemDto): string {
    const parts: string[] = [];
    if (item.type) parts.push(item.type);
    if (item.year !== null && item.year !== undefined) parts.push(String(item.year));
    const authors = this.formatAuthors(item.authors);
    if (authors) parts.push(authors);
    if (item.affiliations && item.affiliations.length > 0 && item.affiliations[0]) {
      parts.push(item.affiliations[0]);
    }
    return parts.join(' · ');
  }

  openItemDetails(item: CgspaceItemDto): void {
    const urlString = item.itemUrl || item.uri || item.handleUrl;
    if (!urlString) return;

    try {
      const url = new URL(urlString);
      if (this.ALLOWED_HOSTS.includes(url.hostname)) {
        window.open(urlString, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL, do nothing
    }
  }
}
