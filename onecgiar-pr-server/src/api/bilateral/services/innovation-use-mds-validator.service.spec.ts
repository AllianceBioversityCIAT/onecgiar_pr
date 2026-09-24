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
      },
      contributing_bilateral_projects: [
        { grant_title: 'Project A', usd_budget: 100 },
      ],
    }) as any;

  const completePersisted = {
    innov_use_to_be_determined: false,
    actors: [{ id: 1 }],
    measures: [{ unit_of_measure: 'hectares', quantity: 0 }],
    investment_bilateral: [
      { kind_cash: 100, is_determined: null, name: 'Project A' },
    ],
  };

  /**
   * P2-3785 AC1 — the use level left the standard (Nicoleta Trifa, #INC-163204 point 4a).
   *
   * Written as its own case and not left implicit in the fixtures above: those would keep passing if
   * someone re-added the rule and also re-added the field to them, and the fixtures are edited far more
   * often than this rule changes. Here the ABSENCE is the subject — both entry points, because the gate
   * answers external create AND submit-for-review, and a rule restored on one of them is exactly the
   * shape of bug this validator exists to prevent.
   */
  describe('the use level is no longer a minimum data standard (P2-3785 AC1)', () => {
    it('accepts an external payload that carries no use level', async () => {
      const validator = new InnovationUseMdsValidator({} as any);
      const payload = completeExternal();
      delete payload.innovation_use.innovation_use_level;

      await expect(
        validator.assertExternalCreateMds(payload),
      ).resolves.toBeUndefined();
    });

    it('accepts a persisted draft whose use level is null', async () => {
      const summaryService = {
        getInnovationUse: jest.fn().mockResolvedValue({
          response: { ...completePersisted, innovation_use_level_id: null },
        }),
      } as any;
      const validator = new InnovationUseMdsValidator(summaryService);

      await expect(validator.assertPersistedMds(1)).resolves.toBeUndefined();
    });
  });

  it('accepts a complete external Innovation Use payload', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    await expect(
      validator.assertExternalCreateMds(completeExternal()),
    ).resolves.toBeUndefined();
  });

  it.each(['omitted', 'empty'])(
    'accepts an external payload with quantitative measures %s',
    async (state) => {
      const validator = new InnovationUseMdsValidator({} as any);
      const payload = completeExternal();
      if (state === 'omitted') {
        delete payload.innovation_use.current_innovation_use_numbers.measures;
      } else {
        payload.innovation_use.current_innovation_use_numbers.measures = [];
      }

      await expect(
        validator.assertExternalCreateMds(payload),
      ).resolves.toBeUndefined();
    },
  );

  it('accepts a persisted draft without quantitative measures', async () => {
    const { measures: _measures, ...withoutMeasures } = completePersisted;
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({ response: withoutMeasures }),
    } as any;
    const validator = new InnovationUseMdsValidator(summaryService);

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });

  it('still rejects a partially completed quantitative measure row', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    payload.innovation_use.current_innovation_use_numbers.measures = [
      { unit_of_measure: 'hectares' },
    ];

    await expect(validator.assertExternalCreateMds(payload)).rejects.toThrow(
      'add at least one measure with a unit and quantity',
    );
  });

  it('ignores saved measures when current innovation use is marked TBD', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    payload.innovation_use.current_innovation_use_numbers.innov_use_to_be_determined = true;
    payload.innovation_use.current_innovation_use_numbers.measures = [
      { unit_of_measure: 'hectares' },
    ];

    await expect(validator.assertExternalCreateMds(payload)).resolves.toBeUndefined();
  });

  it('does not block persisted submission on measures when current use is TBD', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: {
          ...completePersisted,
          innov_use_to_be_determined: 1,
          measures: [{ unit_of_measure: null, quantity: null }],
        },
      }),
    } as any;
    const validator = new InnovationUseMdsValidator(summaryService);

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
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

  it('accepts an identified external project without a budget', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    delete payload.contributing_bilateral_projects[0].usd_budget;

    await expect(
      validator.assertExternalCreateMds(payload),
    ).resolves.toBeUndefined();
  });

  it('accepts a persisted linked project when its budget has neither amount nor TBD', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: {
          ...completePersisted,
          investment_bilateral: [
            { kind_cash: null, is_determined: null, name: 'Project A' },
          ],
        },
      }),
    };
    const validator = new InnovationUseMdsValidator(summaryService as any);

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });

  it('still rejects an external project without its identifying grant title', async () => {
    const validator = new InnovationUseMdsValidator({} as any);
    const payload = completeExternal();
    delete payload.contributing_bilateral_projects[0].grant_title;
    await expect(validator.assertExternalCreateMds(payload)).rejects.toThrow(
      'every project must be identified',
    );
  });

  it('does not require budgets for any identified persisted project', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: {
          ...completePersisted,
          investment_bilateral: [
            { kind_cash: null, is_determined: true, name: 'Rice Scaling' },
            { kind_cash: null, is_determined: null, name: 'Delta Agronomy' },
          ],
        },
      }),
    };
    const validator = new InnovationUseMdsValidator(summaryService as any);

    await expect(validator.assertPersistedMds(12)).resolves.toBeUndefined();
  });

  it('falls back to the row position when the project link carries no name', async () => {
    const summaryService = {
      getInnovationUse: jest.fn().mockResolvedValue({
        response: {
          ...completePersisted,
          investment_bilateral: [
            { kind_cash: 5000, is_determined: null, name: 'Rice Scaling' },
            { kind_cash: null, is_determined: null, name: null },
          ],
        },
      }),
    };
    const validator = new InnovationUseMdsValidator(summaryService as any);

    await expect(validator.assertPersistedMds(12)).rejects.toThrow(
      'project #2',
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
