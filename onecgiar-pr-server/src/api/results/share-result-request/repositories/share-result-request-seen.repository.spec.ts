// @akili-spec notifications/bell-read-state BRS-T-1
import { DataSource } from 'typeorm';
import { ShareResultRequestSeenRepository } from './share-result-request-seen.repository';

/**
 * BRS-R-2 (per person), BRS-R-4 (idempotent), D2/D3. Jest mocks the query: it proves the
 * statement shape and bound parameters, NOT that MySQL dedupes/isolates (two-account TEST
 * check covers that, requirements §8).
 */
describe('ShareResultRequestSeenRepository (BRS-T-1)', () => {
  let repository: ShareResultRequestSeenRepository;
  const managerQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const dataSource = {
      createEntityManager: jest.fn(() => ({ query: managerQuery })),
    } as unknown as DataSource;
    repository = new ShareResultRequestSeenRepository(dataSource);
  });

  describe('insertIgnore', () => {
    it('issues ONE INSERT IGNORE for 150 ids, binding the caller user id on every row', async () => {
      managerQuery.mockResolvedValue({ affectedRows: 150 });
      const ids = Array.from({ length: 150 }, (_, i) => 1000 + i);

      const inserted = await repository.insertIgnore(77, ids);

      expect(managerQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = managerQuery.mock.calls[0];
      expect(sql).toMatch(/^\s*INSERT IGNORE INTO `share_result_request_seen`/);
      expect((sql.match(/\(\?, \?\)/g) ?? []).length).toBe(150);
      // Flat [requestId, userId, ...]; the user id is bound, never interpolated.
      expect(params).toHaveLength(300);
      expect(params[0]).toBe(1000);
      expect(params[1]).toBe(77);
      expect(params[298]).toBe(1149);
      expect(params[299]).toBe(77);
      expect(sql).not.toContain('77');
      expect(sql).not.toContain('1000');
      expect(inserted).toBe(150);
    });

    it('returns only the rows actually inserted when some pairs already exist', async () => {
      managerQuery.mockResolvedValue({ affectedRows: 1 });

      await expect(repository.insertIgnore(5, [10, 11, 12])).resolves.toBe(1);
    });

    it('returns 0 when every pair already existed (idempotent re-run)', async () => {
      managerQuery.mockResolvedValue({ affectedRows: 0 });

      await expect(repository.insertIgnore(5, [10, 11])).resolves.toBe(0);
    });

    it('makes no DB call and returns 0 for empty ids', async () => {
      await expect(repository.insertIgnore(5, [])).resolves.toBe(0);
      expect(managerQuery).not.toHaveBeenCalled();
    });
  });

  describe('findSeenIds', () => {
    it('binds the caller user id and the ids, and returns the seen request ids', async () => {
      managerQuery.mockResolvedValue([
        { share_result_request_id: 10 },
        { share_result_request_id: 12 },
      ]);

      const seen = await repository.findSeenIds(77, [10, 11, 12]);

      expect(managerQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = managerQuery.mock.calls[0];
      expect(sql).toMatch(/WHERE\s+user_id\s*=\s*\?/i);
      expect(sql).toMatch(/share_result_request_id\s+IN\s*\(\?, \?, \?\)/i);
      expect(params).toEqual([77, 10, 11, 12]);
      expect(seen).toEqual(new Set([10, 12]));
    });

    it('makes no DB call and returns an empty set for empty ids', async () => {
      await expect(repository.findSeenIds(77, [])).resolves.toEqual(new Set());
      expect(managerQuery).not.toHaveBeenCalled();
    });
  });
});
