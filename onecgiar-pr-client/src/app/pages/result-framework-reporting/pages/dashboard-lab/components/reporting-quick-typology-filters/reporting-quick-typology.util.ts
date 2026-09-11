export interface ResultTypeQuickChip {
  id: string;
  label: string;
  matchKey: string;
  count?: number;
  active: boolean;
}

export const QUICK_TYPOLOGIES = [
  { id: 'all', label: 'All', matchKey: 'all' },
  { id: 'kp', label: 'Knowledge Product', matchKey: 'Knowledge product' },
  { id: 'id', label: 'Innovation Development', matchKey: 'Innovation development' },
  { id: 'pc', label: 'Policy Change', matchKey: 'Policy change' },
  { id: 'iu', label: 'Innovation Use', matchKey: 'Innovation use' },
  { id: 'cs', label: 'Capacity Sharing', matchKey: 'Capacity sharing for development' }
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
      matchKey: item.matchKey,
      count,
      active
    };
  });
}
