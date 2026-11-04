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

describe('QaIntakeRepository (QIN-DD-3)', () => {
  const repo = new QaIntakeRepository();

  describe('lockRows', () => {
    it('locks the batch with SELECT ... FOR UPDATE ordered by id, binding every id', async () => {
      const { manager, sqlOf, paramsOf } = makeRunner([
        { id: 1, in_qa: 0 },
        { id: 2, in_qa: 1 },
      ]);
      const out = await repo.lockRows([2, 1], manager);
      expect(sqlOf()).toMatch(/^WHERE r\.id IN \(\?, \?\)$/m);
      expect(sqlOf()).toMatch(/^ORDER BY r\.id ASC$/m);
      expect(sqlOf()).toMatch(/^FOR UPDATE$/m);
      expect(paramsOf()).toEqual([2, 1]);
      expect(out).toEqual(
        new Map([
          [1, false],
          [2, true],
        ]),
      );
    });

    it('does not query for an empty id list', async () => {
      const { manager, query } = makeRunner();
      await expect(repo.lockRows([], manager)).resolves.toEqual(new Map());
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('markInQa', () => {
    it('is one CAS UPDATE whose only SET is in_qa = 1 and whose predicate re-states the classified state', async () => {
      const { manager, sqlOf, paramsOf, query } = makeRunner({
        affectedRows: 2,
      });
      await expect(repo.markInQa([4, 5], manager)).resolves.toBe(2);
      expect(query).toHaveBeenCalledTimes(1);
      const sql = sqlOf();
      expect(sql).toMatch(/^UPDATE `result`$/m);
      expect(sql).toMatch(/^SET in_qa = 1$/m);
      expect(sql).toMatch(/^WHERE id IN \(\?, \?\)$/m);
      expect(sql).toMatch(/^\s+AND is_active = 1$/m);
      expect(sql).toMatch(/^\s+AND status_id = 3$/m);
      expect(sql).toMatch(/^\s+AND in_qa = 0$/m);
      expect(sql).not.toMatch(/--|\/\*/);
      expect(paramsOf()).toEqual([4, 5]);
    });

    it('reads affectedRows, 0 when the driver gives none', async () => {
      expect(await repo.markInQa([1], makeRunner(undefined).manager)).toBe(0);
      expect(
        await repo.markInQa([1], makeRunner({ affectedRows: '1' }).manager),
      ).toBe(1);
    });

    it('does not query for an empty id list', async () => {
      const { manager, query } = makeRunner();
      await expect(repo.markInQa([], manager)).resolves.toBe(0);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('insertAudit', () => {
    it('is one batched INSERT that never sends created_date', async () => {
      const { manager, sqlOf, paramsOf, query } = makeRunner();
      await repo.insertAudit(
        [
          {
            result_id: 1,
            action: 'intake',
            phase_year: 2026,
            platform_id: 7,
            platform_acronym: 'QAP',
          },
          {
            result_id: 2,
            action: 'release_qaed',
            phase_year: 2026,
            platform_id: 7,
            platform_acronym: 'QAP',
          },
        ],
        manager,
      );
      expect(query).toHaveBeenCalledTimes(1);
      expect(sqlOf()).toMatch(
        /^INSERT INTO `result_qa_intake_log`\n  \(result_id, action, phase_year, platform_id, platform_acronym\)\nVALUES \(\?, \?, \?, \?, \?\), \(\?, \?, \?, \?, \?\)$/,
      );
      expect(sqlOf()).not.toMatch(/created_date/);
      expect(paramsOf()).toEqual([
        1,
        'intake',
        2026,
        7,
        'QAP',
        2,
        'release_qaed',
        2026,
        7,
        'QAP',
      ]);
    });

    it('does not query for no rows', async () => {
      const { manager, query } = makeRunner();
      await repo.insertAudit([], manager);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
