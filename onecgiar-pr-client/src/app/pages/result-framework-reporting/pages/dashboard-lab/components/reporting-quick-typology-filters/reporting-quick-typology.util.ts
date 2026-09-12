export interface ResultTypeQuickChip {
  id: string;
  label: string;
  /** Abbreviated label for compact laptop toolbars (≤1366px). */
  shortLabel: string;
  matchKey: string;
  count?: number;
  active: boolean;
}

export const QUICK_TYPOLOGIES = [
  { id: 'all', label: 'All', shortLabel: 'All', matchKey: 'all' },
  { id: 'kp', label: 'Knowledge Product', shortLabel: 'KP', matchKey: 'Knowledge product' },
  { id: 'id', label: 'Innovation Development', shortLabel: 'ID', matchKey: 'Innovation development' },
  { id: 'pc', label: 'Policy Change', shortLabel: 'PC', matchKey: 'Policy change' },
  { id: 'iu', label: 'Innovation Use', shortLabel: 'IU', matchKey: 'Innovation use' },
  { id: 'cs', label: 'Capacity Sharing', shortLabel: 'CS', matchKey: 'Capacity sharing for development' }
] as const;

export function buildQuickTypologyChips(
  typologyValue: string[] | null | undefined,
  typologyCounts: Record<string, number> | null | undefined,
  plannedResultsCount: number
): ResultTypeQuickChip[] {
  const currentTypologies = typologyValue || [];
  const counts = typologyCounts ?? {};
  const isAll = currentTypologies.length === 0;

  return QUICK_TYPOLOGIES.map(item => {
    const active =
      item.matchKey === 'all'
        ? isAll
        : currentTypologies.some(t => t === item.matchKey || t.toLowerCase() === item.label.toLowerCase());

    const count =
      item.matchKey === 'all'
        ? (counts['all'] ?? plannedResultsCount)
        : (counts[item.matchKey] ?? counts[item.label] ?? 0);

    return {
      id: item.id,
      label: item.label,
      shortLabel: item.shortLabel,
      matchKey: item.matchKey,
      count,
      active
    };
  });
}
