import { InnovationUseService } from './innovation-use.service';

/**
 * @akili-spec changes/innovation-use-2026-total-and-new-users (IU26-T-11, IU26-R-11, IU26-R-12)
 *
 * `new_users` per actor / organization / measure row (v2 save). The service rejects a row whose
 * `new_users` exceeds the row total with a 400 naming the row, BEFORE any write.
 * Total: actors with `sex_and_age_disaggregation === true` use the typed `how_many`; any other
 * actor row (the breakdown applies) uses women + men, the same rule `getActorsData` applies on read.
 * Organizations use `how_many`, measures use `quantity`.
 * Built off the prototype (the constructor is huge).
 */
const RESULT_ID = 100;
const USER = { id: 7 } as any;

function makeService() {
  const service: any = Object.create(InnovationUseService.prototype);
  service.logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };
  service._handlersError = { returnErrorRes: jest.fn(({ error }) => error) };
  service._resultsInnovationsUseRepository = {
    findOne: jest.fn(),
    InnovUseExists: jest.fn(),
  };
  service._clarisaInnovationUseLevelRepository = { findOne: jest.fn() };
  service._resultRepository = { update: jest.fn() };
  return service;
}

const dto = (over: Record<string, unknown>) =>
  ({
    innovation_use_level_id: null,
    actors: [],
    organization: [],
    measures: [],
    innovation_use_2030: { actors: [], organization: [], measures: [] },
    ...over,
  }) as any;

async function save(service: any, body: any) {
  return service.saveInnovationUse(body, RESULT_ID, USER);
}

describe('InnovationUseService.saveInnovationUse - new_users above total (IU26-R-11)', () => {
  it('rejects an actor whose new_users (150) exceeds the typed total (120) with a 400 naming the row', async () => {
    const service = makeService();
    const res = await save(
      service,
      dto({
        actors: [
          {
            actor_type_id: 3,
            sex_and_age_disaggregation: true,
            how_many: 120,
            new_users: 150,
          },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/new_users/);
    expect(res.message).toMatch(/actor/i);
    expect(res.message).toMatch(/150/);
    expect(res.message).toMatch(/120/);
    expect(
      service._resultsInnovationsUseRepository.findOne,
    ).not.toHaveBeenCalled();
  });

  it('rejects a disaggregated actor row women 800 + men 1000 with new_users 1801', async () => {
    const service = makeService();
    const res = await save(
      service,
      dto({
        actors: [
          {
            actor_type_id: 3,
            sex_and_age_disaggregation: false,
            women: 800,
            men: 1000,
            how_many: 1800,
            new_users: 1801,
          },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/1801/);
    expect(res.message).toMatch(/1800/);
  });

  it('rejects an organization whose new_users exceeds how_many', async () => {
    const service = makeService();
    const res = await save(
      service,
      dto({
        organization: [
          { institution_types_id: 12, how_many: 10, new_users: 11 },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/organization/i);
  });

  it('rejects a measure whose new_users exceeds quantity', async () => {
    const service = makeService();
    const res = await save(
      service,
      dto({
        measures: [{ unit_of_measure: 'ha', quantity: 5.5, new_users: 6 }],
      }),
    );
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/measure/i);
  });

  it('also guards the 2030 groups', async () => {
    const service = makeService();
    const res = await save(
      service,
      dto({
        innovation_use_2030: {
          actors: [
            {
              actor_type_id: 3,
              sex_and_age_disaggregation: true,
              how_many: 5,
              new_users: 9,
            },
          ],
          organization: [],
          measures: [],
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it.each([
    ['equal to the total (120)', 120],
    ['null', null],
    ['absent', undefined],
    ['zero', 0],
  ])('does not reject an actor with new_users %s', (_label, value) => {
    const service = makeService();
    const row: any = {
      actor_type_id: 3,
      sex_and_age_disaggregation: true,
      how_many: 120,
    };
    if (value !== undefined) row.new_users = value;
    expect(() =>
      service.assertNewUsersWithinTotal(dto({ actors: [row] })),
    ).not.toThrow();
  });

  it('ignores inactive rows and rows without a comparable total', () => {
    const service = makeService();
    expect(() =>
      service.assertNewUsersWithinTotal(
        dto({
          actors: [
            { actor_type_id: 3, is_active: false, how_many: 1, new_users: 9 },
            {
              actor_type_id: 3,
              sex_and_age_disaggregation: true,
              new_users: 9,
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects a negative or non-integer new_users', () => {
    const service = makeService();
    for (const bad of [-1, 1.5, 'x']) {
      expect(() =>
        service.assertNewUsersWithinTotal(
          dto({
            organization: [
              { institution_types_id: 12, how_many: 10, new_users: bad },
            ],
          }),
        ),
      ).toThrow(expect.objectContaining({ status: 400 }));
    }
  });
});

describe('InnovationUseService - new_users persisted and read (IU26-R-11)', () => {
  it('writes new_users only when the row carries the key (an omitting caller never wipes it)', () => {
    const service = makeService();
    const withKey = service.buildActorData(
      { actor_type_id: 3, new_users: 40 },
      USER.id,
      RESULT_ID,
      1,
    );
    const withoutKey = service.buildActorData(
      { actor_type_id: 3 },
      USER.id,
      RESULT_ID,
      1,
    );
    expect(withKey.new_users).toBe(40);
    expect('new_users' in withoutKey).toBe(false);
    expect(
      service.buildInstitutionData(
        { institution_types_id: 1, new_users: 3 },
        USER.id,
        RESULT_ID,
        1,
      ).new_users,
    ).toBe(3);
    expect(
      'new_users' in
        service.buildMeasureData({ quantity: 2 }, USER.id, RESULT_ID, 1),
    ).toBe(false);
    expect(
      service.buildMeasureData(
        { quantity: 2, new_users: null },
        USER.id,
        RESULT_ID,
        1,
      ).new_users,
    ).toBeNull();
  });

  it('the read returns new_users on actors, organizations and measures', async () => {
    const service = makeService();
    service._resultActorRepository = {
      find: jest.fn().mockResolvedValue([
        {
          sex_and_age_disaggregation: true,
          how_many: 120,
          new_users: 30,
        },
      ]),
    };
    service._resultByIntitutionsTypeRepository = {
      find: jest.fn().mockResolvedValue([{ how_many: 9, new_users: 4 }]),
    };
    service._resultIpMeasureRepository = {
      find: jest.fn().mockResolvedValue([{ quantity: 2, new_users: 1 }]),
    };
    expect((await service.getActorsData(RESULT_ID))[0].new_users).toBe(30);
    expect((await service.getOrganizationsData(RESULT_ID))[0].new_users).toBe(
      4,
    );
    expect((await service.getMeasuresData(RESULT_ID))[0].new_users).toBe(1);
  });
});
