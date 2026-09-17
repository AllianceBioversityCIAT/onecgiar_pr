import { computed, Injectable, signal } from '@angular/core';
import { BilateralAiDraft } from '../../../services/bilateral-ai.interfaces';
import {
  buildDraftSearchHaystack,
  createdByChipLabel,
  MyDraftResultsFilterContext,
  normalizeProjectId,
  normalizeUserId,
} from '../utils/draft-filter-helpers';

export { normalizeProjectId, normalizeUserId } from '../utils/draft-filter-helpers';

/**
 * P2-3319 — filter state for the Drafts tab toolbar. Extended by
 * @akili-spec changes/bilateral-ai-draft-filters with search + Created by + project multiselect.
 *
 * Provide it on the component, never in root.
 */

export type MyDraftResultsFilterDimension = 'search' | 'project' | 'createdBy';

export interface MyDraftResultsFilterState {
  selectedProjectIds: string[];
  searchText: string;
  selectedCreatedBy: string[];
}

export interface MyDraftResultsFilterChip {
  label: string;
  dimension: MyDraftResultsFilterDimension;
  value: string;
}

export interface DraftProjectFilterOption {
  value: string;
  label: string;
  code?: string;
  title?: string;
}

export function formatDraftProjectOption(
  id: unknown,
  nameMap: Record<number, string> = {}
): DraftProjectFilterOption {
  const value = normalizeProjectId(id);
  const mapped = nameMap[Number(value)];
  const label = mapped ?? value;
  let code: string | undefined;
  let title: string | undefined;

  if (label.includes(' — ')) {
    const [c, ...rest] = label.split(' — ');
    code = c.trim();
    title = rest.join(' — ').trim();
  }

  const option: DraftProjectFilterOption = { value, label };
  if (code) option.code = code;
  if (title) option.title = title;
  return option;
}

/** OR within project dimension; empty selection = no project filter. */
export function matchesDraftProject(draft: BilateralAiDraft, state: MyDraftResultsFilterState): boolean {
  const selected = state?.selectedProjectIds ?? [];
  if (!selected.length) return true;
  const draftProjectId = normalizeProjectId(draft?.job?.project_id);
  if (!draftProjectId) return false;
  return selected.some(id => normalizeProjectId(id) === draftProjectId);
}

export function matchesDraftSearch(
  draft: BilateralAiDraft,
  state: MyDraftResultsFilterState,
  context: MyDraftResultsFilterContext
): boolean {
  const query = (state?.searchText ?? '').trim().toLowerCase();
  if (!query) return true;
  return buildDraftSearchHaystack(draft, context).includes(query);
}

export function matchesDraftCreatedBy(
  draft: BilateralAiDraft,
  state: MyDraftResultsFilterState
): boolean {
  const selected = state?.selectedCreatedBy ?? [];
  if (!selected.length) return true;
  const draftUserId = normalizeUserId(draft?.job?.user_id);
  if (!draftUserId) return false;
  return selected.some(id => normalizeUserId(id) === draftUserId);
}

@Injectable()
export class MyDraftResultsFilterService {
  readonly selectedProjectIds = signal<string[]>([]);
  readonly searchText = signal('');
  readonly selectedCreatedBy = signal<string[]>([]);

  readonly state = computed<MyDraftResultsFilterState>(() => ({
    selectedProjectIds: this.selectedProjectIds(),
    searchText: this.searchText(),
    selectedCreatedBy: this.selectedCreatedBy(),
  }));

  readonly hasActiveFilters = computed<boolean>(() => {
    return (
      this.selectedProjectIds().length > 0 ||
      !!this.searchText().trim() ||
      this.selectedCreatedBy().length > 0
    );
  });

  readonly activeFilterCount = computed<number>(() => {
    let count = 0;
    if (this.searchText().trim()) count += 1;
    count += this.selectedCreatedBy().length;
    count += this.selectedProjectIds().length;
    return count;
  });

  filterDrafts(drafts: BilateralAiDraft[], context: MyDraftResultsFilterContext = emptyContext()): BilateralAiDraft[] {
    const state = this.state();
    if (!this.hasActiveFilters()) return drafts ?? [];
    return (drafts ?? []).filter(
      draft =>
        matchesDraftProject(draft, state) &&
        matchesDraftSearch(draft, state, context) &&
        matchesDraftCreatedBy(draft, state)
    );
  }

  filterChipGroups(
    context: MyDraftResultsFilterContext,
    projectLabelFor: (projectId: string) => string,
    drafts: BilateralAiDraft[] = []
  ): MyDraftResultsFilterChip[] {
    const chips: MyDraftResultsFilterChip[] = [];
    const search = this.searchText().trim();
    if (search) {
      chips.push({ dimension: 'search', value: search, label: `Search: ${search}` });
    }

    for (const userId of this.selectedCreatedBy()) {
      const label = createdByChipLabel(userId, context, drafts);
      chips.push({ dimension: 'createdBy', value: userId, label: `Created by: ${label}` });
    }

    for (const projectId of this.selectedProjectIds()) {
      chips.push({
        dimension: 'project',
        value: projectId,
        label: `Project: ${projectLabelFor(projectId) || projectId}`,
      });
    }

    return chips;
  }

  setSearchText(value: string): void {
    this.searchText.set(value ?? '');
  }

  setCreatedBy(values: string[] | null | undefined): void {
    this.selectedCreatedBy.set(values?.length ? [...values] : []);
  }

  setProjects(projectIds: readonly unknown[]): void {
    const next = [...new Set(projectIds.map(id => normalizeProjectId(id)).filter(Boolean))];
    this.selectedProjectIds.set(next);
  }

  toggleProject(projectId: unknown): void {
    const next = normalizeProjectId(projectId);
    if (!next || next === 'all') return;
    this.selectedProjectIds.update(current =>
      current.includes(next) ? current.filter(id => id !== next) : [...current, next]
    );
  }

  isProjectSelected(projectId: unknown): boolean {
    const id = normalizeProjectId(projectId);
    return id ? this.selectedProjectIds().includes(id) : false;
  }

  clearProject(): void {
    this.selectedProjectIds.set([]);
  }

  clearChip(dimension: MyDraftResultsFilterDimension, value: string): void {
    switch (dimension) {
      case 'search':
        this.searchText.set('');
        break;
      case 'project':
        this.selectedProjectIds.update(current => current.filter(id => id !== value));
        break;
      case 'createdBy':
        this.selectedCreatedBy.update(current => current.filter(id => id !== value));
        break;
    }
  }

  clearAll(): void {
    this.selectedProjectIds.set([]);
    this.searchText.set('');
    this.selectedCreatedBy.set([]);
  }
}

function emptyContext(): MyDraftResultsFilterContext {
  return { projectNameMap: {}, resolvedUserNames: {} };
}
