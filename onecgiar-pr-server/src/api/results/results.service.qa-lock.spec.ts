import { HttpStatus } from '@nestjs/common';
import { ResultsService } from './results.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import {
  RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE,
  isResultUnderQaReview,
} from '../../shared/constants/qa-review-lock.constant';

/**
 * QA review lock — General information must not save while QA holds the result
 * (`in_qa = 1` in an open phase). Reproduces the prtest case where a Submitted result that QA had
 * In QA (timeline 40) still accepted `PATCH create/general-information`.
 *
 * `ResultsService` has a very large constructor, so the unit is built off the prototype with only
 * the collaborators `createResultGeneralInformation` touches before its first write.
 */
describe('ResultsService.createResultGeneralInformation — QA review lock', () => {
  const user = { id: 1 } as TokenDto;
  const body: any = {
    result_id: 12619,
    result_type_id: 1,
    result_level_id: 3,
    result_name: 'Some title',
    gender_tag_id: 1,
    climate_change_tag_id: 1,
  };

  function makeService(result: any) {
    const service: any = Object.create(ResultsService.prototype);
    service._resultRepository = {
      getResultById: jest.fn().mockResolvedValue(result),
      update: jest.fn(),
      save: jest.fn(),
    };
    // First validation after the lock check. Failing it on purpose keeps the "unlocked" test
    // off every write path while still proving the method went past the lock.
    service._resultTypesService = {
      findOneResultType: jest
        .fn()
        .mockResolvedValue({ status: 404, message: 'stop here' }),
    };
    service._handlersError = {
      returnErrorRes: jest.fn(({ error }) => ({
        response: error?.response ?? {},
        message: error?.message,
        status: error?.status,
      })),
    };
    return service;
  }

  it('rejects with 409 and writes nothing when the result is In QA in an open phase', async () => {
    const service = makeService({ id: 12619, inQA: 1, is_phase_open: 1 });

    const res = await service.createResultGeneralInformation(body, user);

    expect(res.status).toBe(HttpStatus.CONFLICT);
    expect(res.message).toBe(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    expect(
      service._resultTypesService.findOneResultType,
    ).not.toHaveBeenCalled();
    expect(service._resultRepository.update).not.toHaveBeenCalled();
    expect(service._resultRepository.save).not.toHaveBeenCalled();
  });

  it('also rejects when MySQL returns the flags as strings', async () => {
    const service = makeService({ id: 12619, inQA: '1', is_phase_open: '1' });

    const res = await service.createResultGeneralInformation(body, user);

    expect(res.status).toBe(HttpStatus.CONFLICT);
  });

  it.each([
    ['not In QA', { inQA: 0, is_phase_open: 1 }],
    ['In QA but the phase is closed', { inQA: 1, is_phase_open: 0 }],
  ])('does not apply the lock when the result is %s', async (_label, flags) => {
    const service = makeService({ id: 12619, ...flags });

    const res = await service.createResultGeneralInformation(body, user);

    expect(res.message).not.toBe(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    expect(service._resultTypesService.findOneResultType).toHaveBeenCalled();
  });
});

describe('isResultUnderQaReview', () => {
  it.each([
    [{ inQA: 1, is_phase_open: 1 }, true],
    [{ inQA: '1', is_phase_open: '1' }, true],
    [{ inQA: true, is_phase_open: 1 }, true],
    [{ inQA: 0, is_phase_open: 1 }, false],
    [{ inQA: null, is_phase_open: 1 }, false],
    [{ inQA: 1, is_phase_open: 0 }, false],
    [null, false],
    [undefined, false],
  ])('%j -> %s', (row, expected) => {
    expect(isResultUnderQaReview(row as any)).toBe(expected);
  });
});
