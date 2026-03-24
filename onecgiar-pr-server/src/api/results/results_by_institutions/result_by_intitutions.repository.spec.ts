import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';

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
});
