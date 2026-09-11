import { BadRequestException } from '@nestjs/common';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { InnovationUseMdsValidator } from './innovation-use-mds-validator.service';

describe('InnovationUseMdsValidator', () => {
  const completeExternal = () =>
    ({
      result_type_id: ResultTypeEnum.INNOVATION_USE,
      innovation_use: {
        current_innovation_use_numbers: {
          innov_use_to_be_determined: false,
          actors: [{ actor_type_id: 1 }],
          measures: [{ unit_of_measure: 'hectares', quantity: 0 }],
        },
        innovation_use_level: { level: 2 },
      },
      contributing_bilateral_projects: [
        { grant_title: 'Project A', usd_budget: 100 },
      ],
    }) as any;

  const completePersisted = {
    innov_use_to_be_determined: false,
    actors: [{ id: 1 }],
    measures: [{ unit_of_measure: 'hectares', quantity: 0 }],
    innovation_use_level_id: 2,
    investment_bilateral: [{ kind_cash: 100, is_determined: null }],
  };

  it('accepts a complete external Innovation Use payload', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    await expect(
      validator.assertExternalCreateMds(completeExternal()),
    ).resolves.toBeUndefined();
  });

  it('accepts an explicit TBD amount for every external bilateral project', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    payload.contributing_bilateral_projects[0] = {
      grant_title: 'Project A',
      is_determined: true,
    };

    await expect(
      validator.assertExternalCreateMds(payload),
    ).resolves.toBeUndefined();
  });

  it('rejects incomplete external investment before create', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    delete payload.contributing_bilateral_projects[0].usd_budget;

    await expect(validator.assertExternalCreateMds(payload)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a persisted draft when a linked project has neither amount nor TBD', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: {
          ...completePersisted,
          investment_bilateral: [{ kind_cash: null, is_determined: null }],
        },
      }),
    };
    const validator = new InnovationUseMdsValidator(summaryService as any);

    await expect(validator.assertPersistedMds(12)).rejects.toThrow(
      'Investment by CGIAR W3 or bilateral projects',
    );
  });

  it('accepts a complete persisted draft', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: completePersisted,
      }),
    };
    const validator = new InnovationUseMdsValidator(summaryService as any);

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });
});
