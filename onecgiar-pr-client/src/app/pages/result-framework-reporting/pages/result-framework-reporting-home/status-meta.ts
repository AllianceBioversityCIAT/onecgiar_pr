// Visual vocabulary mirrors the global completeness-* mapping in styles.scss:
// Editing → yellow, Submitted → brand indigo, Quality Assessed → blue, Discontinued → orange.
export interface StatusMetaEntry {
  label: string;
  barClass: string;
  chipClass: string;
  dotClass: string;
  /** CSS variable holding the status color, for canvas charts (resolved at runtime). */
  chartVar: string;
  order: number;
}

export const STATUS_META: Record<number, StatusMetaEntry> = {
  2: {
    label: 'QAed',
    barClass: 'bg-[var(--pr-color-blue-500)]',
    chipClass: 'bg-[var(--pr-color-blue-50)] text-[var(--pr-color-blue-700)]',
    dotClass: 'bg-[var(--pr-color-blue-500)]',
    chartVar: '--pr-color-blue-500',
    order: 1
  },
  3: {
    label: 'Submitted',
    barClass: 'bg-brand-300',
    chipClass: 'bg-brand-25 text-brand-400',
    dotClass: 'bg-brand-300',
    chartVar: '--pr-color-primary-300',
    order: 2
  },
  5: {
    label: 'Pending',
    barClass: 'bg-[var(--pr-color-accents-3)]',
    chipClass: 'bg-[var(--pr-color-accents-1)] text-[var(--pr-color-accents-6)]',
    dotClass: 'bg-[var(--pr-color-accents-3)]',
    chartVar: '--pr-color-accents-3',
    order: 3
  },
  1: {
    label: 'Editing',
    barClass: 'bg-[var(--pr-color-yellow-200)]',
    chipClass: 'bg-[var(--pr-color-yellow-75)] text-[var(--pr-color-yellow-600)]',
    dotClass: 'bg-[var(--pr-color-yellow-200)]',
    chartVar: '--pr-color-yellow-200',
    order: 4
  },
  4: {
    label: 'Discontinued',
    barClass: 'bg-[var(--pr-color-orange-500)]',
    chipClass: 'bg-[var(--pr-color-orange-75)] text-[var(--pr-color-orange-700)]',
    dotClass: 'bg-[var(--pr-color-orange-500)]',
    chartVar: '--pr-color-orange-500',
    order: 5
  }
};

// Statuses that count as "reported" when measuring submission progress per program.
export const REPORTED_STATUS_IDS = [2, 3];
