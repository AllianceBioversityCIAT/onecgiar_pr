/** Builds a lookup of reported bilateral result counts keyed by Clarisa `project_id`. */
export function buildReportedResultsByProjectId(
  groups: Array<{ project_id?: number | string | null; results?: unknown[] | null }> | null | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  for (const group of groups ?? []) {
    const id = group?.project_id;
    if (id == null || id === '') continue;
    map.set(String(id), group?.results?.length ?? 0);
  }
  return map;
}
