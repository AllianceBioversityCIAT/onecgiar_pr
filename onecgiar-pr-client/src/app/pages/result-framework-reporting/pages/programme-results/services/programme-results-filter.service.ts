import { computed, Injectable, signal } from '@angular/core';
import { ProgrammeResultRow } from './programme-results.service';
import { sectionLabel } from './programme-results-section-labels';

/** The eight filter dimensions of the Results tab toolbar, left to right. */
export type ProgrammeResultsFilterDimension = 'search' | 'section' | 'phase' | 'status' | 'category' | 'origin' | 'center' | 'createdBy';

/** One entry of the chip row. `value` is what `clearChip()` needs to remove just this one. */
export interface ProgrammeResultsFilterChip {
  label: string;
  dimension: ProgrammeResultsFilterDimension;
  value: string;
}

/** A status counter pill: `{ statusId, statusName, count }`. */
export interface ProgrammeResultsStatusCount {
  statusId: number | null;
  statusName: string;
  count: number;
}

/** Plain snapshot of the filter state — lets the predicates stay pure functions. */
export interface ProgrammeResultsFilterState {
  searchText: string;
  selectedSections: string[];
  selectedPhase: string | null;
  selectedStatus: string | null;
  // @akili-spec changes/my-work-board (MWB-T-13) — the three dimensions the Results tab and the
  // My results board share are MULTI-value: OR within, AND across. `[]` is "no filter".
  selectedCategories: string[];
  selectedOrigins: string[];
  selectedCenters: string[];
  selectedCreatedBy: string | null;
}

/** Which dimensions to skip. Used for the status counters, which must ignore the status filter. */
export interface ProgrammeResultsFilterOptions {
  ignoreStatus?: boolean;
}

export function normalize(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim().toLowerCase();
}

// @akili-spec changes/my-work-board (MWB-T-13)
/**
 * `?category=a,b` → `['a', 'b']` — the comma-separated list shape every multi-value filter param
 * on this route uses (`?section=` first, now `?category=` / `?origin=` / `?center=` too).
 *
 * A SINGLE legacy value hydrates as a one-element array, which is what keeps the Overview →
 * Results deep links working unchanged (`sp-overview-echarts/results-tab-filter-deeplink`,
 * `RFD-*`, which emit one exact `category`/`origin`/`center`). Blanks are dropped and duplicates
 * collapsed so a hand-typed `?origin=W1/W2,,W1/W2` cannot produce two identical chips. Values are
 * kept RAW (never upper-cased): the predicates are case-insensitive, and the chip must echo what
 * the URL actually said.
 *
 * Lives here rather than on a page component because both hosts of these dimensions — the Results
 * tab and the My results board — bridge the same params and must not drift apart.
 */
export function parseListParam(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const value of raw.split(',')) {
    const trimmed = value.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

// @akili-spec changes/my-work-board (MWB-T-13)
/** `['a', 'b']` → `'a,b'`; an empty selection is `null`, which REMOVES the key under `merge`. */
export function joinListParam(values: readonly string[]): string | null {
  return values?.length ? values.join(',') : null;
}

// @akili-spec changes/my-work-board (MWB-T-13)
/** Order-sensitive list equality — the guard that keeps the URL hydrate from stomping state. */
export function sameListParam(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * The Results Framework's own indicator categories (P2-3312), in RF order, spelled as the
 * `result_type` values this payload actually carries.
 *
 * The ticket names them the way the RF does — "Number of innovations", "Number of knowledge
 * products", "Number of people trained (capacity sharing for development)", "Number of policies
 * influenced", "Number of actors using or benefiting from innovations", "Number of Policy
 * (Policy Change)". Those are INDICATOR names; this screen's Category column and Category filter
 * both render `result_type`, so the list is kept in `result_type` language or the dropdown would
 * stop agreeing with the column beside it. The two policy indicators collapse onto the single
 * `Policy change` result type, which is why six RF names map to five entries here.
 *
 * Everything else the endpoint can return — `Capacity change`, `Other outcome`, `Other output`,
 * `Impact contribution` (result_type_id 3, 4, 8, 9; verified live on prtest 2026-08-28 over all
 * 6135 rows) — is not an RF category and is offered as the single `Other` bucket below.
 */
export const STANDARD_RF_CATEGORIES: readonly string[] = [
  'Innovation development',
  'Knowledge product',
  'Capacity sharing for development',
  'Policy change',
  'Innovation use'
];

/**
 * Sentinel held by `selectedCategory` when the "Other" bucket is picked. Deliberately not a
 * human string: it also travels in the `category` query param, where it must never collide with
 * a real `result_type` name.
 */
export const PROGRAMME_RESULTS_OTHER_CATEGORY = '__other__';

/** What the "Other" bucket is called in the dropdown and in its chip. */
export const PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL = 'Other';

/** True when `value` is one of the RF categories above. Case- and whitespace-insensitive. */
export function isStandardRfCategory(value: unknown): boolean {
  const needle = normalize(value);
  return !!needle && STANDARD_RF_CATEGORIES.some(name => normalize(name) === needle);
}

/**
 * Category predicate. Split out of `matchesProgrammeResultFilters` because it is the one
 * dimension with two modes: an exact `result_type` match, or the `Other` bucket, which passes
 * every row whose category is NOT an RF one.
 */
export function matchesProgrammeResultCategory(row: ProgrammeResultRow, selectedCategory: string | null): boolean {
  if (!selectedCategory) return true;
  if (selectedCategory === PROGRAMME_RESULTS_OTHER_CATEGORY) return !isStandardRfCategory(row?.category);
  return normalize(selectedCategory) === normalize(row?.category);
}

/**
 * The Category dropdown's options (P2-3312): the RF categories that some row actually has, in RF
 * order, then a single `Other` bucket when any non-RF row exists. Nothing is hidden from the
 * TABLE by this — the Category column still prints the real `result_type`, and `Other` selects
 * every non-RF row at once.
 *
 * `presentCategories` is `ProgrammeResultsService.categoryOptions()` (the values this programme
 * actually reported), so a category no row has is never offered — the labels come from the
 * payload rather than from the constant, keeping the dropdown's casing identical to the column's.
 *
 * `selectedCategory` is threaded in for one case: the Overview tab deep-links here with an exact
 * `category=<result_type>` (`dashboard-lab.component.ts` heatmap/card links), and that value can
 * be a non-RF one. Dropping it from the options would leave the pill showing its placeholder
 * while the table was demonstrably filtered, so exactly that one value stays selectable.
 */
export function buildCategoryFilterOptions(
  presentCategories: readonly string[],
  selectedCategory: string | null
): { value: string; label: string }[] {
  const present = (presentCategories ?? []).filter(Boolean);

  const options = STANDARD_RF_CATEGORIES.map(standard => present.find(value => normalize(value) === normalize(standard)))
    .filter((value): value is string => !!value)
    .map(value => ({ value, label: value }));

  if (selectedCategory && selectedCategory !== PROGRAMME_RESULTS_OTHER_CATEGORY && !isStandardRfCategory(selectedCategory)) {
    // Keep the SELECTED string as the value (that is what `selectedCategory` will be compared
    // against), but prefer the payload's own casing for the label.
    const label = present.find(value => normalize(value) === normalize(selectedCategory)) ?? selectedCategory;
    options.push({ value: selectedCategory, label });
  }

  if (present.some(value => !isStandardRfCategory(value))) {
    options.push({ value: PROGRAMME_RESULTS_OTHER_CATEGORY, label: PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL });
  }

  return options;
}

/**
 * Free-text predicate. Matches the result TITLE and the result CODE, case-insensitively,
 * on a substring — the design's placeholder is "Search results or indicators…", and the
 * indicator line is empty for now (P2-3398), so it is matched too but can never hit.
 * Deliberately NOT the results-list pipe's "stringify every field" approach: searching
 * `SP01` there matches every row through `submitter`, which reads as a broken filter.
 */
export function matchesProgrammeResultSearch(row: ProgrammeResultRow, searchText: string): boolean {
  const needle = normalize(searchText);
  if (!needle) return true;
  if (normalize(row?.title).includes(needle) || normalize(row?.code).includes(needle) || normalize(row?.indicator).includes(needle)) {
    return true;
  }
  // @akili-spec changes/results-aow-column-filter (RAC-T-2, RAC-R-6) — also match the Area of
  // Work bucket: every code the result touches (`aowCodes`, NOT just the tie-broken `section`,
  // so `#9006`'s bucket `AOW01` still matches a search for `AOW02`), the bucket KEY itself
  // (`UNTAGGED`, `INTERMEDIATE`, `EOI_2030` — the only haystack entry for the three fixed
  // keys, which have no `aowCodes`), and the bucket's display label (`Not tagged`,
  // `Intermediate outcomes`, `2030 outcomes`).
  if ((row?.aowCodes ?? []).some(code => normalize(code).includes(needle))) return true;
  if (normalize(row?.section).includes(needle)) return true;
  return normalize(sectionLabel(row?.section)).includes(needle);
}

/** The whole predicate for one row against one filter state. Pure — the spec drives it directly. */
export function matchesProgrammeResultFilters(
  row: ProgrammeResultRow,
  state: ProgrammeResultsFilterState,
  options: ProgrammeResultsFilterOptions = {}
): boolean {
  if (!matchesProgrammeResultSearch(row, state.searchText)) return false;

  // Section is multi-select (OR within the dimension), exact bucket-key match, case-insensitive
  // (RAC-R-3, RAC-T-3) — `row.section` is the Overview's bucket key since RAC-T-2's join.
  if (state.selectedSections?.length && !state.selectedSections.some(section => normalize(section) === normalize(row?.section))) {
    return false;
  }

  if (state.selectedPhase) {
    const sel = normalize(state.selectedPhase);
    const pName = normalize(row?.phaseName);
    const pYear = normalize(row?.phaseYear);
    const vId = normalize(row?.versionId);
    const pPhaseYear = normalize(`Phase ${row?.phaseYear}`);

    const matches =
      sel === pName ||
      sel === pYear ||
      sel === vId ||
      sel === pPhaseYear ||
      (pYear && (sel === pYear || sel.includes(pYear))) ||
      (pName && (sel.includes(pName) || pName.includes(sel)));

    if (!matches) return false;
  }

  if (!options.ignoreStatus && state.selectedStatus && normalize(state.selectedStatus) !== normalize(row?.statusName)) return false;

  // @akili-spec changes/my-work-board (MWB-T-13) — Category / Funding source / Center are
  // multi-select: OR inside a dimension, AND across them (the exact semantics the My results
  // board already applied board-locally, now the one shared definition). An empty array is "no
  // filter". Category keeps going through `matchesProgrammeResultCategory` so the `__other__`
  // bucket stays a selectable VALUE — `['Knowledge product', '__other__']` is RF-KPs OR every
  // non-RF row, not a contradiction.
  const categories = state.selectedCategories ?? [];
  if (categories.length && !categories.some(value => matchesProgrammeResultCategory(row, value))) return false;

  const origins = state.selectedOrigins ?? [];
  if (origins.length && !origins.some(value => normalize(value) === normalize(row?.origin))) return false;

  const centers = state.selectedCenters ?? [];
  if (centers.length && !centers.some(value => normalize(value) === normalize(row?.center))) return false;
  // @akili-spec result-framework-reporting/programme-results-created-by-filter
  if (state.selectedCreatedBy && normalize(state.selectedCreatedBy) !== normalize(row?.createdBy)) return false;

  return true;
}

/**
 * Status counters over whatever rows are handed in — so the caller decides the truth the
 * pills tell. Pass `filterRows(rows, { ignoreStatus: true })` and every pill keeps its
 * count while one status is selected, which is what the design's clickable counts need.
 * Order: by descending count, then status name, so the row is stable across reloads.
 */
export function buildStatusCounts(rows: ProgrammeResultRow[]): ProgrammeResultsStatusCount[] {
  const byName = new Map<string, ProgrammeResultsStatusCount>();

  for (const row of rows ?? []) {
    const statusName = row?.statusName ?? '';
    if (!statusName) continue;
    const existing = byName.get(statusName);
    if (existing) {
      existing.count++;
      continue;
    }
    byName.set(statusName, { statusId: row?.statusId ?? null, statusName, count: 1 });
  }

  return [...byName.values()].sort((a, b) => b.count - a.count || a.statusName.localeCompare(b.statusName));
}

/**
 * Filter state for the programme Results tab. Pure state + pure derivations: no HTTP, no
 * knowledge of where the rows come from. Shape follows results-list-filter.service.ts (one
 * signal per dimension, cleared by an explicit method) with the newer bilateral-results
 * habit of exposing `computed()` instead of a pipe.
 *
 * Provide it beside `ProgrammeResultsService` on the Results tab component, not in root:
 * filters must not survive navigating to another programme.
 */
@Injectable()
export class ProgrammeResultsFilterService {
  /** Free text. Debounce at the input; this signal is the single source of truth. */
  readonly searchText = signal<string>('');

  /**
   * MULTI-select (checkboxes in the design), matched against `row.section` (the Overview's
   * bucket key — RAC-T-2's join, RAC-T-3's live filter). Values are the bucket-key vocabulary:
   * an AoW code (`AOW01`) or one of `INTERMEDIATE` / `EOI_2030` / `UNTAGGED`.
   */
  readonly selectedSections = signal<string[]>([]);

  /** SINGLE-select, matched against `row.phaseName` / `row.phaseYear` / `row.versionId`. */
  readonly selectedPhase = signal<string | null>(null);
  /** SINGLE-select, matched against `row.statusName`. `null` = no status filter. */
  readonly selectedStatus = signal<string | null>(null);

  // @akili-spec changes/my-work-board (MWB-T-13)
  /**
   * The three MULTI-select dimensions shared by the Results tab and the My results board.
   *
   * OR inside a dimension, AND across them; `[]` is "no filter". They replace the single-value
   * `selectedCategory` / `selectedOrigin` / `selectedCenter` this service used to expose — the
   * board had already grown its own array-shaped copy of exactly these three, and one screen
   * offering "Category: Knowledge product OR Innovation use" while its sibling offered only one
   * value at a time is the drift this collapses.
   *
   * A legacy single-value deep link (`?category=Knowledge%20product`, still emitted by the
   * Overview cards and heatmap — `RFD-*`) hydrates as a one-element array via `parseListParam`,
   * so nothing upstream had to change.
   */
  /** Matched against `row.category` (`result_type`); `__other__` is a selectable value. */
  readonly selectedCategories = signal<string[]>([]);
  /** Matched against `row.origin` (`source_name`). */
  readonly selectedOrigins = signal<string[]>([]);
  /** Matched against `row.center` (`lead_center`). */
  readonly selectedCenters = signal<string[]>([]);
  // @akili-spec result-framework-reporting/programme-results-created-by-filter
  /** SINGLE-select, matched against `row.createdBy` (`create_first_name` + `create_last_name`). */
  readonly selectedCreatedBy = signal<string | null>(null);

  /** Plain snapshot of all eight dimensions — what the pure predicates take. */
  readonly state = computed<ProgrammeResultsFilterState>(() => ({
    searchText: this.searchText(),
    selectedSections: this.selectedSections(),
    selectedPhase: this.selectedPhase(),
    selectedStatus: this.selectedStatus(),
    selectedCategories: this.selectedCategories(),
    selectedOrigins: this.selectedOrigins(),
    selectedCenters: this.selectedCenters(),
    selectedCreatedBy: this.selectedCreatedBy()
  }));

  /** True when at least one dimension is narrowing the list. Drives the chip row and the
   * "No results match these filters." empty state (vs the "nothing reported yet" one). */
  readonly hasActiveFilters = computed<boolean>(() => this.activeChips().length > 0);

  /** One chip per active filter value, in toolbar order. `clear` is `clearChip(chip)`. */
  readonly activeChips = computed<ProgrammeResultsFilterChip[]>(() => {
    const chips: ProgrammeResultsFilterChip[] = [];
    const search = this.searchText().trim();

    if (search) chips.push({ label: `Search: ${search}`, dimension: 'search', value: search });
    for (const section of this.selectedSections()) {
      // @akili-spec changes/results-aow-column-filter (RAC-T-3) — the chip shows the DISPLAY
      // label (design.md §6.2 "activeChips label via sectionLabel(key)"): `AOW01` for an AoW code
      // (no dictionary entry, `sectionLabel` returns it as-is — including a raw, mixed-case value
      // straight off the URL, RAC-R-4.1's "raw value in chip" rule) and `Intermediate outcomes` /
      // `2030 outcomes` / `Not tagged` for the three fixed keys. `value` stays the raw key —
      // `clearChip`/the predicate must keep matching exactly what is stored, never the label.
      if (section) chips.push({ label: `Section: ${sectionLabel(section)}`, dimension: 'section', value: section });
    }
    const phase = this.selectedPhase();
    if (phase) chips.push({ label: `Phase: ${phase}`, dimension: 'phase', value: phase });
    const status = this.selectedStatus();
    if (status) chips.push({ label: `Status: ${status}`, dimension: 'status', value: status });
    // @akili-spec changes/my-work-board (MWB-T-13) — ONE chip per selected value, in selection
    // order, for each of the three multi dimensions. `value` stays the raw stored string so
    // `clearChip()` removes exactly this one and leaves the dimension's other values alone.
    for (const category of this.selectedCategories()) {
      if (!category) continue;
      // The `Other` bucket travels as a sentinel (P2-3312) — the chip must read "Other", not it.
      const categoryLabel = category === PROGRAMME_RESULTS_OTHER_CATEGORY ? PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL : category;
      chips.push({ label: `Category: ${categoryLabel}`, dimension: 'category', value: category });
    }
    for (const origin of this.selectedOrigins()) {
      if (origin) chips.push({ label: `Funding source: ${origin}`, dimension: 'origin', value: origin });
    }
    for (const center of this.selectedCenters()) {
      if (center) chips.push({ label: `Center: ${center}`, dimension: 'center', value: center });
    }
    const createdBy = this.selectedCreatedBy();
    if (createdBy) chips.push({ label: `Created by: ${createdBy}`, dimension: 'createdBy', value: createdBy });

    return chips;
  });

  /** Applies the current state to a list of rows. Sorting stays with the table. */
  filterRows(rows: ProgrammeResultRow[], options: ProgrammeResultsFilterOptions = {}): ProgrammeResultRow[] {
    const state = this.state();
    return (rows ?? []).filter(row => matchesProgrammeResultFilters(row, state, options));
  }

  /** Adds or removes one section from the multi-select. */
  toggleSection(section: string): void {
    this.selectedSections.update(current => toggleInList(current, section));
  }

  // @akili-spec changes/my-work-board (MWB-T-13)
  /** Adds or removes one category from the multi-select. `__other__` toggles like any value. */
  toggleCategory(category: string): void {
    this.selectedCategories.update(current => toggleInList(current, category));
  }

  /** Adds or removes one funding source from the multi-select. */
  toggleOrigin(origin: string): void {
    this.selectedOrigins.update(current => toggleInList(current, origin));
  }

  /** Adds or removes one center from the multi-select. */
  toggleCenter(center: string): void {
    this.selectedCenters.update(current => toggleInList(current, center));
  }

  /** Sets the status filter; passing the value already selected clears it (pill toggling). */
  toggleStatus(status: string | null): void {
    this.selectedStatus.set(this.selectedStatus() === status ? null : status);
  }

  clearSearch(): void {
    this.searchText.set('');
  }

  /** Removes one section, or all of them when called with no argument. */
  clearSections(section?: string): void {
    if (section === undefined) {
      this.selectedSections.set([]);
      return;
    }
    this.selectedSections.set(this.selectedSections().filter(value => value !== section));
  }

  clearPhase(): void {
    this.selectedPhase.set(null);
  }

  clearStatus(): void {
    this.selectedStatus.set(null);
  }

  // @akili-spec changes/my-work-board (MWB-T-13) — same shape as `clearSections`: one value, or
  // the whole dimension when called with no argument (what `clearAll` and the popover use).
  /** Removes one category, or all of them when called with no argument. */
  clearCategory(category?: string): void {
    if (category === undefined) {
      this.selectedCategories.set([]);
      return;
    }
    this.selectedCategories.update(current => current.filter(value => value !== category));
  }

  /** Removes one funding source, or all of them when called with no argument. */
  clearOrigin(origin?: string): void {
    if (origin === undefined) {
      this.selectedOrigins.set([]);
      return;
    }
    this.selectedOrigins.update(current => current.filter(value => value !== origin));
  }

  /** Removes one center, or all of them when called with no argument. */
  clearCenter(center?: string): void {
    if (center === undefined) {
      this.selectedCenters.set([]);
      return;
    }
    this.selectedCenters.update(current => current.filter(value => value !== center));
  }

  clearCreatedBy(): void {
    this.selectedCreatedBy.set(null);
  }

  /** Removes exactly the filter a chip stands for. Wire it to the chip's X button. */
  clearChip(chip: ProgrammeResultsFilterChip): void {
    switch (chip?.dimension) {
      case 'search':
        this.clearSearch();
        return;
      case 'section':
        this.clearSections(chip.value);
        return;
      case 'phase':
        this.clearPhase();
        return;
      case 'status':
        this.clearStatus();
        return;
      // @akili-spec changes/my-work-board (MWB-T-13) — one value, not the dimension.
      case 'category':
        this.clearCategory(chip.value);
        return;
      case 'origin':
        this.clearOrigin(chip.value);
        return;
      case 'center':
        this.clearCenter(chip.value);
        return;
      case 'createdBy':
        this.clearCreatedBy();
        return;
      default:
        return;
    }
  }

  /** Resets all eight dimensions. Shared by "Clear all" and the filtered empty state's button. */
  clearAll(): void {
    this.searchText.set('');
    this.selectedSections.set([]);
    this.selectedPhase.set(null);
    this.selectedStatus.set(null);
    this.selectedCategories.set([]);
    this.selectedOrigins.set([]);
    this.selectedCenters.set([]);
    this.selectedCreatedBy.set(null);
  }
}

/** Shared body of the four `toggle*` methods — add when absent, remove when present. */
function toggleInList(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter(item => item !== value) : [...current, value];
}
