import { DataSource } from 'typeorm';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import {
  insertLists,
  misalignedColumns,
} from '../../../shared/extendsGlobalDTO/replication-insert-lists.spec-helper';

describe('ResultByIntitutionsRepository', () => {
  let repository: ResultByIntitutionsRepository;
  let queryMock: jest.Mock;
  const mockHandlersError = {
    returnErrorRepository: jest.fn((payload) => payload),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    repository = new ResultByIntitutionsRepository(
      mockDataSource,
      mockHandlersError as any,
    );
    queryMock = jest.fn();
    (repository as any).query = queryMock;
  });

  describe('changePartnersType', () => {
    it('executes the update query with expected parameters', async () => {
      queryMock.mockResolvedValueOnce({ affectedRows: 2 });

      const result = await repository.changePartnersType(10, [1, 2], 3 as any);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('update results_by_institution'),
        [3, 10, [1, 2]],
      );
      expect(result).toEqual({ affectedRows: 2 });
    });

    it('delegates failures to the handlers', async () => {
      const error = new Error('boom');
      queryMock.mockRejectedValueOnce(error);

      await repository.changePartnersType(10, [1], 2 as any);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          className: ResultByIntitutionsRepository.name,
          error,
          debug: true,
        }),
      );
    });
  });

  describe('fisicalDelete', () => {
    it('removes partners by result id', async () => {
      queryMock.mockResolvedValueOnce({ affectedRows: 5 });

      const res = await repository.fisicalDelete(20);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('delete rbi from results_by_institution'),
        [20],
      );
      expect(res).toEqual({ affectedRows: 5 });
    });
  });

  describe('getResultByInstitutionFull', () => {
    it('returns the query result when successful', async () => {
      const expected = [{ id: 1 }];
      queryMock.mockResolvedValueOnce(expected);

      const result = await repository.getResultByInstitutionFull(99);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('where rbi.result_id = ?'),
        [99],
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error when query fails', async () => {
      const error = new Error('db fail');
      queryMock.mockRejectedValueOnce(error);

      await expect(
        repository.getResultByInstitutionFull(77),
      ).rejects.toMatchObject({
        error,
        className: ResultByIntitutionsRepository.name,
      });
    });
  });

  describe('getGenericResultByInstitutionExists', () => {
    it('prefers active rows via order by is_active desc limit 1', async () => {
      const activeRow = { id: 2, institutions_id: 11585, is_active: 1 };
      queryMock.mockResolvedValueOnce([activeRow]);

      const result = await repository.getGenericResultByInstitutionExists(
        10,
        11585,
        2,
      );

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringMatching(/order by rbi\.is_active desc[\s\S]*limit 1/i),
        [10, 2, 11585],
      );
      expect(result).toEqual(activeRow);
    });

    it('returns undefined when no row exists', async () => {
      queryMock.mockResolvedValueOnce([]);

      const result = await repository.getGenericResultByInstitutionExists(
        10,
        999,
        2,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getResultByInstitutionExists', () => {
    it('prefers active rows via order by is_active desc limit 1', async () => {
      const inactiveRow = { id: 1, institutions_id: 50, is_active: 0 };
      queryMock.mockResolvedValueOnce([inactiveRow]);

      const result = await repository.getResultByInstitutionExists(5, 50);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringMatching(/order by rbi\.is_active desc[\s\S]*limit 1/i),
        [5, expect.anything(), 50],
      );
      expect(result).toEqual(inactiveRow);
    });
  });

  /**
   * P2-3228 — phase replication must carry the lead partner flag.
   * `docs/specs/bugfix/p2-3228-lead-center-replication/requirements.md` VER-R-2, scenario
   * VER-S-2.1. Until the fix, `is_leading_result` is absent from both `insertQuery` and
   * `findQuery`, so a replicated partner institution's new version carries no lead flag.
   */
  describe('createQueries — replication carries the lead partner flag (P2-3228)', () => {
    const repo = new ResultByIntitutionsRepository(
      {
        createEntityManager: jest.fn(() => ({}) as any),
      } as unknown as DataSource,
      { returnErrorRepository: jest.fn() } as any,
    );
    const config = {
      phase: 5,
      user: { id: 77 } as any,
      old_result_id: 1000,
      new_result_id: 2000,
    } as any;

    it('writes is_leading_result into its own column in insertQuery, verbatim from the source row', () => {
      const { columns, values } = insertLists(
        repo.createQueries(config).insertQuery,
        'results_by_institution',
        'rbi',
      );
      const index = columns.indexOf('is_leading_result');

      expect(index).toBeGreaterThan(-1);
      expect(values[index]).toBe('rbi.is_leading_result');
    });

    it('keeps every INSERT column aligned with the value written into it', () => {
      const { columns, values } = insertLists(
        repo.createQueries(config).insertQuery,
        'results_by_institution',
        'rbi',
      );

      expect(values).toHaveLength(columns.length);
      expect(misalignedColumns(columns, values, 'rbi')).toEqual([]);
    });

    it('carries is_leading_result in findQuery too (DD-2)', () => {
      const { findQuery } = repo.createQueries(config);

      expect(findQuery).toContain('rbi.is_leading_result');
    });
  });
});
