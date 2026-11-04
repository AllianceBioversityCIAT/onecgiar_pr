import { resultValidationRepository } from './results-validation-module.repository';
import { ValidationMapsEnum } from './enum/validation-maps.enum';

// IRS-T-7 / IRS-R-7 / IRS-DD-7 — section list per type and portfolio.
describe('resultValidationRepository.validateResultById — section list', () => {
  let findOne: jest.Mock;
  let query: jest.Mock;
  let repo: resultValidationRepository;

  const sectionsSent = (): string[] => {
    const sql: string = query.mock.calls[0][0];
    return JSON.parse(/'(\[.*\])'/.exec(sql)[1]);
  };

  const withResult = (result_type_id: number, acronym: string) => {
    findOne.mockResolvedValue({
      id: 10,
      result_type_id,
      obj_version: { obj_portfolio: { acronym } },
    });
  };

  beforeEach(() => {
    findOne = jest.fn();
    query = jest.fn().mockResolvedValue([[]]);
    const dataSource = {
      createEntityManager: jest.fn(),
      getRepository: jest.fn().mockReturnValue({ findOne }),
      query,
    };
    repo = new resultValidationRepository(dataSource as any, {} as any);
  });

  it('P25 type 9 gets exactly the five impact sections', async () => {
    withResult(9, 'P25');
    await repo.validateResultById(10);
    expect(sectionsSent()).toEqual([
      'general-information',
      'geographic-location',
      'evidences',
      'contributor-partners',
      ValidationMapsEnum.IMPACT_LEVEL_INFO,
    ]);
    expect(ValidationMapsEnum.IMPACT_LEVEL_INFO).toBe('impact-level-info');
  });

  it('P22 type 9 does not get impact-level-info', async () => {
    withResult(9, 'P22');
    await repo.validateResultById(10);
    expect(sectionsSent()).not.toContain('impact-level-info');
    expect(sectionsSent()).toEqual([
      'general-information',
      'geographic-location',
      'evidences',
      'links-to-results',
      'theory-of-change',
      'partners',
    ]);
  });

  it('P25 type 7 list is unchanged', async () => {
    withResult(7, 'P25');
    await repo.validateResultById(10);
    expect(sectionsSent()).toEqual([
      'general-information',
      'geographic-location',
      'evidences',
      'contributor-partners',
      'innovation-dev-info',
    ]);
  });

  it.each([1, 2, 5, 6])(
    'P25 type %i never gets impact-level-info',
    async (t) => {
      withResult(t, 'P25');
      await repo.validateResultById(10);
      expect(sectionsSent()).not.toContain('impact-level-info');
    },
  );
});
