/** Shared result level/type map for the W3 bilateral create wizard and manual drawer form. */
export const RESULT_TYPES_BY_LEVEL: Record<number, { id: number; label: string }[]> = {
  3: [
    { id: 1, label: 'Policy Change' },
    { id: 2, label: 'Innovation Use' },
    { id: 4, label: 'Other Outcome' }
  ],
  4: [
    { id: 5, label: 'Capacity Sharing for Development' },
    { id: 6, label: 'Knowledge Product' },
    { id: 7, label: 'Innovation Development' },
    { id: 8, label: 'Other Output' }
  ]
};

export const RESULT_LEVEL_LABELS: Record<number, string> = {
  3: 'Outcome',
  4: 'Output'
};
