import { Test } from '@nestjs/testing';
import { ContributionConsistencyService } from './contribution-consistency.service';
import { ResultsCapacityDevelopmentsRepository } from '../../results/summary/repositories/results-capacity-developments.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('ContributionConsistencyService (P2-2932)', () => {
  let service: ContributionConsistencyService;
  let capDevRepo: { findOne: jest.Mock };
  let actorsRepo: { find: jest.Mock };

  beforeEach(async () => {
    capDevRepo = { findOne: jest.fn().mockResolvedValue(null) };
    actorsRepo = { find: jest.fn().mockResolvedValue([]) };

    const module = await Test.createTestingModule({
      providers: [
        ContributionConsistencyService,
        {
          provide: ResultsCapacityDevelopmentsRepository,
          useValue: capDevRepo,
        },
        { provide: ResultActorRepository, useValue: actorsRepo },
      ],
    }).compile();

    service = module.get(ContributionConsistencyService);
  });

  it('matches a Capacity Sharing result whose boxes add up to the head count', async () => {
    capDevRepo.findOne.mockResolvedValue({ female_using: 120, male_using: 80 });

    const result = await service.check(
      1,
      ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      [{ contributingIndicator: 120 }, { contributingIndicator: 80 }],
    );

    expect(result.status).toBe('MATCH');
    expect(result.expected).toBe(200);
    expect(result.reported).toBe(200);
  });

  it('flags the shortfall when they do not add up', async () => {
    capDevRepo.findOne.mockResolvedValue({ female_using: 120, male_using: 80 });

    const result = await service.check(
      1,
      ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      [{ contributingIndicator: 120 }],
    );

    expect(result.status).toBe('DIFFERS');
    expect(result.expected).toBe(200);
    expect(result.reported).toBe(120);
  });

  it('sums every actor row for Innovation Use', async () => {
    actorsRepo.find.mockResolvedValue([
      { how_many: 203100 },
      { how_many: 1900 },
    ]);

    const result = await service.check(1, ResultTypeEnum.INNOVATION_USE, [
      { contributingIndicator: 205000 },
    ]);

    expect(result.status).toBe('MATCH');
    expect(result.expected).toBe(205000);
  });

  /**
   * An absent section is "nothing to compare", not "a total of zero". Without this the check would
   * fire on every result nobody has reached yet.
   */
  it('stays quiet when Section 4 has not been filled in', async () => {
    capDevRepo.findOne.mockResolvedValue(null);

    const result = await service.check(
      1,
      ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      [{ contributingIndicator: null }],
    );

    expect(result.status).toBe('NOTHING_TO_COMPARE');
  });

  it('carries the default a new Knowledge Product box starts with', async () => {
    const result = await service.check(1, ResultTypeEnum.KNOWLEDGE_PRODUCT, []);

    expect(result.defaultValue).toBe(1);
  });

  it('carries no default for a type the user fills in themselves', async () => {
    const result = await service.check(
      1,
      ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      [],
    );

    expect(result.defaultValue).toBeNull();
  });

  it('refuses a Knowledge Product value outside 0 and 1', async () => {
    const result = await service.check(1, ResultTypeEnum.KNOWLEDGE_PRODUCT, [
      { contributingIndicator: 7 },
    ]);

    expect(result.status).toBe('REJECTED');
  });

  // Reading only. `contributing_indicator` drives live progress reporting on six surfaces.
  it('never writes', async () => {
    await service.check(1, ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT, [
      { contributingIndicator: 5 },
    ]);

    expect((capDevRepo as any).save).toBeUndefined();
    expect((actorsRepo as any).save).toBeUndefined();
    expect(capDevRepo.findOne).toHaveBeenCalledWith({
      where: { result_id: 1, is_active: true },
    });
  });

  /**
   * P2-2932 — the mixed-type rule, now that `getRTRPrimaryV2` joins the indicator's own category.
   * Section 4 holds only the data for the type the result was created as.
   */
  describe('the mixed-type rule', () => {
    beforeEach(() => {
      capDevRepo.findOne.mockResolvedValue({
        female_using: 120,
        male_using: 80,
      });
    });

    it('ignores a box whose indicator belongs to another type', async () => {
      const result = await service.check(
        1,
        ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        [
          {
            contributingIndicator: 200,
            indicatorResultTypeId:
              ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          },
          {
            contributingIndicator: 999,
            indicatorResultTypeId: ResultTypeEnum.INNOVATION_DEVELOPMENT,
          },
        ],
      );

      expect(result.status).toBe('MATCH');
      expect(result.reported).toBe(200);
      expect(result.boxesOfAnotherType).toBe(1);
    });

    /**
     * An indicator whose `type_value` matches no known pattern comes back null and is passed as
     * undefined. "Cannot tell" must be compared, not dropped — dropping it would hide a real
     * disagreement behind an unrecognised label.
     */
    it('compares a box whose indicator type could not be identified', async () => {
      const result = await service.check(
        1,
        ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        [{ contributingIndicator: 150, indicatorResultTypeId: undefined }],
      );

      expect(result.status).toBe('DIFFERS');
      expect(result.reported).toBe(150);
      expect(result.boxesOfAnotherType).toBe(0);
    });
  });
});
