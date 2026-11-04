import { IsNull } from 'typeorm';
import { InnovationUseService } from './innovation-use.service';

/**
 * IFC-R-4 / IFC-DD-8 — Farmers rows without an id de-duplicate on (type, unit, nature).
 * A second Farmers row with a different answer must be INSERTED, never overwrite the first.
 * Other actor types keep matching on type only.
 */
describe('InnovationUseService — Farmers row matching (IFC-T-3)', () => {
  const USER = { id: 7 } as any;
  const RESULT_ID = 41;
  const FARMERS = 1;
  const RESEARCHERS = 2;

  /** Fake repo: `findOne` honours the where clause against the saved rows. */
  function makeService(rows: any[]) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };

    const matches = (row: any, where: any) =>
      Object.entries(where).every(([key, expected]: [string, any]) => {
        if (expected && expected._type === 'isNull') {
          return row[key] === null || row[key] === undefined;
        }
        return row[key] === expected;
      });

    service._resultActorRepository = {
      findOne: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
        ),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    service._resultByIntitutionsTypeRepository = {};
    service._resultIpMeasureRepository = {};
    return service;
  }

  const saved = (over: Record<string, unknown>) => ({
    result_actors_id: 100,
    result_id: RESULT_ID,
    is_active: true,
    section_id: 1,
    actor_type_id: FARMERS,
    count_unit: null,
    use_nature: null,
    ...over,
  });

  const run = (service: any, actors: any[]) =>
    service.saveAnticipatedInnoUser(RESULT_ID, USER.id, { actors }, 1);

  it('different answers -> insert, first row untouched', async () => {
    const service = makeService([
      saved({ count_unit: 'individuals', use_nature: 'information_received' }),
    ]);

    await run(service, [
      {
        actor_type_id: FARMERS,
        count_unit: 'individuals',
        use_nature: 'innovation_applied',
      },
    ]);

    expect(service._resultActorRepository.update).not.toHaveBeenCalled();
    expect(service._resultActorRepository.save).toHaveBeenCalledTimes(1);
    expect(service._resultActorRepository.save.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        actor_type_id: FARMERS,
        count_unit: 'individuals',
        use_nature: 'innovation_applied',
      }),
    );
  });

  it('identical answers -> update the existing row', async () => {
    const service = makeService([
      saved({ count_unit: 'individuals', use_nature: 'information_received' }),
    ]);

    await run(service, [
      {
        actor_type_id: FARMERS,
        count_unit: 'individuals',
        use_nature: 'information_received',
      },
    ]);

    expect(service._resultActorRepository.save).not.toHaveBeenCalled();
    expect(service._resultActorRepository.update).toHaveBeenCalledWith(
      100,
      expect.anything(),
    );
  });

  it('both NULL on both sides -> update the existing row', async () => {
    const service = makeService([saved({})]);

    await run(service, [{ actor_type_id: FARMERS }]);

    expect(service._resultActorRepository.save).not.toHaveBeenCalled();
    expect(service._resultActorRepository.update).toHaveBeenCalledWith(
      100,
      expect.anything(),
    );
  });

  it('non-Farmers duplicate -> update as today, even if it carries codes', async () => {
    const service = makeService([saved({ actor_type_id: RESEARCHERS })]);

    await run(service, [
      {
        actor_type_id: RESEARCHERS,
        count_unit: 'households',
        use_nature: 'innovation_applied',
      },
    ]);

    expect(service._resultActorRepository.save).not.toHaveBeenCalled();
    expect(service._resultActorRepository.update).toHaveBeenCalledWith(
      100,
      expect.anything(),
    );
  });

  it('IsNull sentinel sanity', () => {
    expect((IsNull() as any)._type).toBe('isNull');
  });
});
