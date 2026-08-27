import { ClarisaTaskService } from './clarisatask.service';
import { ClarisaEndpoints } from './clarisa-endpoints.enum';
import { ClarisaGlobalUnit } from './clarisa-global-unit/entities/clarisa-global-unit.entity';

describe('ClarisaTaskService', () => {
  const makeService = () => {
    const dataSourceMock = {
      getRepository: jest.fn(),
    } as any;

    const httpServiceMock = {} as any;
    const clarisaInitiativesRepositoryMock = {} as any;
    const clarisaInitiativeStageRepositoryMock = {} as any;
    const clarisaGlobalUnitRepositoryMock = {} as any;
    const clarisaGlobalUnitLineageRepositoryMock = {} as any;
    const clarisaInstitutionsRepositoryMock = {
      getMostRecentLastUpdated: jest.fn().mockResolvedValue([]),
    } as any;
    const tocResultsRepositoryMock = {} as any;

    const service = new ClarisaTaskService(
      dataSourceMock,
      httpServiceMock,
      clarisaInitiativesRepositoryMock,
      clarisaInitiativeStageRepositoryMock,
      clarisaGlobalUnitRepositoryMock,
      clarisaGlobalUnitLineageRepositoryMock,
      clarisaInstitutionsRepositoryMock,
      tocResultsRepositoryMock,
    );

    return {
      service,
      clarisaInstitutionsRepositoryMock,
    };
  };

  describe('helper methods', () => {
    let service: ClarisaTaskService;

    beforeEach(() => {
      service = makeService().service;
    });

    it('normalizeBoolean should coerce assorted truthy and falsy values', () => {
      expect((service as any).normalizeBoolean(true)).toBe(true);
      expect((service as any).normalizeBoolean(0)).toBe(false);
      expect((service as any).normalizeBoolean(1)).toBe(true);
      expect((service as any).normalizeBoolean('FALSE')).toBe(false);
      expect((service as any).normalizeBoolean('YeS')).toBe(true);
      expect((service as any).normalizeBoolean(undefined, false)).toBe(false);
    });

    it('buildGlobalUnitKey should create deterministic compound key', () => {
      const key = (service as any).buildGlobalUnitKey(
        'SP01-AOW1',
        2025,
        'AOW1',
      );
      expect(key).toBe('SP01-AOW1|2025');
    });

    it('resolveGlobalUnitReference should fallback to code index', () => {
      const unitsByKey = new Map<string, ClarisaGlobalUnit>();
      const unitsByCode = new Map<string, ClarisaGlobalUnit[]>();

      const unit = {
        id: 1,
        composeCode: 'SP01-AOW1',
        code: 'AOW1',
        year: 2025,
      } as ClarisaGlobalUnit;

      unitsByCode.set('AOW1', [unit]);

      const resolved = (service as any).resolveGlobalUnitReference(
        null,
        'AOW1',
        2025,
        unitsByKey,
        unitsByCode,
      );

      expect(resolved).toBe(unit);
    });

    it('mapLineageRelationType should default to NEW when unknown', () => {
      expect((service as any).mapLineageRelationType('MERGE')).toBe('MERGE');
      expect((service as any).mapLineageRelationType(undefined)).toBe('NEW');
    });
  });

  describe('project mappers', () => {
    let service: ClarisaTaskService;

    beforeEach(() => {
      service = makeService().service;
    });

    it('mapProjectMappings should carry programName/programShortName from global_unit_object', () => {
      const result = (service as any).mapProjectMappings({
        id: 1,
        project_mappings_array: [
          {
            id: 10,
            project_id: 1,
            program_id: 5,
            allocation: '25.00',
            global_unit_object: {
              id: 5,
              smo_code: 'SP01',
              name: 'Breeding for Tomorrow',
              short_name: 'BfT',
            },
          },
        ],
      });

      expect(result[0]).toMatchObject({
        programCode: 'SP01',
        programName: 'Breeding for Tomorrow',
        programShortName: 'BfT',
      });
    });

    it('mapProjectMappings should null out programName/programShortName when global_unit_object is absent', () => {
      const result = (service as any).mapProjectMappings({
        id: 1,
        project_mappings_array: [
          { id: 11, project_id: 1, program_id: 6, allocation: null },
        ],
      });

      expect(result[0]).toMatchObject({
        programCode: null,
        programName: null,
        programShortName: null,
      });
    });

    it('mapProjectCountries should carry allocation_percentage as a string', () => {
      const result = (service as any).mapProjectCountries(
        {
          id: 1,
          project_countries_array: [
            {
              id: 20,
              project_id: 1,
              country_code: 840,
              allocation_percentage: 12.5,
            },
          ],
        },
        new Set([840]),
      );

      expect(result[0].allocationPercentage).toBe('12.5');
    });

    it('mapProjectCountries should null out allocation_percentage when absent', () => {
      const result = (service as any).mapProjectCountries(
        {
          id: 1,
          project_countries_array: [
            { id: 21, project_id: 1, country_code: 170 },
          ],
        },
        new Set([170]),
      );

      expect(result[0].allocationPercentage).toBeNull();
    });
  });

  describe('clarisaBootstrapImportantData', () => {
    it('syncs institutions via INSTITUTIONS_FULL with incremental from param', async () => {
      const { service, clarisaInstitutionsRepositoryMock } = makeService();
      clarisaInstitutionsRepositoryMock.getMostRecentLastUpdated.mockResolvedValue(
        [{ most_recent: '2025-01-01' }],
      );
      const syncSpy = jest
        .spyOn(service as any, 'syncControlList')
        .mockResolvedValue([]);

      await service.clarisaBootstrapImportantData();

      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'institutions' }),
        1,
      );
      expect(ClarisaEndpoints.INSTITUTIONS_FULL.params).toEqual(
        expect.objectContaining({ show: 'all', from: '2025-01-01' }),
      );
    });
  });

  describe('clarisaBootstrap', () => {
    it('should include global units synchronization in the bootstrap pipeline', async () => {
      const { service } = makeService();
      jest.spyOn(service as any, 'syncControlList').mockResolvedValue([]);
      jest.spyOn(service as any, 'syncInitiatives').mockResolvedValue([]);
      const syncGlobalUnitsSpy = jest
        .spyOn(service as any, 'syncGlobalUnits')
        .mockResolvedValue([]);

      const results = await service.clarisaBootstrap();

      expect(syncGlobalUnitsSpy).toHaveBeenCalledTimes(1);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
