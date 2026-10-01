import {
  ALL_PROJECT_CENTERS,
  buildProjectCenterPills,
  collectProjectOwnerCenters,
  filterProjectsByOwnerCenter,
  resolveProjectCenterFilter
} from './project-center-filter.util';

interface Row {
  project_id: number;
  organization_id: number | null;
  organization_acronym?: string | null;
  organization_name?: string | null;
}

const rows: Row[] = [
  { project_id: 1, organization_id: 30, organization_acronym: 'IFPRI', organization_name: 'International Food Policy Research Institute' },
  { project_id: 2, organization_id: 10, organization_acronym: 'CIP', organization_name: 'International Potato Center' },
  { project_id: 3, organization_id: 30, organization_acronym: 'IFPRI', organization_name: 'International Food Policy Research Institute' },
  { project_id: 4, organization_id: null },
  { project_id: 5, organization_id: 20, organization_acronym: 'AfricaRice', organization_name: 'Africa Rice Center' },
  { project_id: 6, organization_id: 40, organization_acronym: null, organization_name: 'No Acronym Center' }
];
const ownerOf = (r: Row) => (r.organization_id == null ? null : { id: r.organization_id, acronym: r.organization_acronym, name: r.organization_name });

describe('project-center-filter.util (P2-3860)', () => {
  it('collects every owner Center with its count, by acronym; no-owner rows count nowhere; label falls back to the name', () => {
    const centers = collectProjectOwnerCenters(rows, ownerOf);
    expect(centers.map(c => `${c.acronym} (${c.count})`)).toEqual(['AfricaRice (1)', 'CIP (1)', 'IFPRI (2)', 'No Acronym Center (1)']);
  });

  it('builds "All centers" first, then the Centers, exactly one pill active, full name in the title', () => {
    const centers = collectProjectOwnerCenters(rows, ownerOf);
    const pills = buildProjectCenterPills(centers, rows.length, ALL_PROJECT_CENTERS);
    expect(pills.map(p => `${p.label} (${p.count})${p.active ? ' *' : ''}`)).toEqual([
      'All centers (6) *',
      'AfricaRice (1)',
      'CIP (1)',
      'IFPRI (2)',
      'No Acronym Center (1)'
    ]);
    expect(pills[3].title).toBe('International Food Policy Research Institute (2 projects)');
    expect(buildProjectCenterPills(centers, 6, 30).filter(p => p.active).map(p => p.value)).toEqual([30]);
  });

  it('no Center owns anything → no pills at all', () => {
    expect(buildProjectCenterPills([], 3, ALL_PROJECT_CENTERS)).toEqual([]);
  });

  it('a choice that no longer names a Center falls back to "All centers"', () => {
    const centers = collectProjectOwnerCenters(rows, ownerOf);
    expect(resolveProjectCenterFilter(30, centers)).toBe(30);
    expect(resolveProjectCenterFilter(999, centers)).toBe(ALL_PROJECT_CENTERS);
    expect(resolveProjectCenterFilter(null, centers)).toBe(ALL_PROJECT_CENTERS);
  });

  it('filters to the Center PLUS the already-selected projects (union), keeping order; All returns the same array', () => {
    const selected = new Set(['2']);
    const ids = filterProjectsByOwnerCenter(rows, 30, r => r.organization_id, r => r.project_id, selected).map(r => r.project_id);
    expect(ids).toEqual([1, 2, 3]);
    expect(filterProjectsByOwnerCenter(rows, ALL_PROJECT_CENTERS, r => r.organization_id, r => r.project_id, selected)).toBe(rows);
  });
});
