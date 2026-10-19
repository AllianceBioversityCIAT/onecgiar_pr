// @akili-spec changes/portfolio-overview-revamp/filtered-detail-export (FDE-T-1, design 5.1)
//
// Pure logic of the Results detail section: detail rows, search, sort, page and Excel rows. No Angular, no
// HTTP, no state. Empty cells are explicit strings (FDE-DD-3) so "none" and "unknown" stay distinct.
import type { PortfolioResultDimensions } from '../../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import type { PortfolioDimensionsState, RawResult } from '../../services/portfolio-overview.service';
import { PORTFOLIO_STATUS_SLOTS, resolveStatusSlot } from '../../services/portfolio-status-slot';
import { TYPOLOGY_LEVEL_LABELS } from '../../services/portfolio-filters';
import { levelOf } from '../typology-block/typology.aggregate';

export const NONE = '—';
export const UNAVAILABLE = 'Unavailable';
export const PAGE_SIZE = 25;

const W3_SOURCE = 'W3/Bilaterals';

/** Detail row: client-only view model. Carries no creator fields by construction (FDE-R-8, S-8.1). */
export interface DetailRow {
  id: number | string | null;
  /** Display code ('—' when missing). */
  code: string;
  /** Numeric code for sorting; -1 when missing. */
  codeSort: number;
  title: string;
  type: string;
  level: string;
  program: string;
  source: string;
  status: string;
  origin: 'New' | 'Replicated';
  leadCenter: string;
  contributingCenters: string;
  projects: string;
  phase: string;
  /** `version_id` of the row: the phase of the result-detail link (FDE-A-1). */
  versionId: number | string | null;
}

export type DetailSortKey = 'code' | 'title' | 'type' | 'level' | 'program' | 'source' | 'status' | 'origin' | 'leadCenter' | 'phase';
export type SortDirection = 'asc' | 'desc';

/** Map labels per result id: project short names and Center acronyms (from the dimensions map). */
export interface DetailLabels {
  projects: ReadonlyMap<number, readonly string[]>;
  centers: ReadonlyMap<number, readonly string[]>;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const orNone = (value: unknown): string => text(value) || NONE;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function addLabel(target: Map<number, string[]>, id: number, label: string): void {
  const list = target.get(id);
  if (list) list.push(label);
  else target.set(id, [label]);
}

/** Resolves the map's ids to labels once per result: project short name, Center acronym (fallbacks: full name / name / id / code). */
export function buildDetailLabels(map: Pick<PortfolioResultDimensions, 'projectLinks' | 'centerLinks' | 'projects' | 'centers'>): DetailLabels {
  const projectNames = new Map((map.projects ?? []).map(p => [String(p.id), text(p.shortName) || text(p.fullName) || String(p.id)]));
  const centerNames = new Map((map.centers ?? []).map(c => [String(c.code), text(c.acronym) || text(c.name) || String(c.code)]));
  const projects = new Map<number, string[]>();
  const centers = new Map<number, string[]>();
  for (const [id, projectId] of map.projectLinks ?? []) addLabel(projects, Number(id), projectNames.get(String(projectId)) ?? String(projectId));
  for (const [id, code] of map.centerLinks ?? []) addLabel(centers, Number(id), centerNames.get(String(code)) ?? String(code));
  return { projects, centers };
}

const joinSorted = (labels: Iterable<string>): string => {
  const unique = [...new Set([...labels].map(l => l.trim()).filter(Boolean))].sort(collator.compare);
  return unique.length > 0 ? unique.join(', ') : NONE;
};

function rowId(row: RawResult): number | null {
  if (row.id === undefined || row.id === null || row.id === '') return null;
  const id = Number(row.id);
  return Number.isFinite(id) ? id : null;
}

/**
 * One detail row per page row, same order and multiplicity (no dedupe, S-2.3). The map columns read
 * "Unavailable" unless the map is ready (S-3.1); contributing Centers = the map's acronyms minus the row's lead (A-2).
 */
export function toDetailRows(rows: readonly RawResult[], mapStatus: PortfolioDimensionsState['status'], labels: DetailLabels): DetailRow[] {
  const ready = mapStatus === 'ready';
  const statusLabels = new Map(PORTFOLIO_STATUS_SLOTS.map(slot => [slot.key, slot.label]));
  return rows.map(row => {
    const id = rowId(row);
    const lead = text(row.lead_center);
    const code = row.result_code === undefined || row.result_code === null ? '' : String(row.result_code).trim();
    const codeNumber = Number(code);

    let contributing = UNAVAILABLE;
    let projects = UNAVAILABLE;
    if (ready) {
      const centers = id === null ? [] : (labels.centers.get(id) ?? []);
      contributing = joinSorted(centers.filter(c => c.trim().toLowerCase() !== lead.toLowerCase()));
      projects = joinSorted(id === null ? [] : (labels.projects.get(id) ?? []));
    }

    return {
      id: row.id ?? null,
      code: code || NONE,
      codeSort: code !== '' && Number.isFinite(codeNumber) ? codeNumber : -1,
      title: orNone(row.title),
      type: orNone(row.result_type),
      level: TYPOLOGY_LEVEL_LABELS[levelOf(row.result_type)],
      program: orNone(row.submitter),
      source: text(row.source_name) === W3_SOURCE ? 'W3/Bilateral' : 'W1/W2',
      status: statusLabels.get(resolveStatusSlot(row)) ?? NONE,
      origin: Number(row.is_replicated) === 1 ? 'Replicated' : 'New',
      leadCenter: orNone(lead),
      contributingCenters: contributing,
      projects,
      phase: orNone(row.phase_name),
      versionId: row.version_id ?? null
    };
  });
}

/** FDE-R-5: trimmed, case-insensitive `includes` on code and title. Blank text returns the same array. */
export function searchRows(rows: readonly DetailRow[], textInput: string): readonly DetailRow[] {
  const needle = (textInput ?? '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(r => r.code.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle));
}

/** FDE-R-4: stable sort on a copy over the WHOLE array. Code is numeric; text columns use one numeric collator. */
export function sortRows(rows: readonly DetailRow[], key: DetailSortKey, direction: SortDirection): DetailRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  const compare = key === 'code' ? (a: DetailRow, b: DetailRow) => a.codeSort - b.codeSort : (a: DetailRow, b: DetailRow) => collator.compare(a[key], b[key]);
  return [...rows].sort((a, b) => sign * compare(a, b));
}

export interface PageSlice<T> {
  rows: T[];
  page: number;
  from: number;
  to: number;
  total: number;
  pages: number;
}

/** FDE-R-7: clamped page slice plus the "x-y of M" range. An empty list is page 1 of 1, range 0-0. */
export function pageOf<T>(rows: readonly T[], page: number, size: number = PAGE_SIZE): PageSlice<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pages);
  const start = (current - 1) * size;
  const slice = rows.slice(start, start + size);
  return { rows: slice, page: current, from: total === 0 ? 0 : start + 1, to: start + slice.length, total, pages };
}

/** FDE-P-8, FDE-R-6: absolute result URL in its phase. */
export function resultUrl(code: number | string, versionId: number | string | null | undefined, origin: string): string {
  const base = `${origin}/result/result-detail/${code}/general-information`;
  return versionId === null || versionId === undefined || versionId === '' ? base : `${base}?phase=${versionId}`;
}

export const EXPORT_COLUMNS = [
  'Code',
  'Title',
  'Type',
  'Level',
  'P/A',
  'Source',
  'Status',
  'Origin',
  'Lead Center',
  'Contributing Centers',
  'Projects',
  'Phase',
  'Link'
] as const;

/** FDE-R-8: plain objects, keys in R-3 order plus `Link`; full title; never a null cell (DD-3). */
export function toExportRows(rows: readonly DetailRow[], origin: string): Record<(typeof EXPORT_COLUMNS)[number], string>[] {
  return rows.map(r => ({
    Code: r.code,
    Title: r.title,
    Type: r.type,
    Level: r.level,
    'P/A': r.program,
    Source: r.source,
    Status: r.status,
    Origin: r.origin,
    'Lead Center': r.leadCenter,
    'Contributing Centers': r.contributingCenters,
    Projects: r.projects,
    Phase: r.phase,
    Link: r.code === NONE ? NONE : resultUrl(r.code, r.versionId, origin)
  }));
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** `PRMS_portfolio_results_<phase-slug>_<YYYY-MM-DD>[_partial].xlsx` (FDE-R-8, FDE-R-10). */
export function exportFileName(phase: string, date: Date, partial: boolean): string {
  const slug = (phase ?? '').trim().replace(/[^A-Za-z0-9-]/g, '_');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `PRMS_portfolio_results_${slug}_${day}${partial ? '_partial' : ''}.xlsx`;
}
