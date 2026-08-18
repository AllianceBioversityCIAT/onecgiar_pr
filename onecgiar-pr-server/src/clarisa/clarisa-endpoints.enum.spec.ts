import { ClarisaEndpoints } from './clarisa-endpoints.enum';
import { ClarisaGlobalUnit } from './clarisa-global-unit/entities/clarisa-global-unit.entity';

describe('ClarisaEndpoints', () => {
  it('should expose global units endpoint pointing to version 2', () => {
    const endpoint = ClarisaEndpoints.GLOBAL_UNITS;

    expect(endpoint.path).toBe('cgiar-entities');
    expect(endpoint.method).toBe('GET');
    expect(endpoint.entity).toBe(ClarisaGlobalUnit);
    expect(endpoint.params).toMatchObject({ version: 2 });
  });

  it('should keep institution endpoint configured to fetch all records', () => {
    const endpoint = ClarisaEndpoints.INSTITUTIONS_FULL;

    expect(endpoint.path).toBe('institutions');
    expect(endpoint.params).toMatchObject({ show: 'all' });
    expect(typeof endpoint.mapper).toBe('function');
  });

  it('should not send a phase param on the projects endpoint by default', () => {
    // W3 Registry phase filtering (PROJECTS_W3_PARAMS) is intentionally not wired
    // in yet — see the comment on ClarisaEndpoints.PROJECTS.
    expect(ClarisaEndpoints.PROJECTS.path).toBe('projects');
    expect(ClarisaEndpoints.PROJECTS.params).toBeUndefined();
  });

  it('projectMapper should carry W3 Registry fields through', () => {
    const [mapped] = ClarisaEndpoints.projectMapper([
      {
        id: 1,
        phase: 2026,
        external_source: 'W3_REGISTRY',
        external_project_id: 'W3-123',
        external_code: 'X-1',
        source_center_acronym: 'CIAT',
        source_center_name: 'Alliance of Bioversity and CIAT',
        source_status: 'active',
      } as any,
    ]);

    expect(mapped).toMatchObject({
      phase: 2026,
      externalSource: 'W3_REGISTRY',
      externalProjectId: 'W3-123',
      externalCode: 'X-1',
      sourceCenterAcronym: 'CIAT',
      sourceCenterName: 'Alliance of Bioversity and CIAT',
      sourceStatus: 'active',
    });
  });

  it('projectMapper should null out W3 Registry fields when absent (legacy CLARISA-native rows)', () => {
    const [mapped] = ClarisaEndpoints.projectMapper([{ id: 2 } as any]);

    expect(mapped).toMatchObject({
      phase: null,
      externalSource: null,
      externalProjectId: null,
      externalCode: null,
      sourceCenterAcronym: null,
      sourceCenterName: null,
      sourceStatus: null,
    });
  });
});
