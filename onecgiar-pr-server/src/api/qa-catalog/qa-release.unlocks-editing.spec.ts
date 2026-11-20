// @akili-spec quality-assurance/qa-intake
import { HttpStatus } from '@nestjs/common';
import { QaIntakeRepository } from './qa-intake.repository';
import { ResultRepository } from '../results/result.repository';
import { ResultsService } from '../results/results.service';
import { SubmissionsService } from '../results/submissions/submissions.service';
import { RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE } from '../../shared/constants/qa-review-lock.constant';

/**
 * QA lifecycle, end to end on one result row: intake marks it In QA (edits and unsubmit refused),
 * the `not_qaed` release clears `in_qa` and leaves it Submitted, and from then on the result can be
 * edited (General information) and unsubmitted again.
 *
 * The row lives in a fake database that applies the REAL statements the repositories send: the
 * intake / release UPDATEs (`QaIntakeRepository`) and the unsubmit UPDATE with its guard
 * (`ResultRepository.unsubmitUnlessUnderQaReview`). Each statement's SET and WHERE are read from
 * its SQL, so a release that forgot `in_qa = 0`, or one that also moved `status_id`, changes the
 * outcome here the way it would in MySQL.
 */
describe('QA release (not_qaed) unlocks editing and unsubmit', () => {
  const RESULT_ID = 12621;
  const USER = { id: 1 } as any;

  type Row = { in_qa: number; status_id: number; is_active: number };
  const PHASE_OPEN = 1;

  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  /** Evaluates the WHERE of an UPDATE against the row; ids and joins are assumed to match. */
  function whereMatches(where: string, row: Row): boolean {
    const expr = where
      .replace(/(r\.)?id IN \([?, ]+\)/gi, 'true')
      .replace(/r\.id = \?/gi, 'true')
      .replace(/(r\.)?is_active/gi, String(row.is_active))
      .replace(/(r\.)?status_id/gi, String(row.status_id))
      .replace(/(r\.)?in_qa/gi, String(row.in_qa))
      .replace(/v\.status/gi, String(PHASE_OPEN))
      .replace(/ = /g, ' === ')
      .replace(/ and /gi, ' && ')
      .replace(/not /gi, '!');
    return Function(`return (${expr});`)() as boolean;
  }

  /** Applies `col = <int>` assignments of the SET clause. */
  function applySet(set: string, row: Row) {
    for (const part of set.split(',')) {
      const m = /^\s*(?:r\.)?(\w+)\s*=\s*(\d+)\s*$/.exec(part);
      if (!m) throw new Error(`unexpected SET part: ${part}`);
      if (m[1] in row) (row as any)[m[1]] = Number(m[2]);
    }
  }

  function makeDb(row: Row) {
    return {
      query: jest.fn(async (sql: string) => {
        const s = normalize(sql);
        const m = /^UPDATE .*? SET (.+?) WHERE (.+)$/i.exec(s);
        if (!m) throw new Error(`unexpected statement: ${s}`);
        if (!whereMatches(m[2], row)) return { affectedRows: 0 };
        applySet(m[1], row);
        return { affectedRows: 1 };
      }),
    };
  }

  function generalInformation(row: Row) {
    const service: any = Object.create(ResultsService.prototype);
    service._resultRepository = {
      getResultById: jest.fn(async () => ({
        id: RESULT_ID,
        inQA: row.in_qa,
        is_phase_open: PHASE_OPEN,
      })),
    };
    // Past the lock, the first lookup ends the call without writing (this is not a GI test).
    service._resultTypesService = {
      findOneResultType: jest.fn(async () => ({ status: 404 })),
    };
    service._handlersError = {
      returnErrorRes: jest.fn(({ error }) => ({
        message: error?.message,
        status: error?.status,
      })),
    };
    return service.createResultGeneralInformation(
      { result_id: RESULT_ID, result_type_id: 1, result_level_id: 3 },
      USER,
    );
  }

  function unsubmit(db: { query: jest.Mock }) {
    const service: any = Object.create(SubmissionsService.prototype);
    const resultRepository: any = Object.create(ResultRepository.prototype);
    resultRepository.getResultById = jest.fn(async () => ({ id: RESULT_ID }));
    resultRepository.query = db.query;
    service._resultRepository = resultRepository;
    service._roleByUserRepository = {
      validationRolePermissions: jest.fn(async () => true),
    };
    service._submissionRepository = { save: jest.fn(async (s: any) => s) };
    service._handlersError = {
      returnErrorRes: jest.fn(({ error }) => ({
        message: error?.message,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      })),
    };
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    return service.unsubmitFunction(RESULT_ID, USER, {
      comment: 'Round 2 after QA comments',
    });
  }

  it('locks while In QA, and the not_qaed release clears in_qa so editing and unsubmit work again', async () => {
    const row: Row = { in_qa: 0, status_id: 3, is_active: 1 };
    const db = makeDb(row);
    const intake = new QaIntakeRepository();

    // Intake: Submitted -> In QA.
    expect(await intake.markInQa([RESULT_ID], db as any)).toBe(1);
    expect(row).toMatchObject({ in_qa: 1, status_id: 3 });

    // While In QA: General information and unsubmit are refused, and the row does not move.
    const giLocked = await generalInformation(row);
    expect(giLocked.status).toBe(HttpStatus.CONFLICT);
    expect(giLocked.message).toBe(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    const unsubmitLocked = await unsubmit(db);
    expect(unsubmitLocked.status).toBe(HttpStatus.CONFLICT);
    expect(row).toMatchObject({ in_qa: 1, status_id: 3 });

    // QA releases it as not QA'd: in_qa back to 0, still Submitted.
    expect(await intake.releaseNotQaed([RESULT_ID], db as any)).toBe(1);
    expect(row).toMatchObject({ in_qa: 0, status_id: 3 });

    // Editing is no longer refused by the lock.
    const giAfter = await generalInformation(row);
    expect(giAfter.message).not.toBe(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    expect(giAfter.status).not.toBe(HttpStatus.CONFLICT);

    // And the result can be unsubmitted (back to Editing).
    const unsubmitAfter = await unsubmit(db);
    expect(unsubmitAfter.status).not.toBe(HttpStatus.CONFLICT);
    expect(row).toMatchObject({ in_qa: 0, status_id: 1 });
  });

  it('a second not_qaed release on an already released row changes nothing', async () => {
    const row: Row = { in_qa: 0, status_id: 3, is_active: 1 };
    const db = makeDb(row);
    expect(
      await new QaIntakeRepository().releaseNotQaed([RESULT_ID], db as any),
    ).toBe(0);
    expect(row).toMatchObject({ in_qa: 0, status_id: 3 });
  });
});
