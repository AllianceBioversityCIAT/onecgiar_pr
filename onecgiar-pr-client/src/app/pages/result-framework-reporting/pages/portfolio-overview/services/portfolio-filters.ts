// @akili-spec changes/portfolio-overview-revamp/global-filters (GLF-T-2, design 6.2)
//
// Pure logic of the Portfolio overview global filters. No Angular, no HTTP, no state: types only from
// the service and the interface, so any block or service can import it without a cycle.
import type { PortfolioResultDimensions } from '../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import { naturalCodeCompare } from '../components/toc-kpi-block/toc-kpi.format';
import { TYPOLOGY_LEVELS, levelOf, type TypologyLevel } from '../components/typology-block/typology.aggregate';
import type { RawResult } from './portfolio-overview.service';
import { PORTFOLIO_STATUS_SLOTS, resolveStatusSlot } from './portfolio-status-slot';

/** The page rows as this module reads them. `id` is `r.id` (GLF-P-1); T-3 widens `RawResult` with it too. */
export type FilterRow = RawResult & { id?: number | string | null };

/** Dimensions in bar order (GLF-R-1). Every list of dimensions in this file follows it. */
export const FILTER_DIMENSIONS = ['program', 'project', 'center', 'typology', 'status'] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/**
 * The selection, one set per dimension. Values: `program` = P/A code, `project` = project id as a string,
 * `center` = CLARISA Center code, `typology` = a level key (`output`/`outcome`/`impact`/`unclassified`) or a
 * normalized type name, `status` = status slot key.
 */
export type PortfolioFilterSelection = { readonly [D in FilterDimension]: ReadonlySet<string> };

export const EMPTY_SELECTION: PortfolioFilterSelection = {
  program: new Set<string>(),
  project: new Set<string>(),
  center: new Set<string>(),
  typology: new Set<string>(),
  status: new Set<string>()
};

/** With a dimension: that dimension has a value. Without: any dimension has one. */
export function isActive(selection: PortfolioFilterSelection, dimension?: FilterDimension): boolean {
  return dimension ? selection[dimension].size > 0 : FILTER_DIMENSIONS.some(d => selection[d].size > 0);
}

export function activeDimensions(selection: PortfolioFilterSelection): FilterDimension[] {
  return FILTER_DIMENSIONS.filter(d => selection[d].size > 0);
}

// ---------------------------------------------------------------------------------------------
// Index + matching (GLF-R-2, DD-2, DD-5)
// ---------------------------------------------------------------------------------------------

/** `resultId -> Set<projectId as string>` and `resultId -> Set<centerCode>`, from the ACTIVE pairs of the map. */
export interface DimensionIndex {
  projects: Map<number, Set<string>>;
  centers: Map<number, Set<string>>;
}

export type MatchResult = 'match' | 'miss' | 'unknown';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Same normalisation `typology.aggregate.ts` applies to type names (kept local: it is a string rule, not the level map). */
const normalizeType = (value: unknown): string => text(value).replace(/\s+/g, ' ').toLowerCase();

function resultId(row: FilterRow): number | null {
  if (row.id === undefined || row.id === null || row.id === '') return null;
  const id = Number(row.id);
  return Number.isFinite(id) ? id : null;
}

function addPair<K, V>(target: Map<K, Set<V>>, key: K, value: V): void {
  const set = target.get(key);
  if (set) set.add(value);
  else target.set(key, new Set([value]));
}

export function buildDimensionIndex(map: Pick<PortfolioResultDimensions, 'projectLinks' | 'centerLinks'>): DimensionIndex {
  const projects = new Map<number, Set<string>>();
  const centers = new Map<number, Set<string>>();
  for (const [id, projectId] of map.projectLinks ?? []) addPair(projects, Number(id), String(projectId));
  for (const [id, code] of map.centerLinks ?? []) addPair(centers, Number(id), String(code));
  return { projects, centers };
}

const intersects = (linked: ReadonlySet<string> | undefined, selected: ReadonlySet<string>): boolean => {
  if (!linked) return false;
  for (const value of selected) if (linked.has(value)) return true;
  return false;
};

/**
 * AND across dimensions, OR inside one. Program, Typology and Status are decided from the row alone, so a
 * definite miss there wins. Project and Center go ONLY through the index (DD-2); with no index the answer is
 * `'unknown'`, never a match or a miss (DD-5): the caller shows a pending state.
 */
export function matchesRow(row: FilterRow, selection: PortfolioFilterSelection, index?: DimensionIndex | null): MatchResult {
  if (selection.program.size > 0 && !selection.program.has(text(row.submitter))) return 'miss';

  if (selection.typology.size > 0) {
    const type = normalizeType(row.result_type);
    const hit = selection.typology.has(levelOf(row.result_type)) || (type !== '' && selection.typology.has(type));
    if (!hit) return 'miss';
  }

  if (selection.status.size > 0 && !selection.status.has(resolveStatusSlot(row))) return 'miss';

  if (selection.center.size === 0 && selection.project.size === 0) return 'match';
  if (!index) return 'unknown';

  const id = resultId(row);
  if (selection.center.size > 0 && !intersects(id === null ? undefined : index.centers.get(id), selection.center)) return 'miss';
  if (selection.project.size > 0 && !intersects(id === null ? undefined : index.projects.get(id), selection.project)) return 'miss';
  return 'match';
}

// ---------------------------------------------------------------------------------------------
// Options (GLF-R-3) and sanitizing (GLF-R-14)
// ---------------------------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
}

export interface TypologyOptionGroup {
  level: TypologyLevel;
  /** The level token: selecting it selects every type of that level. */
  value: string;
  label: string;
  types: FilterOption[];
}

export interface PortfolioFilterOptions {
  program: FilterOption[];
  project: FilterOption[];
  center: FilterOption[];
  typology: TypologyOptionGroup[];
  status: FilterOption[];
}

export const TYPOLOGY_LEVEL_LABELS: Record<TypologyLevel, string> = {
  output: 'Output',
  outcome: 'Outcome',
  impact: 'Impact',
  unclassified: 'Unclassified'
};

const byLabel = (a: FilterOption, b: FilterOption): number => a.label.localeCompare(b.label) || a.value.localeCompare(b.value);

/**
 * The five option lists from the page data. Project and Center need the map: without it they are empty.
 * Projects: only those in `w3ProjectIds` (S-3.1). Centers: only those linked to a page row.
 */
export function buildOptions(rows: readonly FilterRow[], map?: PortfolioResultDimensions | null): PortfolioFilterOptions {
  // Program
  const programs = new Map<string, string>();
  for (const row of rows) {
    const code = text(row.submitter);
    if (!code) continue;
    const name = text(row.submitter_short_name) || text(row.submitter_name);
    if (!programs.get(code)) programs.set(code, name);
  }
  const program = [...programs.entries()]
    .sort(([a], [b]) => naturalCodeCompare(a, b))
    .map(([code, name]) => ({ value: code, label: name ? `${code} — ${name}` : code }));

  // Typology
  const typesByLevel = new Map<TypologyLevel, Map<string, string>>();
  for (const row of rows) {
    const level = levelOf(row.result_type);
    const types = typesByLevel.get(level) ?? new Map<string, string>();
    typesByLevel.set(level, types);
    const token = normalizeType(row.result_type);
    if (token && !types.has(token)) types.set(token, text(row.result_type).replace(/\s+/g, ' '));
  }
  const typology = TYPOLOGY_LEVELS.filter(level => typesByLevel.has(level)).map(level => ({
    level,
    value: level,
    label: TYPOLOGY_LEVEL_LABELS[level],
    types: [...(typesByLevel.get(level) ?? [])].map(([value, label]) => ({ value, label })).sort(byLabel)
  }));

  // Project and Center, through the map
  let project: FilterOption[] = [];
  let center: FilterOption[] = [];
  if (map) {
    const names = new Map(map.projects.map(p => [String(p.id), p]));
    project = [...new Set(map.w3ProjectIds.map(String))]
      .map(id => {
        const p = names.get(id);
        const label = text(p?.shortName) || text(p?.fullName) || id;
        const full = text(p?.fullName);
        return full ? { value: id, label, hint: full } : { value: id, label };
      })
      .sort(byLabel);

    const pageIds = new Set<number>();
    for (const row of rows) {
      const id = resultId(row);
      if (id !== null) pageIds.add(id);
    }
    const codes = new Set<string>();
    for (const [id, code] of map.centerLinks) if (pageIds.has(Number(id))) codes.add(String(code));
    const labels = new Map(map.centers.map(c => [c.code, c]));
    center = [...codes]
      .map(code => {
        const c = labels.get(code);
        return { value: code, label: text(c?.acronym) || text(c?.name) || code };
      })
      .sort(byLabel);
  }

  return {
    program,
    project,
    center,
    typology,
    status: PORTFOLIO_STATUS_SLOTS.map(slot => ({ value: slot.key, label: slot.label }))
  };
}

/** Drops every value that is not an option, per dimension. Never mutates its input. */
export function sanitize(selection: PortfolioFilterSelection, options: PortfolioFilterOptions): PortfolioFilterSelection {
  const keep = (selected: ReadonlySet<string>, valid: Set<string>) => new Set([...selected].filter(v => valid.has(v)));
  const typologyValues = new Set<string>();
  for (const group of options.typology) {
    typologyValues.add(group.value);
    for (const type of group.types) typologyValues.add(type.value);
  }
  return {
    program: keep(selection.program, new Set(options.program.map(o => o.value))),
    project: keep(selection.project, new Set(options.project.map(o => o.value))),
    center: keep(selection.center, new Set(options.center.map(o => o.value))),
    typology: keep(selection.typology, typologyValues),
    status: keep(selection.status, new Set(options.status.map(o => o.value)))
  };
}

// ---------------------------------------------------------------------------------------------
// URL codec (GLF-R-14, DD-11)
// ---------------------------------------------------------------------------------------------

/** Escapes only what would break the list (`%` and `,`); everything else stays readable. */
const escapePiece = (value: string): string => value.replace(/%/g, '%25').replace(/,/g, '%2C');

/** One param per active dimension, comma lists, empty dimensions omitted. The router does the URL encoding. */
export function toQueryParams(selection: PortfolioFilterSelection): Record<string, string> {
  const out: Record<string, string> = {};
  for (const dimension of FILTER_DIMENSIONS) {
    const values = [...selection[dimension]];
    if (values.length > 0) out[dimension] = values.map(escapePiece).join(',');
  }
  return out;
}

type ParamValue = string | readonly string[] | null | undefined;

const urlDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

function pieces(value: ParamValue): string[] {
  const parts = Array.isArray(value) ? (value as readonly string[]) : [value as string | null | undefined];
  const out: string[] = [];
  for (const part of parts) {
    if (typeof part !== 'string') continue;
    for (const piece of part.split(',')) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      try {
        out.push(decodeURIComponent(trimmed));
      } catch {
        // a malformed escape is an unknown value: dropped, like any other (GLF-R-14)
      }
    }
  }
  return out;
}

/**
 * Reads a selection from a raw query string (`?program=SP02,ZZ99`) or from the router's params object. The
 * result is NOT validated: run `sanitize` once the options exist, so unknown values are dropped.
 */
export function parseQueryParams(input: string | Readonly<Record<string, ParamValue>>): PortfolioFilterSelection {
  let params: Record<string, ParamValue>;
  if (typeof input === 'string') {
    params = {};
    for (const pair of input.replace(/^\?/, '').split('&')) {
      if (!pair) continue;
      const at = pair.indexOf('=');
      const key = urlDecode(at < 0 ? pair : pair.slice(0, at));
      if (at >= 0) params[key] = urlDecode(pair.slice(at + 1));
    }
  } else {
    params = { ...input };
  }
  const read = (dimension: FilterDimension): ReadonlySet<string> => new Set(pieces(params[dimension]));
  return { program: read('program'), project: read('project'), center: read('center'), typology: read('typology'), status: read('status') };
}

// ---------------------------------------------------------------------------------------------
// Which section honours which dimension (GLF-R-9, R-5)
// ---------------------------------------------------------------------------------------------

export type FilterSection = 'kpi' | 'status' | 'typology' | 'centers' | 'toc' | 'projects';

export const SECTION_HONOURS: Readonly<Record<FilterSection, readonly FilterDimension[]>> = {
  kpi: FILTER_DIMENSIONS,
  status: FILTER_DIMENSIONS,
  typology: FILTER_DIMENSIONS,
  centers: FILTER_DIMENSIONS,
  toc: ['program'],
  projects: ['program', 'center']
};

/**
 * The ACTIVE dimensions the section does not honour, in bar order. `extra` marks further dimensions as
 * un-honoured (the Centers block adds Project between cycles); it never makes an inactive one appear.
 */
export function notAffectedBy(section: FilterSection, selection: PortfolioFilterSelection, extra: readonly FilterDimension[] = []): FilterDimension[] {
  const honoured = SECTION_HONOURS[section];
  return activeDimensions(selection).filter(d => !honoured.includes(d) || extra.includes(d));
}

/** True when the Results Center can apply the selection: only Program and Status, at most one value each. */
export function resultsCenterLinkable(selection: PortfolioFilterSelection): boolean {
  return activeDimensions(selection).every(d => (d === 'program' || d === 'status') && selection[d].size <= 1);
}
