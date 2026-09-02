import { HttpStatus } from '@nestjs/common';
import { ResultsValidationModuleService } from './results-validation-module.service';
import { HandlersError } from '../../../shared/handlers/error.utils';

/**
 * P2-3552 — first tests in this module.
 *
 * `results-validation-module/` shipped with no spec at all, which is how three separate things went
 * unnoticed at once: a SQL failure reported as "Result not found", `Boolean('0') === true` on the value that
 * decides whether a section is green, and `submit` computed by multiplying parsed strings. The rail and the
 * Submit button read nothing else, so a wrong answer here is invisible until a user is either blocked or
 * allowed to submit an incomplete result.
 */
describe('ResultsValidationModuleService — calculateValidationSections (P2-3552)', () => {
  let service: ResultsValidationModuleService;
  let repository: { validateResultById: jest.Mock };

  beforeEach(() => {
    repository = { validateResultById: jest.fn() };
    service = new ResultsValidationModuleService(
      repository as any,
      {} as any,
      new HandlersError(),
    );
  });

  it('answers 404 when the result does not exist', async () => {
    repository.validateResultById.mockResolvedValue(null);

    const res: any = await service.calculateValidationSections(1);

    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.message).toBe('Result not found');
  });

  it('maps every section and reports submit when all of them are valid', async () => {
    repository.validateResultById.mockResolvedValue([
      { section_name: 'general-information', validation: 1 },
      { section_name: 'contributor-partners', validation: 1 },
    ]);

    const res: any = await service.calculateValidationSections(1);

    expect(res.response.green_checks).toEqual([
      { section_name: 'general-information', validation: true },
      { section_name: 'contributor-partners', validation: true },
    ]);
    expect(res.response.submit).toBe(true);
  });

  it('withholds submit when a single section is invalid', async () => {
    repository.validateResultById.mockResolvedValue([
      { section_name: 'general-information', validation: 1 },
      { section_name: 'contributor-partners', validation: 0 },
    ]);

    const res: any = await service.calculateValidationSections(1);

    expect(res.response.green_checks.at(-1).validation).toBe(false);
    expect(res.response.submit).toBe(false);
  });

  it("🛑 reads a STRING '0' as invalid — Boolean('0') is true and would paint the section green", async () => {
    repository.validateResultById.mockResolvedValue([
      { section_name: 'general-information', validation: '1' },
      { section_name: 'contributor-partners', validation: '0' },
    ]);

    const res: any = await service.calculateValidationSections(1);

    expect(res.response.green_checks).toEqual([
      { section_name: 'general-information', validation: true },
      { section_name: 'contributor-partners', validation: false },
    ]);
    expect(res.response.submit).toBe(false);
  });

  it('surfaces a failing validation query as an error, NOT as "Result not found"', async () => {
    repository.validateResultById.mockRejectedValue(
      Object.assign(new Error('ER_SP_DOES_NOT_EXIST'), {
        code: 'ER_SP_DOES_NOT_EXIST',
      }),
    );

    const res: any = await service.calculateValidationSections(1);

    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.message).not.toBe('Result not found');
    expect(res.message).toBe('ER_SP_DOES_NOT_EXIST');
  });

  it('an empty section list is not a green light', async () => {
    // `[].every(...)` is `true`, so an empty answer used to read as "everything complete" the moment the
    // multiplication seed of 1 survived untouched.
    repository.validateResultById.mockResolvedValue([]);

    const res: any = await service.calculateValidationSections(1);

    expect(res.response.green_checks).toEqual([]);
    expect(res.response.submit).toBe(false);
  });
});
