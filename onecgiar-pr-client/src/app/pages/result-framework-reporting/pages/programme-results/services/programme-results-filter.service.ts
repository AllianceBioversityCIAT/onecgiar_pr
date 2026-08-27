import { computed, Injectable, signal } from '@angular/core';
import { ProgrammeResultRow } from './programme-results.service';

/** The six filter dimensions of the Results tab toolbar, left to right. */
export type ProgrammeResultsFilterDimension = 'search' | 'section' | 'status' | 'category' | 'origin' | 'center';

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
  selectedStatus: string | null;
  selectedCategory: string | null;
  selectedOrigin: string | null;
  selectedCenter: string | null;
}

/** Which dimensions to skip. Used for the status counters, which must ignore the status filter. */
export interface ProgrammeResultsFilterOptions {
  ignoreStatus?: boolean;
}

function normalize(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim().toLowerCase();
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

  if (!options.ignoreStatus && state.selectedStatus && normalize(state.selectedStatus) !== normalize(row?.statusName)) return false;
  if (state.selectedCategory && normalize(state.selectedCategory) !== normalize(row?.category)) return false;
  if (state.selectedOrigin && normalize(state.selectedOrigin) !== normalize(row?.origin)) return false;
  if (state.selectedCenter && normalize(state.selectedCenter) !== normalize(row?.center)) return false;

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

  /** SINGLE-select, matched against `row.statusName`. `null` = no status filter. */
  readonly selectedStatus = signal<string | null>(null);
  /** SINGLE-select, matched against `row.category` (`result_type`). */
  readonly selectedCategory = signal<string | null>(null);
  /** SINGLE-select, matched against `row.origin` (`source_name`). */
  readonly selectedOrigin = signal<string | null>(null);
  /** SINGLE-select, matched against `row.center` (`lead_center`). */
  readonly selectedCenter = signal<string | null>(null);

  /** Plain snapshot of all six dimensions — what the pure predicates take. */
  readonly state = computed<ProgrammeResultsFilterState>(() => ({
    searchText: this.searchText(),
    selectedSections: this.selectedSections(),
    selectedStatus: this.selectedStatus(),
    selectedCategory: this.selectedCategory(),
    selectedOrigin: this.selectedOrigin(),
    selectedCenter: this.selectedCenter()
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
    const status = this.selectedStatus();
    if (status) chips.push({ label: `Status: ${status}`, dimension: 'status', value: status });
    const category = this.selectedCategory();
    if (category) chips.push({ label: `Category: ${category}`, dimension: 'category', value: category });
    const origin = this.selectedOrigin();
    if (origin) chips.push({ label: `Origin: ${origin}`, dimension: 'origin', value: origin });
    const center = this.selectedCenter();
    if (center) chips.push({ label: `Center: ${center}`, dimension: 'center', value: center });

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

  /** Removes exactly the filter a chip stands for. Wire it to the chip's X button. */
  clearChip(chip: ProgrammeResultsFilterChip): void {
    switch (chip?.dimension) {
      case 'search':
        this.clearSearch();
        return;
      case 'section':
        this.clearSections(chip.value);
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
      default:
        return;
    }
  }

  /** Resets all six dimensions. Shared by "Clear all" and the filtered empty state's button. */
  clearAll(): void {
    this.searchText.set('');
    this.selectedSections.set([]);
    this.selectedStatus.set(null);
    this.selectedCategory.set(null);
    this.selectedOrigin.set(null);
    this.selectedCenter.set(null);
  }
}
