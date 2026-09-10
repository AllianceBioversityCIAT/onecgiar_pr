import { computed, Injectable, signal } from '@angular/core';
import { BilateralAiDraft } from '../../../services/bilateral-ai.interfaces';

/**
 * P2-3319 — filter state for the Drafts tab toolbar. One dimension today (project), shaped after
 * `pages/result-framework-reporting/pages/programme-results/services/programme-results-filter.service.ts`
 * so a second dimension is a signal + a branch in the predicate, not a rewrite:
 * pure state + pure predicates, no HTTP and no knowledge of where the drafts come from.
 *
 * Provide it on the component, never in root — the filter must not survive leaving the tab or
 * switching centre (`BilateralAiService.draftList()` is refetched per centre and the ids of one
 * centre's projects mean nothing in another's list).
 */

/** The filter dimensions of the Drafts toolbar. Only `project` exists so far (P2-3319). */
export type MyDraftResultsFilterDimension = 'project';

/** Plain snapshot of the filter state — lets the predicates stay pure functions. */
export interface MyDraftResultsFilterState {
  /** CLARISA project id, held as a string: the `<option>` value is a string either way, and
   *  TypeORM can serialise the column as a number or a string depending on its width. */
  selectedProjectId: string | null;
}

/** One entry of the project dropdown: `value` is the id, `label` is what the user reads. */
export interface DraftProjectFilterOption {
  value: string;
  label: string;
}

/** `null`/`undefined`/`''` all mean "no project", and ids are compared as trimmed strings. */
export function normalizeProjectId(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Does this draft belong to the selected project? Pure — the spec drives it directly.
 * No project selected ⇒ every draft passes, which is what keeps the unfiltered list intact.
 * A draft whose payload carries no job (and therefore no project) can never match a selection.
 */
export function matchesDraftProject(draft: BilateralAiDraft, state: MyDraftResultsFilterState): boolean {
  const selected = normalizeProjectId(state?.selectedProjectId);
  if (!selected) return true;
  return normalizeProjectId(draft?.job?.project_id) === selected;
}

@Injectable()
export class MyDraftResultsFilterService {
  /** SINGLE-select, matched against `draft.job.project_id`. `null` = no project filter. */
  readonly selectedProjectId = signal<string | null>(null);

  /** Plain snapshot of every dimension — what the pure predicates take. */
  readonly state = computed<MyDraftResultsFilterState>(() => ({
    selectedProjectId: this.selectedProjectId(),
  }));

  /** True when at least one dimension is narrowing the list. Drives the "Clear filter" affordance
   *  and the "no drafts match" empty state (as opposed to the "no drafts yet" one). */
  readonly hasActiveFilters = computed<boolean>(() => !!normalizeProjectId(this.selectedProjectId()));

  /** Applies the current state to a list of drafts. Ordering stays with the list. */
  filterDrafts(drafts: BilateralAiDraft[]): BilateralAiDraft[] {
    const state = this.state();
    if (!this.hasActiveFilters()) return drafts ?? [];
    return (drafts ?? []).filter(draft => matchesDraftProject(draft, state));
  }

  /**
   * Sets the project filter. Empty / `'all'` (the `app-pr-filter-select` sentinel) clears it, and
   * picking the project already selected clears it too — the same toggle the shared pill gives.
   */
  selectProject(projectId: unknown): void {
    const next = normalizeProjectId(projectId);
    if (!next || next === 'all' || next === this.selectedProjectId()) {
      this.selectedProjectId.set(null);
      return;
    }
    this.selectedProjectId.set(next);
  }

  clearProject(): void {
    this.selectedProjectId.set(null);
  }

  /** Resets every dimension. Shared by "Clear filter" and the filtered empty state's button. */
  clearAll(): void {
    this.clearProject();
  }
}
