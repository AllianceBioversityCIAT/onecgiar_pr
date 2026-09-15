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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideGlobe, lucideRefreshCw, lucideSplit, lucideTriangleAlert } from '@ng-icons/lucide';
import { catchError, debounceTime, defer, distinctUntilChanged, finalize, map, of, retry, Subject, Subscription, switchMap, tap, timer } from 'rxjs';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import {
  ALL_KP_REPOSITORIES,
  KP_ITEM_HOSTS,
  KP_REPOSITORIES,
  KpRepository,
  KpRepositoryMeta,
  KpRepositoryStatus,
  kpRepositoryLabel
} from './kp-repositories.constants';

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
  // @akili-spec changes/kp-multi-repository-browse — design §4.1 (additive)
  /** Repository the item came from; absent on legacy single-source responses. */
  repository?: KpRepository;
  // @akili-spec changes/kp-multi-repository-browse — design §4.1 / KPM-R-5 (additive)
  /** Secondary repositories collapsed into this card by dedup; empty/absent when no match. */
  alsoIn?: { repository: KpRepository; handle: string; handleUrl: string; itemUrl: string }[];
}

// @akili-spec changes/kp-multi-repository-browse — design §4.1
/** Per-repository outcome of one fan-out search (`sources[]` in the response body). */
export interface SourceStatusDto {
  repository: KpRepository;
  status: KpRepositoryStatus;
  total: number;
  hasMore: boolean;
}

// @akili-spec changes/kp-multi-repository-browse — KPM-DD-8
/** View model of one source-strip chip (`KPM-R-1`, `KPM-R-2`, `KPM-R-6`). */
export interface KpRepositoryChip {
  key: KpRepository;
  label: string;
  /** `aria-pressed` — the repository is part of the current search. */
  selected: boolean;
  /** `aria-disabled` — the only repository left; toggling it is a no-op (`KPM-R-2`). */
  disabled: boolean;
  /** The source answered with `timeout | error | unconfigured` (`KPM-R-6`). */
  unavailable: boolean;
  /** Status of the last response for this repository, `null` before any search. */
  status: KpRepositoryStatus | null;
  /** Count badge text: the source total, `'unavailable'`, or `null` before a search. */
  countLabel: string | null;
  /** Tooltip — the disabled reason, else the unavailable reason, else no attribute. */
  title: string | null;
}

/** `KPM-R-2` — accessible reason why the last selected chip cannot be turned off. */
export const KP_LAST_REPOSITORY_TITLE = 'At least one repository must stay selected';

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
  { label: 'Book', value: 'Book' },
  { label: 'Book Chapter', value: 'Book Chapter' },
  { label: 'Working Paper', value: 'Working Paper' },
  { label: 'Policy Brief', value: 'Policy Brief' },
  { label: 'Brief', value: 'Brief' },
  { label: 'Brochure', value: 'Brochure' },
  { label: 'Newsletter', value: 'Newsletter' },
  { label: 'Manual', value: 'Manual' },
  { label: 'Training Material', value: 'Training Material' },
  { label: 'Data Paper', value: 'Data Paper' },
  { label: 'Dataset', value: 'Dataset' },
  { label: 'Poster', value: 'Poster' },
  { label: 'Presentation', value: 'Presentation' },
  { label: 'Preprint', value: 'Preprint' },
  { label: 'Other', value: 'Other' }
];

export const CGIAR_CENTER_ACRONYMS: Record<string, string> = {
  'Africa Rice Center': 'AfricaRice',
  'Alliance of Bioversity International and CIAT': 'Alliance',
  'Alliance of Bioversity and CIAT': 'Alliance',
  'Bioversity International': 'Bioversity',
  'Center for International Forestry Research': 'CIFOR',
  'International Center for Agricultural Research in the Dry Areas': 'ICARDA',
  'International Center for Tropical Agriculture': 'CIAT',
  'International Crops Research Institute for the Semi-Arid Tropics': 'ICRISAT',
  'International Food Policy Research Institute': 'IFPRI',
  'International Institute of Tropical Agriculture': 'IITA',
  'International Livestock Research Institute': 'ILRI',
  'International Maize and Wheat Improvement Center': 'CIMMYT',
  'International Potato Center': 'CIP',
  'International Rice Research Institute': 'IRRI',
  'International Water Management Institute': 'IWMI',
  'World Agroforestry': 'ICRAF',
  'World Agroforestry Centre': 'ICRAF',
  'WorldFish': 'WorldFish',
  'System Office': 'SO'
};

export function formatCenterLabel(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // 1. Direct match in dictionary
  const exactAcronym = CGIAR_CENTER_ACRONYMS[trimmed];
  if (exactAcronym) {
    if (trimmed.startsWith(exactAcronym)) {
      return trimmed;
    }
    return `${exactAcronym} - ${trimmed}`;
  }

  // 2. Case-insensitive dictionary match
  const lower = trimmed.toLowerCase();
  for (const [fullName, acronym] of Object.entries(CGIAR_CENTER_ACRONYMS)) {
    if (lower === fullName.toLowerCase()) {
      if (trimmed.startsWith(acronym)) {
        return trimmed;
      }
      return `${acronym} - ${trimmed}`;
    }
  }

  // 3. If trimmed already has "ACRONYM - Name" format
  for (const acronym of Object.values(CGIAR_CENTER_ACRONYMS)) {
    if (trimmed.startsWith(`${acronym} - `) || trimmed.startsWith(`${acronym} (`)) {
      return trimmed;
    }
  }

  // 4. If the string is already just an acronym (e.g. 'CIAT', 'CIP', 'ICRAF', 'IRRI')
  for (const [fullName, acronym] of Object.entries(CGIAR_CENTER_ACRONYMS)) {
    if (trimmed.toUpperCase() === acronym.toUpperCase()) {
      return `${acronym} - ${fullName}`;
    }
  }

  // 5. Parentheses format: "Name (ACRONYM)" -> "ACRONYM - Name"
  const parenMatch = trimmed.match(/^(.+?)\s*\(([A-Za-z0-9\s/-]{2,12})\)$/);
  if (parenMatch) {
    const namePart = parenMatch[1].trim();
    const acronymPart = parenMatch[2].trim();
    return `${acronymPart} - ${namePart}`;
  }

  return trimmed;
}

export const DEFAULT_CGSPACE_CENTERS: FacetOption[] = [
  { label: 'AfricaRice - Africa Rice Center', value: 'Africa Rice Center' },
  { label: 'Alliance - Alliance of Bioversity International and CIAT', value: 'Alliance of Bioversity International and CIAT' },
  { label: 'Bioversity - Bioversity International', value: 'Bioversity International' },
  { label: 'CIFOR - Center for International Forestry Research', value: 'Center for International Forestry Research' },
  { label: 'ICARDA - International Center for Agricultural Research in the Dry Areas', value: 'International Center for Agricultural Research in the Dry Areas' },
  { label: 'CIAT - International Center for Tropical Agriculture', value: 'International Center for Tropical Agriculture' },
  { label: 'ICRISAT - International Crops Research Institute for the Semi-Arid Tropics', value: 'International Crops Research Institute for the Semi-Arid Tropics' },
  { label: 'IFPRI - International Food Policy Research Institute', value: 'International Food Policy Research Institute' },
  { label: 'IITA - International Institute of Tropical Agriculture', value: 'International Institute of Tropical Agriculture' },
  { label: 'ILRI - International Livestock Research Institute', value: 'International Livestock Research Institute' },
  { label: 'CIMMYT - International Maize and Wheat Improvement Center', value: 'International Maize and Wheat Improvement Center' },
  { label: 'CIP - International Potato Center', value: 'International Potato Center' },
  { label: 'IRRI - International Rice Research Institute', value: 'International Rice Research Institute' },
  { label: 'IWMI - International Water Management Institute', value: 'International Water Management Institute' },
  { label: 'ICRAF - World Agroforestry', value: 'World Agroforestry' },
  { label: 'WorldFish', value: 'WorldFish' }
];

@Component({
  selector: 'app-kp-cgspace-browse',
  imports: [CommonModule, FormsModule, CustomFieldsModule, NgIcon],
  templateUrl: './kp-cgspace-browse.component.html',
  styleUrls: ['./kp-cgspace-browse.component.scss'],
  // Client guide rule 21: every new icon in this component comes from @ng-icons/lucide.
  providers: [provideIcons({ lucideCircleCheck, lucideGlobe, lucideRefreshCw, lucideSplit, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpCgspaceBrowseComponent implements OnInit, OnDestroy {
  readonly resultsApiSE = inject(ResultsApiService);

  // @akili-spec changes/kp-cgspace-search-retry
  /** KCSR-DD-1: one initial call + two re-subscriptions = three total HTTP calls. */
  static readonly RETRY_COUNT = 2;
  /** KCSR-DD-2: production delay between retry attempts (ms). Override in tests. */
  retryDelayMs = 600;

  // Inputs
  readonly busy = input<boolean>(false);
  /** When false, the parent paints the full-pane overlay (e.g. indicator drawer) — keep busy for disables only. */
  readonly showBusyOverlay = input<boolean>(true);
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
  // @akili-spec changes/kp-multi-repository-browse — KPM-R-20
  /** `page.hasMore` of the last response; drives *Load more* visibility (never `items().length < total()`). */
  readonly hasMore = signal<boolean>(false);
  /** Repository label of the item currently being retrieved, for the busy overlay (`design.md` §6.2). */
  readonly selectingRepositoryLabel = signal<string | null>(null);

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-1 / KPM-R-2 / KPM-R-6
  /** Every repository, in merge priority order — the strip renders one chip per entry. */
  readonly allRepositories = ALL_KP_REPOSITORIES;
  /** Repositories included in the next search. Init = all three (`KPM-R-1`, `KPM-AC-1`). */
  readonly selectedRepositories = signal<KpRepository[]>([...ALL_KP_REPOSITORIES]);
  /** `sources[]` of the last search response; empty before the first one (`KPM-R-6`). */
  readonly sources = signal<SourceStatusDto[]>([]);

  readonly typeOptions = signal<FacetOption[]>(DEFAULT_CGSPACE_TYPES);
  readonly centerOptions = signal<FacetOption[]>(DEFAULT_CGSPACE_CENTERS);
  readonly loadingTypes = signal<boolean>(false);
  readonly loadingCenters = signal<boolean>(false);

  readonly adminYearOptions = computed<YearOption[]>(() => {
    const current = this.phaseYear();
    const options: YearOption[] = [];
    for (let y = current; y >= current - 10; y--) {
      options.push({ label: String(y), value: y });
    }
    return options;
  });

  // @akili-spec changes/kp-multi-repository-browse — KPM-DD-8
  /** One view model per chip: selection, count, unavailable state and the last-chip lock. */
  readonly repositoryChips = computed<KpRepositoryChip[]>(() => {
    const selected = this.selectedRepositories();
    const sources = this.sources();
    const isLastSelected = selected.length === 1;

    return this.allRepositories.map(key => {
      const meta = KP_REPOSITORIES[key];
      const isSelected = selected.includes(key);
      const source = isSelected ? sources.find(s => s.repository === key) : undefined;
      const status = source?.status ?? null;
      // KPM-R-6: a failed source reads "unavailable", never "0".
      const unavailable = status !== null && status !== 'ok';
      const disabled = isSelected && isLastSelected;

      let countLabel: string | null = null;
      if (unavailable) {
        countLabel = 'unavailable';
      } else if (status === 'ok' && source) {
        countLabel = String(source.total ?? 0);
      }

      let title: string | null = null;
      if (disabled) {
        title = KP_LAST_REPOSITORY_TITLE;
      } else if (unavailable) {
        title = this.unavailableReason(meta.label, status as KpRepositoryStatus);
      }

      return { key, label: meta.label, selected: isSelected, disabled, unavailable, status, countLabel, title };
    });
  });

  /** KPM-R-6: the tooltip names the state without leaking hosts or env vars (`AC-9`). */
  private unavailableReason(label: string, status: KpRepositoryStatus): string {
    switch (status) {
      case 'timeout':
        return `${label} did not respond in time. Results below exclude it.`;
      case 'unconfigured':
        return `${label} is not available right now. Results below exclude it.`;
      default:
        return `${label} returned an error. Results below exclude it.`;
    }
  }

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-7 / KPM-R-23
  /** `kpRepositoryLabel` exposed as a bound method so the template can call it directly. */
  readonly kpRepositoryLabel = kpRepositoryLabel;

  /** Display metadata (badge/dot classes, label) for one repository key, `undefined` when absent. */
  repoMeta(key?: KpRepository | string | null): KpRepositoryMeta | undefined {
    return key ? KP_REPOSITORIES[key as KpRepository] : undefined;
  }

  /** Selected repositories whose last response failed (`timeout | error | unconfigured`), KPM-R-7. */
  readonly failedSources = computed<SourceStatusDto[]>(() => {
    const selected = this.selectedRepositories();
    return this.sources().filter(source => selected.includes(source.repository) && source.status !== 'ok');
  });

  /** `<Repo> a · <Repo> b …` over the selected repositories that answered `ok` (`KPM-R-4`). */
  private readonly answeredSourcesText = computed<string>(() => {
    const selected = this.selectedRepositories();
    return this.sources()
      .filter(source => selected.includes(source.repository) && source.status === 'ok')
      .map(source => `${kpRepositoryLabel(source.repository)} ${source.total}`)
      .join(' · ');
  });

  /** `Showing N of M items · <Repo> a · <Repo> b …` — the exact counter copy (`KPM-R-4`, `KPM-R-11`). */
  readonly resultsCounterText = computed<string>(() => {
    const base = `Showing ${this.items().length} of ${this.total()} items`;
    const answered = this.answeredSourcesText();
    return answered ? `${base} · ${answered}` : base;
  });

  /** Natural-language join ("A", "A and B", "A, B and C") for the error/empty copy (`KPM-R-7`, `KPM-R-11`). */
  private formatRepositoryList(labels: string[]): string {
    if (labels.length === 0) return '';
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  }

  /** All currently selected repositories, named — the error state MUST name them (`KPM-R-7`, `KPM-AC-8`). */
  readonly selectedRepositoriesText = computed<string>(() =>
    this.formatRepositoryList(this.selectedRepositories().map(key => kpRepositoryLabel(key)))
  );

  /** The failed repositories, named — the partial notice MUST name them, never a CSS class alone (`KPM-R-7`). */
  readonly failedRepositoriesText = computed<string>(() =>
    this.formatRepositoryList(this.failedSources().map(source => kpRepositoryLabel(source.repository)))
  );

  /** Design §7 / §6.2 / `KPM-DD-10`: View details may only open these four exact hosts. */
  readonly ALLOWED_HOSTS: readonly string[] = KP_ITEM_HOSTS;

  /** Minimum free-text length before a query is sent upstream (R-2, AC-8). */
  readonly MIN_QUERY_LENGTH = 3;

  private readonly searchTrigger$ = new Subject<{ page: number; append: boolean; immediate: boolean }>();
  private searchSubscription?: Subscription;

  /** Center prefix type-ahead (design §4.1): debounced facet reload with `prefix`. */
  readonly centerSearch = signal<string>('');
  readonly selectingItem = signal<string | null>(null);
  private readonly centerPrefix$ = new Subject<string>();
  private centerPrefixSubscription?: Subscription;

  // @akili-spec changes/kp-multi-repository-browse — design §6.2
  /** Repository-selection changes reload the facet unions under the same 400 ms debounce. */
  private readonly facetReload$ = new Subject<string>();
  private facetReloadSubscription?: Subscription;

  constructor() {
    effect(() => {
      if (!this.busy()) {
        this.selectingItem.set(null);
        this.selectingRepositoryLabel.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.selectedYear.set(this.phaseYear());
    this.loadFacets();
    this.initCenterTypeAhead();
    this.initFacetReloadPipeline();
    this.initSearchPipeline();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.centerPrefixSubscription?.unsubscribe();
    this.facetReloadSubscription?.unsubscribe();
  }

  private mapFacetValues(res: any): FacetOption[] {
    const raw = res?.response?.values ?? res?.response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      label: v.label || v.value || v.name || String(v),
      value: v.value || v.name || String(v)
    }));
  }

  private mapCenterFacetValues(res: any): FacetOption[] {
    const raw = res?.response?.values ?? res?.response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => {
      const val = v.value || v.name || v.label || String(v);
      const label = v.label || v.name || v.value || String(v);
      return {
        label: formatCenterLabel(label),
        value: val
      };
    });
  }

  private initFacetReloadPipeline(): void {
    this.facetReloadSubscription = this.facetReload$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadFacets());
  }

  private initCenterTypeAhead(): void {
    this.centerPrefixSubscription = this.centerPrefix$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.loadingCenters.set(true)),
        switchMap(prefix =>
          this.resultsApiSE
            .GET_cgspaceFacet('affiliation', prefix || undefined, 100, this.selectedRepositories())
            .pipe(
              finalize(() => this.loadingCenters.set(false)),
              catchError(() => of(null))
            )
        )
      )
      .subscribe(res => {
        if (res) this.centerOptions.set(this.mapCenterFacetValues(res));
      });
  }

  onCenterSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.centerSearch.set(target.value);
    this.centerPrefix$.next((target.value || '').trim());
  }

  private loadFacets(): void {
    // KPM-R-9: the option lists are the union over the selected repositories.
    const repositories = this.selectedRepositories();

    this.loadingTypes.set(true);
    this.resultsApiSE
      .GET_cgspaceFacet('itemtype', undefined, undefined, repositories)
      .pipe(
        finalize(() => this.loadingTypes.set(false)),
        catchError(() => of(null))
      )
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

    this.loadingCenters.set(true);
    this.resultsApiSE
      .GET_cgspaceFacet('affiliation', undefined, undefined, repositories)
      .pipe(
        finalize(() => this.loadingCenters.set(false)),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        const raw = res?.response?.values ?? res?.response ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
          this.centerOptions.set(this.mapCenterFacetValues(res));
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

          // @akili-spec changes/kp-cgspace-search-retry
          return defer(() => this.resultsApiSE.GET_cgspaceSearch(params)).pipe(
            map(res => {
              // KCSR-R-1: proxy returns HTTP 200 with body { status: 502 } — treat as failure
              const bodyStatus: number | undefined = (res as any)?.response?.status ?? (res as any)?.response?.statusCode ?? (res as any)?.status ?? (res as any)?.statusCode;
              if (bodyStatus !== undefined && bodyStatus >= 400) {
                throw new Error(`Repository proxy error: ${bodyStatus}`);
              }
              return res;
            }),
            retry({
              count: KpCgspaceBrowseComponent.RETRY_COUNT,
              delay: () => timer(this.retryDelayMs)
            }),
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
          this.sources.set([]);
          this.hasMore.set(false);
          return;
        }

        // KPM-R-6: chip counts and unavailable states come from every response's sources[].
        const sources: unknown = res?.response?.sources;
        this.sources.set(Array.isArray(sources) ? (sources as SourceStatusDto[]) : []);
        // KPM-R-20: *Load more* renders iff the last response reports page.hasMore.
        this.hasMore.set(Boolean(res?.response?.page?.hasMore));

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
    // KPM-R-3 / KPM-R-8: one request covers every selected repository (comma-joined).
    const params: Record<string, any> = { page, size: 10, repository: this.selectedRepositories().join(',') };

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
      this.sources.set([]);
      return;
    }
    this.searchTrigger$.next({ page: 0, append: false, immediate: false });
  }

  onFilterChange(): void {
    if (!this.canSearch()) {
      this.status.set('idle');
      this.items.set([]);
      this.total.set(0);
      this.sources.set([]);
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

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-2 / KPM-AC-2 / KPM-AC-3
  /**
   * Toggle one repository. The last selected one is an invariant, not a disabled button:
   * a click on it changes nothing and issues no request (`KPM-AC-3`).
   */
  toggleRepository(key: KpRepository): void {
    const selected = this.selectedRepositories();
    const isSelected = selected.includes(key);

    if (isSelected && selected.length === 1) {
      return;
    }

    const next = isSelected
      ? selected.filter(repository => repository !== key)
      : this.allRepositories.filter(repository => selected.includes(repository) || repository === key);

    this.selectedRepositories.set(next);
    this.onRepositorySelectionChange();
  }

  /** KPM-R-2: restores the three repositories and re-runs the search once. */
  selectAllRepositories(): void {
    if (this.selectedRepositories().length === this.allRepositories.length) {
      return;
    }
    this.selectedRepositories.set([...this.allRepositories]);
    this.onRepositorySelectionChange();
  }

  /**
   * A selection change reloads the facet unions and re-runs the current search through
   * the existing debounce / identical-params pipeline. With `canSearch()` false,
   * `onFilterChange()` only resets the panel to idle — the strip is the sole update.
   */
  private onRepositorySelectionChange(): void {
    this.facetReload$.next(this.selectedRepositories().join(','));
    this.onFilterChange();
  }

  onEnter(): void {
    if (!this.canSearch()) {
      return;
    }
    this.runSearch(0, false);
  }

  /**
   * Re-sends the full current selection at page 0 with the same params — used by the error-state
   * "Try again" button AND by each per-repository "Retry <repo>" button in the partial notice
   * (`KPM-R-7`, `design.md` §6.2). The server serves healthy sources from cache, so only the
   * failed source is re-queried; there is no per-repository request from the client.
   */
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
      this.sources.set([]);
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
    // KPM-R-11: the busy overlay names the item's own repository, never a hardcoded one.
    this.selectingRepositoryLabel.set(kpRepositoryLabel(item.repository) || null);
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
