import type { RawResult } from '../../services/portfolio-overview.service';
import { fundingOf } from '../../services/portfolio-filters';
import { resolveStatusSlot } from '../../services/portfolio-status-slot';
import { naturalCodeCompare } from '../toc-kpi-block/toc-kpi.format';

/**
 * Typology view (spec typology-view, TYV-R-1..R-5) — pure aggregation of the page rows by level
 * (Output / Outcome / Impact) and the Program x status x type matrix. One pass per function.
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

export type StatusBucket = 'submitted' | 'editing';

export interface ProgramTypeRow {
  key: string;
  name?: string;
  submitted: Map<string, number>;
  editing: Map<string, number>;
  total: number;
}

export interface ProgramTypeMatrix {
  programs: ProgramTypeRow[];
  types: { key: string; name: string; level: TypologyLevel }[];
}

/** TBC-DD-2 — same rule as the Status filter: only the `editing` slot is Editing; every other slot is Submitted. */
export function statusBucket(row: RawResult): StatusBucket {
  return resolveStatusSlot(row) === 'editing' ? 'editing' : 'submitted';
}

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const LEVEL_RANK: Record<TypologyLevel, number> = { output: 0, outcome: 1, impact: 2, unclassified: 3 };
const TYPE_ORDER = new Map<string, number>(Object.keys(TYPE_LEVELS).map((name, index) => [name, index]));

/** Grouping rule of a matrix: row key, optional display name, and the order of the row keys ('' = catch-all, always last). */
interface MatrixGrouping {
  keyOf: (row: RawResult) => string;
  nameOf?: (row: RawResult) => string | undefined;
  compare: (a: string, b: string) => number;
}

/** Status bucket x result type counts per group, one pass (TBC-R-2; TBC-DD-9 generalises the key). Type key is the canonical name, '' = Unclassified. */
function typeMatrix(rows: readonly RawResult[], grouping: MatrixGrouping): ProgramTypeMatrix {
  const programs = new Map<string, ProgramTypeRow>();
  const typeKeys = new Set<string>();
  for (const row of rows) {
    const key = grouping.keyOf(row);
    let entry = programs.get(key);
    if (!entry) {
      entry = { key, submitted: new Map(), editing: new Map(), total: 0 };
      programs.set(key, entry);
    }
    if (!entry.name && key !== '') entry.name = grouping.nameOf?.(row) || undefined;
    const typeKey = canonicalType(row.result_type) ?? '';
    typeKeys.add(typeKey);
    bump(statusBucket(row) === 'editing' ? entry.editing : entry.submitted, typeKey);
    entry.total++;
  }
  const ordered = [...programs.values()].sort((a, b) => {
    if (a.key === '' || b.key === '') return a.key === '' ? 1 : -1;
    return grouping.compare(a.key, b.key);
  });
  const types = [...typeKeys]
    .map(key => ({ key, name: key, level: levelOf(key) }))
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || (TYPE_ORDER.get(a.key) ?? 0) - (TYPE_ORDER.get(b.key) ?? 0));
  return { programs: ordered, types };
}

/** TBC-R-2 — P/A x status bucket x result type counts. Natural code order (SP2 before SP10), catch-all last. */
export function programTypeMatrix(rows: readonly RawResult[]): ProgramTypeMatrix {
  return typeMatrix(rows, {
    keyOf: row => text(row.submitter),
    nameOf: row => text(row.submitter_short_name) || text(row.submitter_name),
    compare: naturalCodeCompare
  });
}

/** TBC-R-10 / DD-9 — same matrix for W3/Bilateral rows only, keyed by trimmed lead Center, A to Z, rows without one last. */
export function centerTypeMatrix(rows: readonly RawResult[]): ProgramTypeMatrix {
  return typeMatrix(
    rows.filter(row => fundingOf(row) === 'bilateral'),
    { keyOf: row => text(row.lead_center), compare: (a, b) => a.localeCompare(b) }
  );
}
