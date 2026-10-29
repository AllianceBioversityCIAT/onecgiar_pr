import { HttpStatus } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { ResultRepository } from '../result.repository';
import { Submission } from './entities/submission.entity';

/**
 * QIN-T-5 / QIN-R-6 — unsubmit is refused while a result is In QA in an open phase
 * (Reporting `unsubmitFunction` and IPSR `unsubmitFunctionIPSR`).
 *
 * The guard is the WHERE clause of the UPDATE itself (QIN-DD-4), so the repository below is a
 * real `ResultRepository` whose `query` is a fake database: it evaluates the WHERE predicate of
 * the statement it receives against the row state. Remove or weaken the predicate in the SQL and
 * the fake answers differently, as a real database would. A mock that simply returned
 * `affectedRows: 0` would pass whether or not the guard existed.
 *
 * Built off the prototype because the constructor takes many collaborators.
 */
describe('SubmissionsService — unsubmit guard (QIN-R-6)', () => {
  const RESULT_ID = 9001;
  const USER = { id: 77 } as any;
  const COMMENT = 'Reopened to fix the evidence link';
  const REFUSAL =
    'This result is under QA review and cannot be unsubmitted until QA releases it.';

  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();
  const GUARD = /where r\.id = \? and not \(r\.in_qa = 1 and v\.status = 1\)/i;

  function makeService(
    state: { inQa: 0 | 1; versionStatus: 0 | 1 },
    over: { role?: boolean } = {},
  ) {
    const service: any = Object.create(SubmissionsService.prototype);

    const resultRepository: any = Object.create(ResultRepository.prototype);
    resultRepository.getResultById = jest
      .fn()
      .mockResolvedValue({ id: RESULT_ID });
    // The pre-guard code path. Kept so that an unchanged implementation reaches the assertions.
    resultRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
    resultRepository.query = jest
      .fn()
      .mockImplementation(async (sql: string) => {
        // Evaluate the statement's own WHERE predicate against the row state, so whatever
        // the SQL says is what decides (a weaker or missing guard changes the outcome).
        const where = normalize(sql).split(/ where /i)[1] ?? 'true';
        const predicate = where
          .replace(/r\.id = \?/gi, 'true')
          .replace(/r\.in_qa/gi, String(state.inQa))
          .replace(/v\.status/gi, String(state.versionStatus))
          .replace(/ = /g, ' === ')
          .replace(/ and /gi, ' && ')
          .replace(/not /gi, '!');
        const matches = Function(`return (${predicate});`)() as boolean;
        return { affectedRows: matches ? 1 : 0 };
      });

    service._resultRepository = resultRepository;
    service._roleByUserRepository = {
      validationRolePermissions: jest.fn().mockResolvedValue(over.role ?? true),
    };
    service._submissionRepository = {
      save: jest.fn().mockImplementation(async (s: any) => s),
    };
    service._generalInformationIpsrService = {
      findInnovationDetail: jest
        .fn()
        .mockResolvedValue({ response: { id: RESULT_ID } }),
    };
    service._handlersError = {
      returnErrorRes: jest.fn().mockImplementation(({ error }) => ({
        response: {},
        message: error?.message,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      })),
    };
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    return service;
  }

  describe.each([
    ['Reporting', 'unsubmitFunction'],
    ['IPSR', 'unsubmitFunctionIPSR'],
  ])('%s path (%s)', (_label, method) => {
    const call = (service: any, dto: any = { comment: COMMENT }) =>
      service[method](RESULT_ID, USER, dto);

    it('(a) in_qa = 1 in an open phase: refused with 409, nothing written', async () => {
      const service = makeService({ inQa: 1, versionStatus: 1 });

      const res = await call(service);

      expect(res).toEqual({
        response: {},
        message: REFUSAL,
        status: HttpStatus.CONFLICT,
      });
      expect(service._submissionRepository.save).not.toHaveBeenCalled();
      expect(service._resultRepository.update).not.toHaveBeenCalled();
      expect(
        service._generalInformationIpsrService.findInnovationDetail,
      ).not.toHaveBeenCalled();
    });

    it('(b) in_qa = 1 in a closed phase (version.status 0): unsubmits as today', async () => {
      const service = makeService({ inQa: 1, versionStatus: 0 });

      const res = await call(service);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.message).toBe('the result has been unsubmitted successfully');
      expect(service._submissionRepository.save).toHaveBeenCalledTimes(1);
    });

    it('(c) in_qa = 0: unsubmits as today and saves the same submission row', async () => {
      const service = makeService({ inQa: 0, versionStatus: 1 });

      const res = await call(service);

      expect(res.status).toBe(HttpStatus.OK);
      expect(service._resultRepository.query).toHaveBeenCalledTimes(1);
      const [sql, params] = service._resultRepository.query.mock.calls[0];
      expect(normalize(sql)).toMatch(/set r\.status = 0, r\.status_id = 1/i);
      expect(params).toEqual([RESULT_ID]);

      expect(service._submissionRepository.save).toHaveBeenCalledTimes(1);
      const saved: Submission =
        service._submissionRepository.save.mock.calls[0][0];
      expect(saved).toBeInstanceOf(Submission);
      expect(saved).toMatchObject({
        user_id: USER.id,
        status: false,
        status_id: 1,
        comment: COMMENT,
        results_id: RESULT_ID,
      });
    });

    it('(d) the guard is part of the UPDATE WHERE clause, not a prior SELECT', async () => {
      const service = makeService({ inQa: 0, versionStatus: 1 });

      await call(service);

      const statements: string[] =
        service._resultRepository.query.mock.calls.map((c: any[]) =>
          normalize(c[0]),
        );
      expect(statements).toHaveLength(1);
      expect(statements[0]).toMatch(
        /^update `?result`? r join `?version`? v on v\.id = r\.version_id set /i,
      );
      expect(statements[0]).toMatch(GUARD);
    });

    it('keeps the order of checks: role, then justification, before any write', async () => {
      const noRole = makeService(
        { inQa: 0, versionStatus: 1 },
        { role: false },
      );
      const resNoRole = await call(noRole);
      expect(resNoRole.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(noRole._resultRepository.query).not.toHaveBeenCalled();

      const noComment = makeService({ inQa: 1, versionStatus: 1 });
      const resNoComment = await call(noComment, {});
      expect(resNoComment.status).toBe(HttpStatus.BAD_REQUEST);
      expect(resNoComment.message).toBe('No justification provided');
      expect(noComment._resultRepository.query).not.toHaveBeenCalled();
    });
  });

  it('IPSR (c): the success payload still carries the innovation package detail', async () => {
    const service = makeService({ inQa: 0, versionStatus: 1 });

    const res = await service.unsubmitFunctionIPSR(RESULT_ID, USER, {
      comment: COMMENT,
    });

    expect(res.response.innoPckg).toEqual({ id: RESULT_ID });
  });
});
