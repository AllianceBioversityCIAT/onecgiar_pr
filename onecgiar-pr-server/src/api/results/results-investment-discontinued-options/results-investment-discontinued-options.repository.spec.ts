import { ResultsInvestmentDiscontinuedOptionRepository } from './results-investment-discontinued-options.repository';

/**
 * BIL-RAU-T-1 — optional trailing `manager` on `inactiveData` (DD-6), plus manager-aware
 * findOne/update/save wrappers for the helper `BIL-RAU-T-2` will extract.
 *
 * The falsifier: with a mock `manager`, the write goes through `manager.query` /
 * `manager.getRepository(...)`, never `this.dataSource.query` / `this`. Without a manager,
 * behavior is byte-identical to today (`this.dataSource.query`, same SQL args).
 */
describe('ResultsInvestmentDiscontinuedOptionRepository — optional manager (BIL-RAU-T-1)', () => {
  const RESULT_ID = 500;
  const USER = 9;

  function makeRepo() {
    const repo: any = Object.create(
      ResultsInvestmentDiscontinuedOptionRepository.prototype,
    );
    repo.dataSource = { query: jest.fn().mockResolvedValue(undefined) };
    repo._handlersError = {
      returnErrorRepository: jest.fn((e) => e),
    };
    return repo;
  }

  describe('inactiveData', () => {
    it('without a manager, runs on this.dataSource.query as today', async () => {
      const repo = makeRepo();

      await repo.inactiveData([1, 2], RESULT_ID, USER);

      expect(repo.dataSource.query).toHaveBeenCalledTimes(2);
      // BIL-RAU-T-10: user_id/result_id are still the first two params, in the same order;
      // the ids now ride along as bound params too (they used to be string-interpolated).
      expect(repo.dataSource.query.mock.calls[0][1]).toEqual([
        USER,
        RESULT_ID,
        1,
        2,
      ]);
      expect(repo.dataSource.query.mock.calls[1][1]).toEqual([
        USER,
        RESULT_ID,
        1,
        2,
      ]);
    });

    it('with an empty options array, only the deactivate-all call runs (unchanged)', async () => {
      const repo = makeRepo();

      await repo.inactiveData([], RESULT_ID, USER);

      expect(repo.dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('with a manager, runs the query on manager.query, never this.dataSource.query', async () => {
      const repo = makeRepo();
      const manager: any = { query: jest.fn().mockResolvedValue(undefined) };

      await repo.inactiveData([1], RESULT_ID, USER, manager);

      expect(manager.query).toHaveBeenCalledTimes(2);
      expect(repo.dataSource.query).not.toHaveBeenCalled();
    });

    it('with a manager and empty options, the manager still receives exactly one call', async () => {
      const repo = makeRepo();
      const manager: any = { query: jest.fn().mockResolvedValue(undefined) };

      await repo.inactiveData([], RESULT_ID, USER, manager);

      expect(manager.query).toHaveBeenCalledTimes(1);
      expect(repo.dataSource.query).not.toHaveBeenCalled();
    });

    it('SQL text passed to manager.query is byte-identical to the no-manager call', async () => {
      const repo = makeRepo();
      const manager: any = { query: jest.fn().mockResolvedValue(undefined) };

      await repo.inactiveData([1, 2], RESULT_ID, USER);
      const withoutManagerSql = repo.dataSource.query.mock.calls.map(
        (c: any[]) => c[0],
      );

      await repo.inactiveData([1, 2], RESULT_ID, USER, manager);
      const withManagerSql = manager.query.mock.calls.map((c: any[]) => c[0]);

      expect(withManagerSql).toEqual(withoutManagerSql);
    });

    it('pins the exact SQL text at HEAD, trailing whitespace included — BIL-RAU-T-10: bound form, no client value in the SQL text', async () => {
      const repo = makeRepo();

      await repo.inactiveData([1, 2], RESULT_ID, USER);

      const deactivateSql = repo.dataSource.query.mock.calls[0][0];
      const activateSql = repo.dataSource.query.mock.calls[1][0];
      const deactivateParams = repo.dataSource.query.mock.calls[0][1];
      const activateParams = repo.dataSource.query.mock.calls[1][1];

      // Byte-for-byte against the BIL-RAU-T-10 bound form (owner-approved change to this
      // pin — see the task report). The `in (...)` list is now `?` placeholders, never the
      // client-supplied ids themselves; the ids travel only in the params array below.
      expect(deactivateSql).toBe(
        'update results_investment_discontinued_options  \n' +
          '    set is_active = 0, \n' +
          '    \tlast_updated_date = NOW(), \n' +
          '    \tlast_updated_by = ? \n' +
          '    where is_active > 0 \n' +
          '    \tand result_id = ?\n' +
          '    \tand investment_discontinued_option_id  not in (?,?)',
      );
      expect(activateSql).toBe(
        'update results_investment_discontinued_options  \n' +
          '    set is_active = 1, \n' +
          '    \tlast_updated_date = NOW(), \n' +
          '    \tlast_updated_by = ? \n' +
          '    where is_active > 0 \n' +
          '    \tand result_id = ?\n' +
          '    \tand investment_discontinued_option_id   in (?,?)',
      );
      expect(deactivateParams).toEqual([USER, RESULT_ID, 1, 2]);
      expect(activateParams).toEqual([USER, RESULT_ID, 1, 2]);
    });

    it('BIL-RAU-T-10 falsifier: an injection payload ends up only in the params array, never in the SQL text', async () => {
      const repo = makeRepo();
      const injection = '1) OR (1=1';

      await repo.inactiveData(
        [injection as unknown as number],
        RESULT_ID,
        USER,
      );

      const deactivateSql = repo.dataSource.query.mock.calls[0][0];
      const activateSql = repo.dataSource.query.mock.calls[1][0];
      const deactivateParams = repo.dataSource.query.mock.calls[0][1];
      const activateParams = repo.dataSource.query.mock.calls[1][1];

      expect(deactivateSql).not.toContain(injection);
      expect(activateSql).not.toContain(injection);
      expect(deactivateSql).toBe(
        'update results_investment_discontinued_options  \n' +
          '    set is_active = 0, \n' +
          '    \tlast_updated_date = NOW(), \n' +
          '    \tlast_updated_by = ? \n' +
          '    where is_active > 0 \n' +
          '    \tand result_id = ?\n' +
          '    \tand investment_discontinued_option_id  not in (?)',
      );
      expect(activateSql).toBe(
        'update results_investment_discontinued_options  \n' +
          '    set is_active = 1, \n' +
          '    \tlast_updated_date = NOW(), \n' +
          '    \tlast_updated_by = ? \n' +
          '    where is_active > 0 \n' +
          '    \tand result_id = ?\n' +
          '    \tand investment_discontinued_option_id   in (?)',
      );
      expect(deactivateParams).toEqual([USER, RESULT_ID, injection]);
      expect(activateParams).toEqual([USER, RESULT_ID, injection]);
    });

    it('BIL-RAU-T-10: numeric ids [1,2] give the same deactivate/activate semantics as today (two calls, in/not-in pair)', async () => {
      const repo = makeRepo();

      await repo.inactiveData([1, 2], RESULT_ID, USER);

      expect(repo.dataSource.query).toHaveBeenCalledTimes(2);
      expect(repo.dataSource.query.mock.calls[0][0]).toContain('not in');
      expect(repo.dataSource.query.mock.calls[1][0]).toMatch(/(?<!not )in/);
    });

    it("BIL-RAU-T-10: the empty list keeps today's behavior — one deactivate-all call, no in-clause, no extra params", async () => {
      const repo = makeRepo();

      await repo.inactiveData([], RESULT_ID, USER);

      expect(repo.dataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = repo.dataSource.query.mock.calls[0];
      expect(sql).not.toContain('in (');
      expect(params).toEqual([USER, RESULT_ID]);
    });

    it('BIL-RAU-T-10: with a manager, the bound query still runs on manager.query, params include the ids', async () => {
      const repo = makeRepo();
      const manager: any = { query: jest.fn().mockResolvedValue(undefined) };
      const injection = '1) OR (1=1';

      await repo.inactiveData(
        [injection as unknown as number],
        RESULT_ID,
        USER,
        manager,
      );

      expect(manager.query).toHaveBeenCalledTimes(2);
      expect(repo.dataSource.query).not.toHaveBeenCalled();
      expect(manager.query.mock.calls[0][0]).not.toContain(injection);
      expect(manager.query.mock.calls[0][1]).toEqual([
        USER,
        RESULT_ID,
        injection,
      ]);
    });
  });

  describe('findOneDiscontinuedOption', () => {
    it('without a manager, calls findOne on this', async () => {
      const repo = makeRepo();
      repo.findOne = jest.fn().mockResolvedValue({ id: 1 });

      const result = await repo.findOneDiscontinuedOption({
        result_id: RESULT_ID,
        investment_discontinued_option_id: 3,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { result_id: RESULT_ID, investment_discontinued_option_id: 3 },
      });
      expect(result).toEqual({ id: 1 });
    });

    it('with a manager, calls findOne on manager.getRepository(...), not this', async () => {
      const repo = makeRepo();
      repo.findOne = jest.fn();
      const managerFindOne = jest.fn().mockResolvedValue({ id: 2 });
      const manager: any = {
        getRepository: jest.fn().mockReturnValue({ findOne: managerFindOne }),
      };

      const result = await repo.findOneDiscontinuedOption(
        { result_id: RESULT_ID, investment_discontinued_option_id: 3 },
        manager,
      );

      expect(manager.getRepository).toHaveBeenCalled();
      expect(managerFindOne).toHaveBeenCalledWith({
        where: { result_id: RESULT_ID, investment_discontinued_option_id: 3 },
      });
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('updateDiscontinuedOption', () => {
    it('without a manager, calls update on this', async () => {
      const repo = makeRepo();
      repo.update = jest.fn().mockResolvedValue(undefined);

      await repo.updateDiscontinuedOption(7, { is_active: true });

      expect(repo.update).toHaveBeenCalledWith(7, { is_active: true });
    });

    it('with a manager, calls update on manager.getRepository(...), not this', async () => {
      const repo = makeRepo();
      repo.update = jest.fn();
      const managerUpdate = jest.fn().mockResolvedValue(undefined);
      const manager: any = {
        getRepository: jest.fn().mockReturnValue({ update: managerUpdate }),
      };

      await repo.updateDiscontinuedOption(7, { is_active: true }, manager);

      expect(managerUpdate).toHaveBeenCalledWith(7, { is_active: true });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('saveDiscontinuedOption', () => {
    it('without a manager, calls save on this', async () => {
      const repo = makeRepo();
      repo.save = jest.fn().mockImplementation((d: any) => Promise.resolve(d));

      const result = await repo.saveDiscontinuedOption({
        result_id: RESULT_ID,
      });

      expect(repo.save).toHaveBeenCalledWith({ result_id: RESULT_ID });
      expect(result).toEqual({ result_id: RESULT_ID });
    });

    it('with a manager, calls save on manager.getRepository(...), not this', async () => {
      const repo = makeRepo();
      repo.save = jest.fn();
      const managerSave = jest
        .fn()
        .mockImplementation((d: any) => Promise.resolve(d));
      const manager: any = {
        getRepository: jest.fn().mockReturnValue({ save: managerSave }),
      };

      const result = await repo.saveDiscontinuedOption(
        { result_id: RESULT_ID },
        manager,
      );

      expect(managerSave).toHaveBeenCalledWith({ result_id: RESULT_ID });
      expect(repo.save).not.toHaveBeenCalled();
      expect(result).toEqual({ result_id: RESULT_ID });
    });
  });
});
