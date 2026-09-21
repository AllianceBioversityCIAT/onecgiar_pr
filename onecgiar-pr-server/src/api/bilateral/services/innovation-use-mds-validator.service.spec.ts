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

  /**
   * 🛑 The fixtures above answer with a real `false`, which is a shape the database NEVER returns:
   * `innov_use_to_be_determined` is a `tinyint` column, so `getInnovationUse` answers `1` / `0`.
   * That is why the whole persisted suite stayed green while every real submit was rejected
   * (Cristian Gamboa, prtest, 18-Sep-2026). These three cases use the stored shape.
   */
  const persistedWith = (storedAnswer: unknown, actors: unknown[]) => ({
    getInnovationUse: jest.fn().mockResolvedValue({
      response: {
        ...completePersisted,
        innov_use_to_be_determined: storedAnswer,
        actors,
      },
    }),
  });

  it('accepts a persisted "yes" stored as the tinyint 1', async () => {
    const validator = new InnovationUseMdsValidator(
      persistedWith(1, []) as any,
    );

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });

  it('accepts a persisted "no" stored as the tinyint 0 when actors exist', async () => {
    const validator = new InnovationUseMdsValidator(
      persistedWith(0, [{ id: 1 }]) as any,
    );

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });

  it('still rejects a persisted "no" stored as 0 with no actors', async () => {
    const validator = new InnovationUseMdsValidator(
      persistedWith(0, []) as any,
    );

    await expect(validator.assertPersistedMds(12)).rejects.toThrow(
      'add at least one actor',
    );
  });

  it('still rejects a draft where the question was never answered', async () => {
    const validator = new InnovationUseMdsValidator(
      persistedWith(null, [{ id: 1 }]) as any,
    );

    await expect(validator.assertPersistedMds(12)).rejects.toThrow(
      'state whether innovation use is yet to be determined',
    );
  });
});
