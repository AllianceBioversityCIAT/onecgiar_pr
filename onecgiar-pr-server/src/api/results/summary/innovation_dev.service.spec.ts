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
