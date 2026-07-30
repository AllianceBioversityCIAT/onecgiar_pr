import { TocResultsRepository } from './toc-results.repository';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { GlobalParameter } from '../../api/global-parameter/entities/global-parameter.entity';

describe('TocResultsRepository', () => {
  let repository: TocResultsRepository;
  let mockQuery: jest.Mock;
  let mockDataSource: {
    createEntityManager: jest.Mock;
    query: jest.Mock;
    getRepository: jest.Mock;
  };
  let initiativeRepo: { findOne: jest.Mock };
  let globalParamRepo: { findOne: jest.Mock };

  beforeAll(() => {
    process.env.DB_TOC = 'db_toc';
    process.env.DB_OST = 'db_ost';
    process.env.DB_NAME = 'db_main';
  });

  beforeEach(() => {
    initiativeRepo = {
      // default: no SGP-02 behavior, so repository uses getCurrentTocPhaseId()
      findOne: jest.fn().mockResolvedValue(null),
    };
    globalParamRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ value: 'phase-from-global-param' }),
    };

    mockDataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
      query: jest.fn(),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === ClarisaInitiative) {
          return initiativeRepo as any;
        }
        if (entity === GlobalParameter) {
          return globalParamRepo as any;
        }
        return { findOne: jest.fn().mockResolvedValue(null) } as any;
      }),
    };

    repository = new TocResultsRepository(mockDataSource as any);
    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTocPhaseIdForReportingYear', () => {
    it('returns phase id for the reporting year', async () => {
      mockDataSource.query.mockResolvedValue([{ toc_pahse_id: 'phase-99' }]);

      const phaseId = await (repository as any).getTocPhaseIdForReportingYear(
        2026,
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('phase_year = ?'),
        [2026],
      );
      expect(phaseId).toBe('phase-99');
    });

    it('throws when no phase is configured for the reporting year', async () => {
      mockDataSource.query.mockResolvedValue([{ toc_pahse_id: null }]);

      await expect(
        (repository as any).getTocPhaseIdForReportingYear(2026),
      ).rejects.toMatchObject({
        message: 'No TOC phase is configured for reporting year 2026.',
        status: 404,
      });
    });
  });

  describe('getCurrentTocPhaseId', () => {
    it('returns phase id when row exists', async () => {
      mockDataSource.query.mockResolvedValue([{ toc_pahse_id: 'phase-1' }]);

      const phaseId = await (repository as any).getCurrentTocPhaseId();

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT toc_pahse_id'),
      );
      expect(phaseId).toBe('phase-1');
    });

    it('throws formatted error when query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('boom'));

      await expect((repository as any).getCurrentTocPhaseId()).rejects.toThrow(
        'getCurrentTocPhaseId error',
      );
    });
  });

  describe('deleteAllData', () => {
    it('returns the delete result on success', async () => {
      const expected = { affectedRows: 1 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.deleteAllData();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM toc_result'),
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('boom'));

      await expect(repository.deleteAllData()).rejects.toMatchObject({
        message: expect.stringContaining('deleteAllData error'),
        status: 500,
      });
    });
  });

  describe('getAllTocResults', () => {
    it('returns query results', async () => {
      const expected = [{ id: 1 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllTocResults();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('from toc_result tr;'),
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.getAllTocResults()).rejects.toMatchObject({
        message: expect.stringContaining('getAllTocResults error'),
        status: 500,
      });
    });
  });

  describe('$_getResultTocByConfig', () => {
    it('queries OST when toc level is 4', async () => {
      mockQuery.mockResolvedValue([{ id: 1 }]);

      const result = await repository.$_getResultTocByConfig(1, 2, 4);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('db_ost'),
        [2, 1, 4],
      );
      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns empty array when query rejects', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      const result = await repository.$_getResultTocByConfig(1, 2, 3);

      expect(result).toEqual([]);
    });
  });

  describe('getAllTocResultsByInitiative', () => {
    it('returns query results', async () => {
      const expected = [{ id: 1 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllTocResultsByInitiative(5, 2);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [5, 2]);
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getAllTocResultsByInitiative(5, 2),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getTocIdFromOst error'),
      });
    });
  });

  describe('getAllTocResultsFromOst', () => {
    it('returns query results', async () => {
      const expected = [{ id: 2 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllTocResultsFromOst();

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.getAllTocResultsFromOst()).rejects.toMatchObject({
        message: expect.stringContaining('getTocIdFromOst error'),
      });
    });
  });

  describe('inactiveTocResult', () => {
    it('returns query results', async () => {
      const expected = [{ id: 3 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.inactiveTocResult();

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE toc_result set is_active = 0;',
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.inactiveTocResult()).rejects.toMatchObject({
        message: expect.stringContaining('inactiveTocResult error'),
      });
    });
  });

  describe('updateDeprecateDataToc', () => {
    it('returns query results', async () => {
      const expected = [{ id: 4 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.updateDeprecateDataToc();

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.updateDeprecateDataToc()).rejects.toMatchObject({
        message: expect.stringContaining('inactiveTocResult error'),
      });
    });
  });

  describe('getAllOutcomeByInitiative', () => {
    it('returns query results', async () => {
      const expected = [{ id: 5 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllOutcomeByInitiative(9);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('clarisa_action_areas_outcomes_indicators'),
        [9],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getAllOutcomeByInitiative(9),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getTocIdFromOst error'),
      });
    });
  });

  describe('getFullInitiativeTocByResult', () => {
    it('returns query results', async () => {
      const expected = [{ id: 6 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getFullInitiativeTocByResult(7);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('results_by_inititiative'),
        [7],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getFullInitiativeTocByResult(7),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getTocIdFromOst error'),
      });
    });
  });

  describe('getFullInitiativeTocByInitiative', () => {
    it('returns query results', async () => {
      const expected = [{ id: 7 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getFullInitiativeTocByInitiative(8);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('clarisa_initiatives'),
        [8],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getFullInitiativeTocByInitiative(8),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getTocIdFromOst by initiative error'),
      });
    });
  });

  describe('isTocResoultByInitiative', () => {
    it('returns first row when rows exist', async () => {
      mockQuery.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await repository.isTocResoultByInitiative(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('toc_result tr'),
      );
      expect(result).toEqual({ id: 1 });
    });

    it('returns undefined when no rows', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await repository.isTocResoultByInitiative(1, 2);

      expect(result).toBeUndefined();
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.isTocResoultByInitiative(1, 2),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getAllTocResults error'),
      });
    });
  });

  describe('getEoiIp', () => {
    it('returns query results', async () => {
      const expected = [{ id: 9 }];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getEoiIp(10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM toc_result'),
        [10],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.getEoiIp(10)).rejects.toMatchObject({
        message: expect.stringContaining('getAllTocResults error'),
      });
    });
  });

  describe('$_getResultTocByConfigV2', () => {
    it('throws when toc level is invalid', async () => {
      await expect(
        repository.$_getResultTocByConfigV2(1, 99, 2026),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Invalid toc level'),
        status: 400,
      });
    });

    it('throws formatted error on failure', async () => {
      jest
        .spyOn(repository as any, 'getTocPhaseIdForReportingYear')
        .mockResolvedValue('phase-123');
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.$_getResultTocByConfigV2(1, 1, 2026),
      ).rejects.toMatchObject({
        message: expect.stringContaining('_getResultTocByConfigV2 error'),
      });
    });

    it('appends toc phase and work package year filters when available', async () => {
      jest
        .spyOn(repository as any, 'getTocPhaseIdForReportingYear')
        .mockResolvedValue('phase-123');
      mockQuery.mockResolvedValue([{ id: 1 }]);

      const result = await repository.$_getResultTocByConfigV2(5, 1, 2026);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
        2026,
        5,
        'OUTPUT',
        'phase-123',
      ]);
      expect(mockQuery.mock.calls[0][0]).toContain('wp.year = ?');
      expect(mockQuery.mock.calls[0][0]).toContain('AND tr.phase = ?');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('uses explicit toc phase id without resolving active reporting year', async () => {
      const getTocPhaseSpy = jest.spyOn(
        repository as any,
        'getTocPhaseIdForReportingYear',
      );
      mockQuery.mockResolvedValue([{ id: 2 }]);

      const result = await repository.$_getResultTocByConfigV2(
        5,
        1,
        2025,
        undefined,
        undefined,
        false,
        'phase-from-result',
      );

      expect(getTocPhaseSpy).not.toHaveBeenCalled();
      expect(mockQuery.mock.calls[0][1].slice(0, 4)).toEqual([
        2025,
        5,
        'OUTPUT',
        'phase-from-result',
      ]);
      expect(result).toEqual([{ id: 2 }]);
    });
  });

  describe('getTocIndicatorsByResultIds', () => {
    it('returns empty array when no ids provided', async () => {
      const result = await repository.getTocIndicatorsByResultIds(
        { obj_version: { phase_year: 2035 } } as any,
        2030,
        [],
      );

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns query results for provided ids', async () => {
      const expected = [{ toc_result_id: 5 }];
      mockQuery.mockResolvedValue(expected);

      const resultObj = { obj_version: { phase_year: 2035 } } as any;

      const result = await repository.getTocIndicatorsByResultIds(
        resultObj,
        2028,
        [10, '11'],
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('toc_results_indicators tri'),
        [2028, 10, 11],
      );
      expect(mockQuery.mock.calls[0][0]).toContain(
        'tri.id = trit.id_indicator',
      );
      expect(mockQuery.mock.calls[0][0]).toContain('trit.target_date = ?');
      expect(mockQuery.mock.calls[0][0]).not.toContain(
        'YEAR(DATE(trit.target_date))',
      );
      expect(result).toBe(expected);
    });

    it('omits is_active filter for historical reporting catalogs', async () => {
      mockQuery.mockResolvedValue([]);

      await repository.getTocIndicatorsByResultIds(
        { obj_version: { phase_year: 2025 } } as any,
        2025,
        [6768],
        7,
        [],
        11021,
        62,
        true,
      );

      const [sql] = mockQuery.mock.calls.find(([query]) =>
        String(query).includes('toc_results_indicators tri'),
      );
      expect(sql).not.toContain('tri.is_active = 1');
    });

    it('keeps inactive linked indicators visible for the current reporting year', async () => {
      mockQuery.mockResolvedValue([]);

      await repository.getTocIndicatorsByResultIds(
        { obj_version: { phase_year: 2026 } } as any,
        2026,
        [6768],
        7,
        ['aec22cfa-50c7-4efd-a470-e1d764d28c5d'],
        11021,
        62,
        false,
      );

      const [sql] = mockQuery.mock.calls.find(([query]) =>
        String(query).includes('toc_results_indicators tri'),
      );
      expect(sql).toContain('tri.is_active = 1');
      expect(sql).toContain('tri.related_node_id IN (?)');
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getTocIndicatorsByResultIds(
          { obj_version: { phase_year: 2035 } } as any,
          2030,
          [3],
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getTocIndicatorsByResultIds error'),
      });
    });
  });

  describe('getCatalogTargetsByIndicatorNodeIds', () => {
    it('returns empty array when no ids provided', async () => {
      const result = await repository.getCatalogTargetsByIndicatorNodeIds(
        [],
        2025,
      );

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('queries catalog targets by node id and reporting year', async () => {
      const expected = [
        {
          toc_result_indicator_id: 'node-1',
          toc_indicator_target_id: 99,
          target_date: 2025,
          target_value: 10,
          number_target: '1',
        },
      ];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getCatalogTargetsByIndicatorNodeIds(
        ['node-1'],
        2025,
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('toc_result_indicator_target trit'),
        ['node-1', 2025],
      );
      expect(mockQuery.mock.calls[0][0]).toContain('trit.target_date = ?');
      expect(result).toBe(expected);
    });
  });

  describe('getResultIndicatorMappings', () => {
    it('returns empty array when no ids provided', async () => {
      const result = await repository.getResultIndicatorMappings(1, 2, []);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns query results when data exists', async () => {
      const expected = [{ toc_result_id: 10 }];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getResultIndicatorMappings(5, 6, [10]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('results_toc_result rtr'),
        [5, 6, 10],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getResultIndicatorMappings(1, 2, [3]),
      ).rejects.toMatchObject({
        message: expect.stringContaining('getResultIndicatorMappings error'),
      });
    });
  });

  describe('getAllTocResultsByInitiativeV2', () => {
    it('throws when toc level is invalid', async () => {
      await expect(
        repository.getAllTocResultsByInitiativeV2(1, 99),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Invalid toc level'),
        status: 400,
      });
    });

    it('returns query results for valid level', async () => {
      const expected = [{ id: 12 }];
      jest
        .spyOn(repository as any, 'getCurrentTocPhaseId')
        .mockResolvedValue('phase-123');
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllTocResultsByInitiativeV2(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('db_toc'),
        [1, 'OUTCOME', 'phase-123'],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(
        repository.getAllTocResultsByInitiativeV2(1, 2),
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          'getAllTocResultsByInitiativeV2 error',
        ),
      });
    });

    it('runs without toc phase constraint when none is active', async () => {
      jest
        .spyOn(repository as any, 'getCurrentTocPhaseId')
        .mockResolvedValue(null);
      mockQuery.mockResolvedValue([{ id: 13 }]);

      await repository.getAllTocResultsByInitiativeV2(2, 1);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [2, 'OUTPUT']);
    });
  });
});
