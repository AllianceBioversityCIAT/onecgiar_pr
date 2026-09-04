import { computed, Injectable, signal } from '@angular/core';
import { ProgrammeResultRow } from './programme-results.service';

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
  selectedCategory: string | null;
  selectedOrigin: string | null;
  selectedCenter: string | null;
  selectedCreatedBy: string | null;
}

/** Which dimensions to skip. Used for the status counters, which must ignore the status filter. */
export interface ProgrammeResultsFilterOptions {
  ignoreStatus?: boolean;
}

export function normalize(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim().toLowerCase();
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
  return normalize(row?.title).includes(needle) || normalize(row?.code).includes(needle) || normalize(row?.indicator).includes(needle);
}

/** The whole predicate for one row against one filter state. Pure — the spec drives it directly. */
export function matchesProgrammeResultFilters(
  row: ProgrammeResultRow,
  state: ProgrammeResultsFilterState,
  options: ProgrammeResultsFilterOptions = {}
): boolean {
  if (!matchesProgrammeResultSearch(row, state.searchText)) return false;

  // Section is multi-select (OR within the dimension). Always passes in v1: every row's
  // `section` is '' because no endpoint exposes the AoW for the full result set (P2-3399).
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
  if (!matchesProgrammeResultCategory(row, state.selectedCategory)) return false;
  if (state.selectedOrigin && normalize(state.selectedOrigin) !== normalize(row?.origin)) return false;
  if (state.selectedCenter && normalize(state.selectedCenter) !== normalize(row?.center)) return false;
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
   * MULTI-select (checkboxes in the design). Present but INERT in v1 — the rows carry no
   * section, so the dropdown has nothing honest to offer yet (P2-3399). Kept so the
   * template, the chips and `clearAll()` do not have to change when the field lands.
   */
  readonly selectedSections = signal<string[]>([]);

  /** SINGLE-select, matched against `row.phaseName` / `row.phaseYear` / `row.versionId`. */
  readonly selectedPhase = signal<string | null>(null);
  /** SINGLE-select, matched against `row.statusName`. `null` = no status filter. */
  readonly selectedStatus = signal<string | null>(null);
  /** SINGLE-select, matched against `row.category` (`result_type`). */
  readonly selectedCategory = signal<string | null>(null);
  /** SINGLE-select, matched against `row.origin` (`source_name`). */
  readonly selectedOrigin = signal<string | null>(null);
  /** SINGLE-select, matched against `row.center` (`lead_center`). */
  readonly selectedCenter = signal<string | null>(null);
  // @akili-spec result-framework-reporting/programme-results-created-by-filter
  /** SINGLE-select, matched against `row.createdBy` (`create_first_name` + `create_last_name`). */
  readonly selectedCreatedBy = signal<string | null>(null);

  /** Plain snapshot of all eight dimensions — what the pure predicates take. */
  readonly state = computed<ProgrammeResultsFilterState>(() => ({
    searchText: this.searchText(),
    selectedSections: this.selectedSections(),
    selectedPhase: this.selectedPhase(),
    selectedStatus: this.selectedStatus(),
    selectedCategory: this.selectedCategory(),
    selectedOrigin: this.selectedOrigin(),
    selectedCenter: this.selectedCenter(),
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
      if (section) chips.push({ label: `Section: ${section}`, dimension: 'section', value: section });
    }
    const phase = this.selectedPhase();
    if (phase) chips.push({ label: `Phase: ${phase}`, dimension: 'phase', value: phase });
    const status = this.selectedStatus();
    if (status) chips.push({ label: `Status: ${status}`, dimension: 'status', value: status });
    const category = this.selectedCategory();
    if (category) {
      // The `Other` bucket travels as a sentinel (P2-3312) — the chip must read "Other", not it.
      const categoryLabel = category === PROGRAMME_RESULTS_OTHER_CATEGORY ? PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL : category;
      chips.push({ label: `Category: ${categoryLabel}`, dimension: 'category', value: category });
    }
    const origin = this.selectedOrigin();
    if (origin) chips.push({ label: `Funding source: ${origin}`, dimension: 'origin', value: origin });
    const center = this.selectedCenter();
    if (center) chips.push({ label: `Center: ${center}`, dimension: 'center', value: center });
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
    const current = this.selectedSections();
    this.selectedSections.set(current.includes(section) ? current.filter(value => value !== section) : [...current, section]);
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

  clearCategory(): void {
    this.selectedCategory.set(null);
  }

  clearOrigin(): void {
    this.selectedOrigin.set(null);
  }

  clearCenter(): void {
    this.selectedCenter.set(null);
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
      case 'category':
        this.clearCategory();
        return;
      case 'origin':
        this.clearOrigin();
        return;
      case 'center':
        this.clearCenter();
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
    this.selectedCategory.set(null);
    this.selectedOrigin.set(null);
    this.selectedCenter.set(null);
    this.selectedCreatedBy.set(null);
  }
}
