// @akili-spec quality-assurance/qa-intake
import { QaIntakeRepository } from './qa-intake.repository';

function makeRunner(...responses: unknown[]) {
  const query = jest.fn();
  responses.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue([]);
  const sqlOf = (i = 0) => query.mock.calls[i][0] as string;
  const paramsOf = (i = 0) => query.mock.calls[i][1] as unknown[];
  return { manager: { query }, query, sqlOf, paramsOf };
}

describe('QaIntakeRepository, release half (QIN-DD-3, QIN-DD-9, QIN-DD-11)', () => {
  const repo = new QaIntakeRepository();

  describe('lockRowsForRelease', () => {
    it('locks only the result rows (the phase is a subquery, so no version row is locked) ordered by id', async () => {
      const { manager, sqlOf, paramsOf } = makeRunner([
        { id: 1, in_qa: 1, status_id: 3, in_phase: 1 },
        { id: 2, in_qa: 0, status_id: 2, in_phase: 0 },
      ]);
      const out = await repo.lockRowsForRelease([2, 1], 2026, manager);
      const sql = sqlOf();
      expect(sql).toMatch(/^FROM `result` r$/m);
      expect(sql).not.toMatch(/\bJOIN\b/i);
      expect(sql).toMatch(/^WHERE r\.id IN \(\?, \?\)$/m);
      expect(sql).toMatch(/^ORDER BY r\.id ASC$/m);
      expect(sql).toMatch(/^FOR UPDATE$/m);
      expect(sql).toMatch(/v\.phase_year = \?/);
      expect(sql).toMatch(/v\.app_module_id IN \(\?, \?\)/);
      // placeholders run in statement order: year, the phase's app modules (Reporting 1, IPSR 2), then the ids
      expect(paramsOf()).toEqual([2026, 1, 2, 2, 1]);
      expect(out).toEqual(
        new Map([
          [1, { in_qa: true, status_id: 3, in_phase: true }],
          [2, { in_qa: false, status_id: 2, in_phase: false }],
        ]),
      );
    });

    it('does not query for an empty id list', async () => {
      const { manager, query } = makeRunner();
      await expect(repo.lockRowsForRelease([], 2026, manager)).resolves.toEqual(
        new Map(),
      );
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('releaseQaed / releaseNotQaed', () => {
    it('qaed: SET status_id = 2, in_qa = 0 guarded by in_qa = 1 AND status_id = 3', async () => {
      const { manager, sqlOf, paramsOf, query } = makeRunner({
        affectedRows: 2,
      });
      await expect(repo.releaseQaed([4, 5], manager)).resolves.toBe(2);
      expect(query).toHaveBeenCalledTimes(1);
      const sql = sqlOf();
      expect(sql).toMatch(/^UPDATE `result`$/m);
      expect(sql).toMatch(/^SET status_id = 2, in_qa = 0$/m);
      expect(sql).toMatch(/^WHERE id IN \(\?, \?\)$/m);
      expect(sql).toMatch(/^\s+AND is_active = 1$/m);
      expect(sql).toMatch(/^\s+AND status_id = 3$/m);
      expect(sql).toMatch(/^\s+AND in_qa = 1$/m);
      expect(sql).not.toMatch(/\bstatus\s*=/);
      expect(sql).not.toMatch(/--|\/\*/);
      expect(paramsOf()).toEqual([4, 5]);
    });

    it('not_qaed: SET in_qa = 0 only, with no status_id in the SET', async () => {
      const { manager, sqlOf, paramsOf, query } = makeRunner({
        affectedRows: 1,
      });
      await expect(repo.releaseNotQaed([6], manager)).resolves.toBe(1);
      expect(query).toHaveBeenCalledTimes(1);
      const sql = sqlOf();
      expect(sql).toMatch(/^SET in_qa = 0$/m);
      expect(sql.split(/^WHERE/m)[0]).not.toMatch(/status/);
      expect(sql).toMatch(/^WHERE id IN \(\?\)$/m);
      expect(sql).toMatch(/^\s+AND is_active = 1$/m);
      expect(sql).toMatch(/^\s+AND status_id = 3$/m);
      expect(sql).toMatch(/^\s+AND in_qa = 1$/m);
      expect(paramsOf()).toEqual([6]);
    });

    it('read affectedRows, 0 when the driver gives none', async () => {
      expect(await repo.releaseQaed([1], makeRunner(undefined).manager)).toBe(
        0,
      );
      expect(
        await repo.releaseNotQaed(
          [1],
          makeRunner({ affectedRows: '1' }).manager,
        ),
      ).toBe(1);
    });

    it('do not query for an empty id list', async () => {
      const { manager, query } = makeRunner();
      await expect(repo.releaseQaed([], manager)).resolves.toBe(0);
      await expect(repo.releaseNotQaed([], manager)).resolves.toBe(0);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
