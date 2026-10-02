import { PROJECT_CENTER_FILTER_COPY } from '../../internationalization/project-center-filter.copy';

/**
 * P2-3860 — pure helpers for the Center filter pills inside a "Contributing W3/bilateral projects"
 * dropdown (the W1/W2 pooled result form). Same contract as the W3/Bilateral form's pills (P2-3859,
 * `pages/bilateral/components/section-contributors`): view-only, they swap the dropdown OPTIONS,
 * never the selection, and never save.
 *
 * No Angular here on purpose: the caller decides how to read a project's owner Center and id, so
 * the same helpers fit any projects payload.
 */

/** The "All centers" value of the filter. */
export const ALL_PROJECT_CENTERS = 'all';
export type ProjectCenterFilter = number | typeof ALL_PROJECT_CENTERS;

/** A project's owner Center as read from the payload; `null` when the project has no resolved owner. */
export interface ProjectOwner {
  id: number;
  acronym?: string | null;
  name?: string | null;
}

export interface ProjectOwnerCenter {
  id: number;
  acronym: string;
  name: string;
  count: number;
}

export interface ProjectCenterPill {
  value: ProjectCenterFilter;
  label: string;
  title: string;
  count: number;
  active: boolean;
}

/**
 * Every Center that owns at least one of `projects`, with how many it owns, sorted by acronym
 * (then id, so ties are stable). Projects whose owner cannot be resolved count nowhere: they are
 * only listed under "All centers". Label falls back acronym → name → id.
 */
export function collectProjectOwnerCenters<T>(projects: readonly T[] | null | undefined, ownerOf: (project: T) => ProjectOwner | null): ProjectOwnerCenter[] {
  const byId = new Map<number, ProjectOwnerCenter>();
  for (const project of projects ?? []) {
    const owner = ownerOf(project);
    if (owner?.id == null) continue;
    const id = Number(owner.id);
    if (!Number.isFinite(id)) continue;
    const entry = byId.get(id);
    if (entry) {
      entry.count += 1;
      continue;
    }
    const name = (owner.name ?? '').trim();
    const acronym = (owner.acronym ?? '').trim() || name || String(id);
    byId.set(id, { id, acronym, name, count: 1 });
  }
  return [...byId.values()].sort((a, b) => a.acronym.localeCompare(b.acronym) || a.id - b.id);
}

/**
 * `[● All centers (1211)] [AfricaRice (12)] [Bioversity (40)] …` — "All centers" first, then the
 * given Centers in the given order. Exactly one pill is active. Empty when no Center owns a project
 * (a lone "All centers" pill would filter nothing).
 */
export function buildProjectCenterPills(centers: readonly ProjectOwnerCenter[], total: number, active: ProjectCenterFilter): ProjectCenterPill[] {
  if (!centers.length) return [];
  const copy = PROJECT_CENTER_FILTER_COPY;
  return [
    {
      value: ALL_PROJECT_CENTERS,
      label: copy.allCenters,
      title: copy.pillTitle(copy.allCenters, total),
      count: total,
      active: active === ALL_PROJECT_CENTERS
    },
    ...centers.map(c => ({
      value: c.id as ProjectCenterFilter,
      label: c.acronym,
      title: copy.pillTitle(c.name || c.acronym, c.count),
      count: c.count,
      active: active === c.id
    }))
  ];
}

/** The filter actually applied: a choice that no longer names a Center pill (list reloaded) falls back to "All centers". */
export function resolveProjectCenterFilter(choice: ProjectCenterFilter | null | undefined, centers: readonly ProjectOwnerCenter[]): ProjectCenterFilter {
  if (choice == null || choice === ALL_PROJECT_CENTERS) return ALL_PROJECT_CENTERS;
  return centers.some(c => c.id === choice) ? choice : ALL_PROJECT_CENTERS;
}

/**
 * The dropdown options for `filter`: the Center's own projects PLUS every already-selected project,
 * whatever its Center, in the original order. "All centers" returns `projects` itself (same reference).
 *
 * 🛑 The union is load-bearing: `app-pr-multi-select.writeValue` maps an id model against `[options]`
 * and drops the misses, and its checkboxes only reflect selected rows that are in the options — a
 * selected project of another Center must never vanish just because a pill is pressed.
 */
export function filterProjectsByOwnerCenter<T>(
  projects: readonly T[] | null | undefined,
  filter: ProjectCenterFilter,
  ownerIdOf: (project: T) => number | null | undefined,
  projectIdOf: (project: T) => unknown,
  selectedProjectIds: ReadonlySet<string>
): T[] {
  const list = (projects ?? []) as T[];
  if (filter === ALL_PROJECT_CENTERS) return list;
  return list.filter(p => {
    const owner = ownerIdOf(p);
    if (owner != null && Number(owner) === filter) return true;
    const id = projectIdOf(p);
    return id != null && selectedProjectIds.has(String(id));
  });
}
