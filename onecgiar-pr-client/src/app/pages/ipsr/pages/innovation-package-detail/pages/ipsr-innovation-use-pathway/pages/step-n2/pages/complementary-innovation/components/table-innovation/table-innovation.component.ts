import { Component, EventEmitter, Input, Output } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideExternalLink, lucidePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { resultStatusBg, resultStatusFg, resultStatusLabel } from '../../../../../../../../../../../../shared/constants/result-status-tokens';
import {
  PlannedSearchEvaluation,
  comparePlannedSearchEvaluation,
  parsePlannedSearch,
  plannedSearchEvaluate
} from '../../../../../../../../../../../result-framework-reporting/pages/dashboard-lab/pipes/planned-search.util';
import { COMPLEMENTARY_INNOVATION_COPY } from '../complementary-innovation.copy';

interface ComplementaryInnovation {
  climate_change_tag_level_id: string;
  created_date: string;
  description: string;
  gender_tag_level_id: string;
  initiative_id: number;
  initiative_name: string;
  initiative_official_code: string;
  initiative_short_name: string;
  lead_contact_person: string;
  result_code: string;
  result_id: string;
  result_level_name: string;
  result_type_id: number;
  result_type_name: string;
  status_id?: number | string;
  title: string;
  selected: boolean;
}

export interface CandidateTypeChip {
  id: number;
  label: string;
  count: number;
}

/**
 * P2-3846 — the result types Step 2.1 can list, with a clean label (the wire sends type 7 as
 * "Innovation development (QAed)" even when the result is Submitted — the status now has its own
 * chip) and the same tone the bilateral tables give each type
 * (`bilateral-review-table.component.ts` RESULT_TYPE_TONE), so a type reads the same everywhere.
 */
const CANDIDATE_TYPES: Readonly<Record<number, { label: string; tone: string }>> = {
  7: { label: 'Innovation development', tone: 'bg-teal-50 text-teal-700 border-teal-200' },
  2: { label: 'Innovation use', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  1: { label: 'Policy change', tone: 'bg-violet-50 text-[var(--pr-color-primary-700)] border-violet-200' },
  5: { label: 'Capacity sharing', tone: 'bg-amber-50 text-amber-800 border-amber-200' }
};
const NEUTRAL_TONE = 'bg-slate-100 text-slate-700 border-slate-200';

@Component({
  selector: 'app-table-innovation',
  templateUrl: './table-innovation.component.html',
  styleUrls: ['./table-innovation.component.scss'],
  standalone: false,
  providers: [provideIcons({ lucideCheck, lucideExternalLink, lucidePlus, lucideSearch, lucideX })]
})
export class TableInnovationComponent {
  @Input() dataTable: any[] = [];
  @Input() columns: any[];
  @Output() selectEvent = new EventEmitter<ComplementaryInnovation>();
  @Output() editEvent = new EventEmitter<any>();
  @Output() cancelEvent = new EventEmitter<any>();

  readonly copy = COMPLEMENTARY_INNOVATION_COPY;
  static readonly PAGE_SIZE = 10;

  /** Free text of the search field. The list is re-derived from it (see `filteredRows`). */
  searchText = '';
  /** Result types switched on in the chip row; empty = every type. */
  activeTypes: number[] = [];
  /** How many rows of the filtered list are on screen ("Show more" adds a page). */
  visibleCount = TableInnovationComponent.PAGE_SIZE;

  // One evaluation per (list, query, types): the fuzzy rank runs Levenshtein over ~1,300 rows, so it
  // must not run again on every change-detection pass. `selected` is flipped in place by the parent
  // and does not affect the filter, so it is not part of the key.
  private cacheKey = '';
  private cacheRows: ComplementaryInnovation[] = [];
  private cacheChips: CandidateTypeChip[] = [];
  private cacheSource: any[] | null = null;

  constructor(public api: ApiService) {}

  get canEdit(): boolean {
    return !this.api.rolesSE.platformIsClosed && !this.api.rolesSE.readOnly;
  }

  /** Rows that match the search and the type chips, best match first (exact phrase → all words in any order → similar words). */
  get filteredRows(): ComplementaryInnovation[] {
    this.refresh();
    return this.cacheRows;
  }

  get visibleRows(): ComplementaryInnovation[] {
    return this.filteredRows.slice(0, this.visibleCount);
  }

  /** One chip per type present in the list, counted against the current search. Hidden when only one type exists (phase <= 2025). */
  get typeChips(): CandidateTypeChip[] {
    this.refresh();
    return this.cacheChips;
  }

  private refresh(): void {
    const rows = this.dataTable ?? [];
    const key = `${this.searchText}|${this.activeTypes.join(',')}|${rows.length}`;
    if (key === this.cacheKey && this.cacheSource === rows) return;
    this.cacheKey = key;
    this.cacheSource = rows;

    const parsed = parsePlannedSearch(this.searchText);
    const matches: { row: ComplementaryInnovation; evaluation: PlannedSearchEvaluation }[] = [];
    for (const row of rows) {
      const evaluation = plannedSearchEvaluate(this.haystack(row), parsed);
      if (evaluation.rank > 0) matches.push({ row, evaluation });
    }

    const counts = new Map<number, number>();
    for (const { row } of matches) counts.set(Number(row.result_type_id), (counts.get(Number(row.result_type_id)) ?? 0) + 1);
    const present = [...new Set(rows.map(row => Number(row.result_type_id)))];
    this.cacheChips = present
      .map(id => ({ id, label: this.typeLabelById(id, rows.find(r => Number(r.result_type_id) === id)?.result_type_name), count: counts.get(id) ?? 0 }))
      .sort((a, b) => this.typeOrder(a.id) - this.typeOrder(b.id));

    const byType = this.activeTypes.length ? matches.filter(m => this.activeTypes.includes(Number(m.row.result_type_id))) : matches;
    this.cacheRows = byType
      .sort((a, b) => (parsed.phrase ? comparePlannedSearchEvaluation(a.evaluation, b.evaluation) : 0) || Number(b.row.result_code) - Number(a.row.result_code))
      .map(m => m.row);
  }

  // The type is NOT in the haystack: it has its own chips, and matching it made every row of a type hit
  // ("sharing capacity" returned all 521 Capacity sharing rows instead of the ones whose title says so).
  private haystack(row: ComplementaryInnovation): string {
    return [row.result_code, row.title, row.initiative_official_code, row.initiative_short_name, row.lead_contact_person]
      .filter(v => v != null && String(v).trim() !== '')
      .join(' ');
  }

  private typeOrder(id: number): number {
    const order = [7, 2, 1, 5];
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  }

  private typeLabelById(id: number, fallback?: string): string {
    return CANDIDATE_TYPES[id]?.label ?? (fallback || '').replace(/\s*\(QAed\)\s*$/i, '');
  }

  typeLabel(row: ComplementaryInnovation): string {
    return this.typeLabelById(Number(row?.result_type_id), row?.result_type_name);
  }

  typeTone(row: ComplementaryInnovation): string {
    return CANDIDATE_TYPES[Number(row?.result_type_id)]?.tone ?? NEUTRAL_TONE;
  }

  statusLabel(row: ComplementaryInnovation): string {
    return resultStatusLabel(row?.status_id);
  }

  statusFg(row: ComplementaryInnovation): string {
    return resultStatusFg(row?.status_id);
  }

  statusBg(row: ComplementaryInnovation): string {
    return resultStatusBg(row?.status_id);
  }

  onSearchChange(): void {
    this.visibleCount = TableInnovationComponent.PAGE_SIZE;
  }

  clearSearch(): void {
    this.searchText = '';
    this.onSearchChange();
  }

  isTypeActive(id: number): boolean {
    return this.activeTypes.includes(id);
  }

  toggleType(id: number): void {
    this.activeTypes = this.isTypeActive(id) ? this.activeTypes.filter(t => t !== id) : [...this.activeTypes, id];
    this.visibleCount = TableInnovationComponent.PAGE_SIZE;
  }

  showAllTypes(): void {
    this.activeTypes = [];
    this.visibleCount = TableInnovationComponent.PAGE_SIZE;
  }

  showMore(): void {
    this.visibleCount += TableInnovationComponent.PAGE_SIZE;
  }

  toggleLink(result: ComplementaryInnovation): void {
    if (result.selected) this.cancelInnovationEvent(result);
    else this.selectInnovation(result);
  }

  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectEvent.emit(result);
  }

  cancelInnovationEvent(result_id) {
    this.cancelEvent.emit(result_id);
  }

  openNewWindow(result) {
    const url = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
    window.open(url, '_blank');
  }

  onDelete(id, callback?) {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to remove this complementary innovation?`,
        description: ``,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.api.resultsSE.DELETEcomplementaryinnovation(id).subscribe({
          next: () => {
            this.editEvent.emit(true);
          },
          error: err => {
            this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
            console.error(err);
          },
          complete: () => {
            callback?.();
          }
        });
      }
    );
  }
}
