import { HttpStatus } from '@nestjs/common';
import { InnoDevService } from './innovation_dev.service';

/**
 * Regression net for the silent partial save found on prtest 21-Sep-2026 (result id 11974): a blank
 * row staged by the form's own "Add" buttons made `saveAnticipatedInnoUser` `return` mid-flight, so
 * every row queued behind it was never written while the caller still answered 201.
 */
describe('InnoDevService.saveAnticipatedInnoUser', () => {
  const buildService = () => {
    const actorRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const measureRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new InnoDevService(
      {} as any,
      actorRepository as any,
      {} as any,
      measureRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, actorRepository, measureRepository };
  };

  it('ignores the blank row "Add other" stages and still writes the filled one', async () => {
    const { service, measureRepository } = buildService();

    const result = await service.saveAnticipatedInnoUser(11974, 90, {
      innovatonUse: {
        measures: [
          { is_active: true },
          { unit_of_measure: 'hectares', quantity: 12, is_active: true },
        ],
      },
    } as any);

    expect(result).toBeUndefined();
    expect(measureRepository.save).toHaveBeenCalledTimes(1);
    expect(measureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: 11974,
        unit_of_measure: 'hectares',
        quantity: 12,
      }),
    );
  });

  it('ignores a row deleted before it was ever stored', async () => {
    const { service, measureRepository } = buildService();

    const result = await service.saveAnticipatedInnoUser(11974, 90, {
      innovatonUse: {
        measures: [
          { is_active: false },
          { unit_of_measure: 'hectares', quantity: 12, is_active: true },
        ],
      },
    } as any);

    expect(result).toBeUndefined();
    expect(measureRepository.save).toHaveBeenCalledTimes(1);
  });

  it('writes everything it can and reports the row it refused', async () => {
    const { service, measureRepository } = buildService();

    const result = await service.saveAnticipatedInnoUser(11974, 90, {
      innovatonUse: {
        measures: [
          { quantity: 7, is_active: true },
          { unit_of_measure: 'hectares', quantity: 12, is_active: true },
        ],
      },
    } as any);

    expect(measureRepository.save).toHaveBeenCalledTimes(1);
    expect(result?.status).toBe(HttpStatus.BAD_REQUEST);
    expect(result?.message).toBe('The field Unit of Measure is required');
  });

  it('does not let a blank actor row stop the measures block that follows it', async () => {
    const { service, actorRepository, measureRepository } = buildService();

    const result = await service.saveAnticipatedInnoUser(11974, 90, {
      innovatonUse: {
        actors: [{ actor_type_id: null, is_active: true }],
        measures: [
          { unit_of_measure: 'hectares', quantity: 12, is_active: true },
        ],
      },
    } as any);

    expect(result).toBeUndefined();
    expect(actorRepository.save).not.toHaveBeenCalled();
    expect(measureRepository.save).toHaveBeenCalledTimes(1);
  });
});

/**
 * P2-3785 (4b) — the W3/bilateral actors form saves through this legacy writer and now offers the
 * pooled "Age disaggregation not available" fallback. The two flags must be written when they travel
 * and left untouched when they do not, so the older W1/W2 callers never null a stored value.
 */
describe('InnoDevService.saveAnticipatedInnoUser — age fallback flags (P2-3785)', () => {
  const buildService = (stored: any = null) => {
    const actorRepository = {
      findOne: jest.fn().mockResolvedValue(stored),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new InnoDevService(
      {} as any,
      actorRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, actorRepository };
  };

  it('persists both flags on a new actor when the payload carries them', async () => {
    const { service, actorRepository } = buildService();
    await service.saveAnticipatedInnoUser(9545, 90, {
      innovatonUse: {
        actors: [
          {
            actor_type_id: 1,
            women: 9,
            women_youth: 5,
            sex_and_age_disaggregation: false,
            age_disaggregation_not_available: true,
            youth_split_applied_by_system: true,
          },
        ],
      },
    } as any);
    expect(actorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        age_disaggregation_not_available: true,
        youth_split_applied_by_system: true,
      }),
    );
  });

  it('updates a stored actor with a cleared flag as null', async () => {
    const { service, actorRepository } = buildService({ result_actors_id: 77 });
    await service.saveAnticipatedInnoUser(9545, 90, {
      innovatonUse: {
        actors: [
          {
            result_actors_id: 77,
            actor_type_id: 1,
            age_disaggregation_not_available: null,
            youth_split_applied_by_system: null,
          },
        ],
      },
    } as any);
    expect(actorRepository.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        age_disaggregation_not_available: null,
        youth_split_applied_by_system: null,
      }),
    );
  });

  it('leaves both columns out when an older caller does not send them', async () => {
    const { service, actorRepository } = buildService({ result_actors_id: 77 });
    await service.saveAnticipatedInnoUser(9545, 90, {
      innovatonUse: {
        actors: [{ result_actors_id: 77, actor_type_id: 1, women: 3 }],
      },
    } as any);
    const written = actorRepository.update.mock.calls[0][1];
    expect(written).not.toHaveProperty('age_disaggregation_not_available');
    expect(written).not.toHaveProperty('youth_split_applied_by_system');
  });
});

/**
 * P2-3428 — the same writer serves the 2030 Use Projection with `section = 2`. Current-use saves must
 * never match a 2030 row, and 2030 saves must stamp and match `section_id = 2` only.
 */
describe('InnoDevService.saveAnticipatedInnoUser — 2030 projection section (P2-3428)', () => {
  const buildService = () => {
    const actorRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const institutionTypeRepository = {
      getNewResultByInstitutionTypeExists: jest.fn().mockResolvedValue(null),
      getNewResultByIdExists: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const measureRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new InnoDevService(
      {} as any,
      actorRepository as any,
      institutionTypeRepository as any,
      measureRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return {
      service,
      actorRepository,
      institutionTypeRepository,
      measureRepository,
    };
  };

  const payload = {
    innovatonUse: {
      actors: [{ actor_type_id: 1, women: 3 }],
      organization: [{ institution_types_id: 12, how_many: 4 }],
      measures: [{ unit_of_measure: 'hectares', quantity: 50 }],
    },
  } as any;

  it('stamps section 2 on every new projection row and looks up inside section 2 only', async () => {
    const {
      service,
      actorRepository,
      institutionTypeRepository,
      measureRepository,
    } = buildService();
    await service.saveAnticipatedInnoUser(9545, 90, payload, 2);

    expect(actorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: 2 }),
    );
    expect(institutionTypeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: 2 }),
    );
    expect(measureRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: 2 }),
    );
    expect(
      institutionTypeRepository.getNewResultByInstitutionTypeExists,
    ).toHaveBeenCalledWith(9545, 12, 5, { only: 2 });
    expect(measureRepository.findOne.mock.calls[0][0].where.section_id).toBe(2);
  });

  it('keeps current-use rows unstamped and excludes section 2 from their lookups', async () => {
    const {
      service,
      actorRepository,
      institutionTypeRepository,
      measureRepository,
    } = buildService();
    await service.saveAnticipatedInnoUser(9545, 90, payload);

    expect(actorRepository.save.mock.calls[0][0]).not.toHaveProperty(
      'section_id',
    );
    expect(institutionTypeRepository.save.mock.calls[0][0]).not.toHaveProperty(
      'section_id',
    );
    expect(measureRepository.save.mock.calls[0][0]).not.toHaveProperty(
      'section_id',
    );
    expect(
      institutionTypeRepository.getNewResultByInstitutionTypeExists,
    ).toHaveBeenCalledWith(9545, 12, 5, { exclude: 2 });
    // A TypeORM `Raw` operator: "section_id IS NULL OR section_id <> 2".
    const where = measureRepository.findOne.mock.calls[0][0].where.section_id;
    expect(where?.getSql?.('m.section_id')).toBe(
      '(m.section_id IS NULL OR m.section_id <> 2)',
    );
  });

  it('retires only the projection rows when the 2030 use is yet to be determined', async () => {
    const {
      service,
      actorRepository,
      institutionTypeRepository,
      measureRepository,
    } = buildService();
    await service.deactivateInnovationUse2030(9545, 90);

    const done = { is_active: false, last_updated_by: 90 };
    expect(actorRepository.update).toHaveBeenCalledWith(
      { result_id: 9545, section_id: 2, is_active: true },
      done,
    );
    expect(institutionTypeRepository.update).toHaveBeenCalledWith(
      {
        results_id: 9545,
        institution_roles_id: 5,
        section_id: 2,
        is_active: true,
      },
      done,
    );
    expect(measureRepository.update).toHaveBeenCalledWith(
      { result_id: 9545, section_id: 2, is_active: true },
      done,
    );
  });
});
