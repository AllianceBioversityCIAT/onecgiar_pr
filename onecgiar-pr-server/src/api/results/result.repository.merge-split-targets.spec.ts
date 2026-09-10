import {
  MERGE_SPLIT_TARGET_STATUS_IDS,
  QA_LINKABLE_INNOVATION_STATUS_IDS,
  ResultRepository,
} from './result.repository';

/**
 * P2-3292 Steps 3A / 3B — the catalogue of innovations a discontinued innovation may declare as
 * its continuation.
 *
 * These assert on the SQL the repository builds, because that is where the whole requirement lives:
 * the story fixes four filters in writing and every one of them is a clause. A raw query has no
 * other seam, and each of these clauses is one word away from being wrong in a way nothing else
 * would catch — the sibling method offers discontinued innovations ON PURPOSE, so copying it would
 * look correct and break the requirement.
 */
describe('ResultRepository.getMergeSplitTargetInnovations (P2-3292 Step 3)', () => {
  function makeRepository() {
    const repository: any = Object.create(ResultRepository.prototype);
    repository.query = jest.fn().mockResolvedValue([]);
    repository._handlersError = { returnErrorRepository: jest.fn() };
    return repository;
  }

  const sqlOf = (repository: any) => repository.query.mock.calls[0][0];
  const paramsOf = (repository: any) => repository.query.mock.calls[0][1];

  describe('the status set is NOT the one the sibling dropdown uses', () => {
    it('excludes Discontinued, which the sibling includes on purpose', () => {
      // The story says "Not discontinued" in writing. `QA_LINKABLE_INNOVATION_STATUS_IDS` carries
      // status 4 deliberately for P2-3420/3421, so reusing it would silently offer closed
      // innovations as the place another one continued.
      expect(QA_LINKABLE_INNOVATION_STATUS_IDS).toContain(4);
      expect(MERGE_SPLIT_TARGET_STATUS_IDS).not.toContain(4);
    });

    it("offers both QA'd and Approved, so bilateral innovations are not invisible", () => {
      expect(MERGE_SPLIT_TARGET_STATUS_IDS).toEqual([2, 6]);
    });
  });

  describe('the four filters the story fixes', () => {
    it('asks only for Innovation Development results', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      // 🛑 `toContain('r.result_type_id = 7')` is a FALSE NEGATIVE here and this test used to have
      // it: the de-duplication subquery says `AND newer.result_type_id = 7`, and that string ENDS
      // in `r.result_type_id = 7` because the alias is "newer". Removing the outer filter left the
      // test green. Caught by mutation, not by review. The `AND r.` prefix is what makes it unique
      // to the outer WHERE.
      expect(sqlOf(repository)).toContain('AND r.result_type_id = 7');
    });

    it('excludes discontinued innovations, tolerating a NULL flag', async () => {
      // `is_discontinued` is NULL on every result that was never asked the question, which is most
      // of them. A plain `= FALSE` would return nothing at all.
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      expect(sqlOf(repository)).toMatch(
        /r\.is_discontinued IS NULL OR r\.is_discontinued = FALSE/,
      );
    });

    it('does not pin a phase — the story says the full portfolio', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      const sql = sqlOf(repository);
      // The sibling method pins `v.phase_year = ?`; this one must not.
      expect(sql).not.toMatch(/v\.phase_year\s*=\s*\?/);
    });

    it('returns one row per innovation, collapsing the phase copies', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      const sql = sqlOf(repository);
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain('newer.result_code = r.result_code');
      // The de-duplication must apply the same status and discontinued filters, or it would
      // collapse an eligible row against an ineligible newer one and hide it entirely.
      expect(sql).toMatch(/newer\.is_discontinued IS NULL/);
    });

    it('selects the id and the title the dropdown has to display', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      const sql = sqlOf(repository);
      expect(sql).toContain('r.result_code');
      expect(sql).toContain('r.title');
    });
  });

  describe('an innovation can never be its own continuation', () => {
    it('excludes the discontinued innovation by CODE, not by id', async () => {
      // By id it would exclude only that phase's row and still offer the same innovation from
      // another phase — the same title, indistinguishable to the reporter.
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({
        excludeResultCode: 6432,
      });

      expect(sqlOf(repository)).toContain('r.result_code <> ?');
      expect(paramsOf(repository)).toContain(6432);
    });

    it('omits the clause when no code is given', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      expect(sqlOf(repository)).not.toContain('r.result_code <> ?');
    });
  });

  describe('the search the story asks for', () => {
    it('matches both the title and the innovation id', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({ search: 'cassava' });

      expect(sqlOf(repository)).toContain(
        'r.title LIKE ? OR CAST(r.result_code AS CHAR) LIKE ?',
      );
      expect(paramsOf(repository)).toContain('%cassava%');
    });

    it('ignores a blank search instead of matching everything with wildcards', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({ search: '   ' });

      expect(sqlOf(repository)).not.toContain('LIKE');
    });

    it('passes the search as a bound parameter, never interpolated', async () => {
      // The value comes from a query string; interpolating it would put user text in the SQL.
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({ search: "o'brien%_" });

      expect(sqlOf(repository)).not.toContain("o'brien");
      expect(paramsOf(repository)).toContain("%o'brien%_%");
    });
  });

  describe('the optional own-programme narrowing', () => {
    it('is absent by default, because the story says the full portfolio', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      expect(sqlOf(repository)).not.toContain('results_by_inititiative');
    });

    it('narrows by the OWNER programme only, never a contributor', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({
        ownerInitiativeId: 42,
      });

      const sql = sqlOf(repository);
      expect(sql).toContain('results_by_inititiative');
      expect(sql).toContain('rbi.initiative_role_id = 1');
      expect(paramsOf(repository)).toContain(42);
    });
  });

  describe('the payload stays bounded', () => {
    it('defaults to 50 rows', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({});

      expect(sqlOf(repository)).toContain('LIMIT ?');
      expect(paramsOf(repository).at(-1)).toBe(50);
    });

    it('honours an explicit limit', async () => {
      const repository = makeRepository();

      await repository.getMergeSplitTargetInnovations({ limit: 10 });

      expect(paramsOf(repository).at(-1)).toBe(10);
    });
  });
});
