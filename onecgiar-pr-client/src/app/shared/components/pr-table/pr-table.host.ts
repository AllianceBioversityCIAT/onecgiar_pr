import { InjectionToken } from '@angular/core';

/**
 * Minimal sort contract shared by app-pr-table and app-pr-group-table so the
 * `prSortableColumn` directive and `pr-sort-icon` component work with either
 * host without depending on the concrete component class.
 */
export interface PrSortableHost {
  activeSortField(): string;
  activeSortOrder(): number;
  sort(field: string): void;
}

export const PR_TABLE_HOST = new InjectionToken<PrSortableHost>('PR_TABLE_HOST');
