import type { RawResult } from '../../services/portfolio-overview.service';

/**
 * Typology view (spec typology-view, TYV-R-1..R-5) — pure aggregation of the page rows by level
 * (Output / Outcome / Impact) and by Program / Accelerator or lead Center. One pass per function.
 */
export type TypologyLevel = 'output' | 'outcome' | 'impact' | 'unclassified';

export const TYPOLOGY_LEVELS: readonly TypologyLevel[] = ['output', 'outcome', 'impact', 'unclassified'];

export interface LevelCard {
  level: TypologyLevel;
  count: number;
  /** Whole percent of the page total; 0 when the total is 0. */
  percent: number;
  /** `name` is '' when the row has no type; the view turns it into copy. */
  types: { name: string; count: number }[];
}

export interface BreakdownRow {
  /** Code / acronym, or '' for the catch-all row (the view turns it into copy). */
  key: string;
  name?: string;
  total: number;
  byLevel: Record<TypologyLevel, number>;
}

export interface Breakdown {
  rows: BreakdownRow[];
  /** True when any row of THIS breakdown is unclassified (per dimension; the view derives the page-wide column rule from the cards). */
  showUnclassified: boolean;
}

/** TYV-R-1 — canonical type name → level (spelling as in `CATEGORY_SHORT_NAMES`). */
const TYPE_LEVELS: Record<string, TypologyLevel> = {
  'Capacity sharing for development': 'output',
  'Knowledge product': 'output',
  'Innovation development': 'output',
  'Other output': 'output',
  'Policy change': 'outcome',
  'Innovation use': 'outcome',
  'Capacity change': 'outcome',
  'Other outcome': 'outcome',
  'Impact contribution': 'impact'
};

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

const CANONICAL_BY_KEY = new Map<string, string>(Object.keys(TYPE_LEVELS).map(name => [normalize(name), name]));

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const W3_SOURCE = 'W3/Bilaterals';

const emptyByLevel = (): Record<TypologyLevel, number> => ({ output: 0, outcome: 0, impact: 0, unclassified: 0 });

/** Canonical name of a mapped type, or undefined when the type is outside the map. */
function canonicalType(type: unknown): string | undefined {
  return CANONICAL_BY_KEY.get(normalize(text(type)));
}

export function levelOf(type?: string | null): TypologyLevel {
  const canonical = canonicalType(type);
  return canonical ? TYPE_LEVELS[canonical] : 'unclassified';
}

/** Display name of a row's type: canonical when mapped, its own trimmed name otherwise, '' when missing. */
const displayType = (type: unknown): string => canonicalType(type) ?? text(type);

export function levelCards(rows: readonly RawResult[]): LevelCard[] {
  const counts = emptyByLevel();
  const types: Record<TypologyLevel, Map<string, number>> = {
    output: new Map(),
    outcome: new Map(),
    impact: new Map(),
    unclassified: new Map()
  };
  for (const row of rows) {
    const level = levelOf(row.result_type);
    const name = displayType(row.result_type);
    counts[level]++;
    types[level].set(name, (types[level].get(name) ?? 0) + 1);
  }
  const total = rows.length;
  return TYPOLOGY_LEVELS.map(level => ({
    level,
    count: counts[level],
    percent: total > 0 ? Math.round((counts[level] / total) * 100) : 0,
    types: [...types[level]].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }));
}

interface Grouped {
  key: string;
  name?: string;
  total: number;
  byLevel: Record<TypologyLevel, number>;
}

function group(rows: readonly RawResult[], keyOf: (row: RawResult) => string, nameOf: (row: RawResult) => string): Breakdown {
  const groups = new Map<string, Grouped>();
  let showUnclassified = false;
  for (const row of rows) {
    const key = keyOf(row);
    let entry = groups.get(key);
    if (!entry) {
      entry = { key, total: 0, byLevel: emptyByLevel() };
      groups.set(key, entry);
    }
    if (!entry.name) entry.name = nameOf(row) || undefined;
    const level = levelOf(row.result_type);
    entry.total++;
    entry.byLevel[level]++;
    if (level === 'unclassified') showUnclassified = true;
  }
  const ordered = [...groups.values()].sort((a, b) => {
    if (a.key === '' || b.key === '') return a.key === '' ? 1 : -1;
    return a.key.localeCompare(b.key);
  });
  return {
    rows: ordered.map(entry => ({
      key: entry.key,
      ...(entry.name && entry.key !== '' ? { name: entry.name } : {}),
      total: entry.total,
      byLevel: entry.byLevel
    })),
    showUnclassified
  };
}

/** TYV-R-4 — all sources, keyed by `submitter`; rows without a code go to the '' catch-all. */
export function breakdownByProgram(rows: readonly RawResult[]): Breakdown {
  return group(
    rows,
    row => text(row.submitter),
    row => text(row.submitter_short_name) || text(row.submitter_name)
  );
}

/** TYV-R-5 — W3/Bilateral rows only, keyed by the trimmed lead Center; empty goes to the '' catch-all. */
export function breakdownByCenter(rows: readonly RawResult[]): Breakdown {
  return group(
    rows.filter(row => text(row.source_name) === W3_SOURCE),
    row => text(row.lead_center),
    () => ''
  );
}
