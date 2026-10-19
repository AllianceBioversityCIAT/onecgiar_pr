import type { PortfolioStatusSegment, RawResult } from './portfolio-overview.service';

/**
 * Pure status-slot resolver, split out of `portfolio-overview.service.ts` (spec global-filters,
 * GLF-T-2) so `portfolio-filters.ts` can import it without pulling an Angular @Injectable module.
 * The service re-exports it: every existing import keeps working and there is ONE map.
 */
export function resolveStatusSlot(row: RawResult): PortfolioStatusSegment['key'] {
  const sname = (row.status_name || '').toLowerCase().trim();
  const sid = Number(row.status_id);

  if (sname.includes('approved') || sid === 6) return 'approved';
  if (sname.includes('in qa') || sname.includes('quality assessed')) return 'in-qa';
  if (sname.includes('submitted') || sname.includes('pending review') || sid === 3 || sid === 5) return 'submitted';
  if (sname.includes('editing') || sname.includes('draft') || sid === 1) return 'editing';
  if (sname.includes('discontinued') || sid === 4) return 'discontinued';
  if (sname.includes('rejected') || sid === 7) return 'rejected';

  if (sid === 2) return 'in-qa';

  return 'editing';
}

/** The six status slots in the status section's order, with their labels (Status filter options, GLF-R-3). */
export const PORTFOLIO_STATUS_SLOTS: readonly { key: PortfolioStatusSegment['key']; label: string }[] = [
  { key: 'editing', label: 'Editing' },
  { key: 'in-qa', label: 'In QA' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'discontinued', label: 'Discontinued' }
];
