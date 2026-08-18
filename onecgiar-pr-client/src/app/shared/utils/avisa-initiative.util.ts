export interface AvisaInitiativeLike {
  id?: number;
  initiative_id?: number;
  initiativeId?: number;
  official_code?: string;
  initiativeCode?: string;
  initiative_official_code?: string;
}

/** SGP-02 / AVISA — excluded from Contributing Science Program entry dropdowns (P2-3131). */
export function isAvisaInitiative(item: AvisaInitiativeLike | null | undefined): boolean {
  if (!item) return false;

  const code = (item.official_code ?? item.initiativeCode ?? item.initiative_official_code ?? '').trim().toUpperCase();
  const id = Number(item.initiative_id ?? item.id ?? item.initiativeId);

  return code === 'SGP-02' || code === 'SGP02' || id === 41;
}

export function filterOutAvisaInitiatives<T extends AvisaInitiativeLike>(items: T[] | null | undefined): T[] {
  return (items ?? []).filter(item => !isAvisaInitiative(item));
}

export interface InitiativeEntityGroup {
  name?: string;
  entities?: AvisaInitiativeLike[];
}

/** User-management entity groups (P25/P22) — drop AVISA entities and empty groups. */
export function filterOutAvisaFromInitiativeEntityGroups<T extends InitiativeEntityGroup>(
  groups: T[] | null | undefined
): T[] {
  return (groups ?? [])
    .map(group => ({
      ...group,
      entities: filterOutAvisaInitiatives(group.entities)
    }))
    .filter(group => (group.entities?.length ?? 0) > 0);
}

type GroupedInitiativeOption = AvisaInitiativeLike & { isLabel?: boolean; typeCode?: string; code?: string };

/** Result-creator grouped list (label rows + initiatives) — omit AVISA and orphan labels. */
export function filterOutAvisaFromGroupedInitiativeOptions<T extends GroupedInitiativeOption>(items: T[] | null | undefined): T[] {
  const filtered = (items ?? []).filter(item => item.isLabel || !isAvisaInitiative(item));
  const result: T[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i];
    if (!item.isLabel) {
      result.push(item);
      continue;
    }

    const groupCode = item.code ?? item.typeCode;
    const hasInitiatives = filtered.slice(i + 1).some(next => !next.isLabel && next.typeCode === groupCode);
    if (hasInitiatives) {
      result.push(item);
    }
  }

  return result;
}
