// @akili-spec changes/rir-center-focal-routing
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpException } from '@nestjs/common';
import { CenterFocalPointsService } from './center-focal-points.service';
import { UpdateCenterRoutingDto } from './dto/update-center-routing.dto';
import {
  CreateCenterFocalPointDto,
  UpdateCenterFocalPointDto,
} from './dto/upsert-center-focal-point.dto';

const status = async (promise: Promise<unknown>): Promise<number> => {
  try {
    await promise;
    return 200;
  } catch (e) {
    return (e as HttpException).getStatus();
  }
};

function build(
  opts: {
    centers?: any[];
    contacts?: any[];
    routings?: any[];
    saveError?: unknown;
  } = {},
) {
  const centers = opts.centers ?? [
    {
      code: 'CENTER-10',
      isActive: true,
      clarisa_institution: { acronym: 'ICARDA', name: 'International Center' },
    },
  ];
  let contacts = [...(opts.contacts ?? [])];
  const contactRepo: any = {
    create: jest.fn((x) => ({ ...x })),
    find: jest.fn(async ({ where } = {}) =>
      where
        ? contacts.filter(
            (c) =>
              c.center_code === where.center_code && c.email === where.email,
          )
        : contacts,
    ),
    findOne: jest.fn(async ({ where }) =>
      contacts.find((c) => Number(c.id) === where.id),
    ),
    count: jest.fn(
      async ({ where }) =>
        contacts.filter(
          (c) => c.center_code === where.center_code && c.is_active,
        ).length,
    ),
    save: jest.fn(async (row) => {
      if (opts.saveError) throw opts.saveError;
      if (!row.id) row.id = '99';
      contacts = [...contacts.filter((c) => c.id !== row.id), row];
      return row;
    }),
  };
  const routings = [...(opts.routings ?? [])];
  const routingRepo: any = {
    create: jest.fn((x) => ({ ...x })),
    find: jest.fn(async () => routings),
    findOne: jest.fn(async ({ where }) =>
      routings.find((r) => r.center_code === where.center_code),
    ),
    save: jest.fn(async (row) => {
      if (!routings.includes(row)) routings.push(row);
      return row;
    }),
  };
  const centerRepo: any = {
    find: jest.fn(async () => centers),
    findOne: jest.fn(async ({ where }) =>
      centers.find((c) => c.code === where.code),
    ),
  };
  const service = new CenterFocalPointsService(
    contactRepo,
    routingRepo,
    centerRepo,
  );
  return { service, contactRepo, routingRepo, centerRepo, routings };
}

const row = (over: any = {}) => ({
  id: '5',
  center_code: 'CENTER-10',
  name: 'Enrico',
  email: 'enrico@cgiar.org',
  is_active: true,
  ...over,
});

describe('CenterFocalPointsService', () => {
  describe('list (RCF-R-7, RCF-R-8)', () => {
    it('includes Centers with no config and no contacts; inactive Centers only when configured', async () => {
      const { service } = build({
        centers: [
          {
            code: 'B',
            isActive: true,
            clarisa_institution: { acronym: 'IITA', name: 'IITA' },
          },
          {
            code: 'A',
            isActive: true,
            clarisa_institution: { acronym: 'ICARDA', name: 'ICARDA' },
          },
          {
            code: 'X',
            isActive: false,
            clarisa_institution: { acronym: 'OLD', name: 'Old' },
          },
          {
            code: 'Y',
            isActive: false,
            clarisa_institution: { acronym: 'OLD2', name: 'Old2' },
          },
        ],
        contacts: [
          row({ center_code: 'A' }),
          row({ id: '6', center_code: 'Y', is_active: false }),
        ],
        routings: [{ center_code: 'A', route_all_to_center: 1 }],
      });
      const result = await service.list();
      expect(result).toEqual([
        {
          code: 'A',
          acronym: 'ICARDA',
          name: 'ICARDA',
          route_all_to_center: true,
          contacts: [
            {
              id: 5,
              name: 'Enrico',
              email: 'enrico@cgiar.org',
              is_active: true,
            },
          ],
        },
        {
          code: 'B',
          acronym: 'IITA',
          name: 'IITA',
          route_all_to_center: false,
          contacts: [],
        },
        {
          code: 'Y',
          acronym: 'OLD2',
          name: 'Old2',
          route_all_to_center: false,
          contacts: [
            {
              id: 6,
              name: 'Enrico',
              email: 'enrico@cgiar.org',
              is_active: false,
            },
          ],
        },
      ]);
    });
  });

  describe('create (RCF-R-7)', () => {
    it('creates an active contact and stamps the audit columns', async () => {
      const { service, contactRepo } = build();
      const view = await service.create(
        { center_code: 'CENTER-10', name: 'Joren', email: 'joren@cgiar.org' },
        42,
      );
      expect(view).toEqual({
        id: 99,
        name: 'Joren',
        email: 'joren@cgiar.org',
        is_active: true,
      });
      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 42,
          last_updated_by: 42,
          is_active: true,
        }),
      );
    });

    it('rejects an unknown Center with 400 and saves nothing', async () => {
      const { service, contactRepo } = build();
      expect(
        await status(service.create({ center_code: 'NOPE', email: 'a@b.co' })),
      ).toBe(400);
      expect(contactRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate (center, email) with 409 and does not create a second row', async () => {
      const { service, contactRepo } = build({ contacts: [row()] });
      expect(
        await status(
          service.create({
            center_code: 'CENTER-10',
            email: 'enrico@cgiar.org',
          }),
        ),
      ).toBe(409);
      expect(contactRepo.save).not.toHaveBeenCalled();
    });

    it('maps the unique-index error (race past the check) to 409', async () => {
      const { service } = build({
        saveError: {
          errno: 1062,
          message: 'Duplicate entry for key UQ_rir_center_mel_center_email',
        },
      });
      expect(
        await status(
          service.create({ center_code: 'CENTER-10', email: 'new@cgiar.org' }),
        ),
      ).toBe(409);
    });

    it('rethrows an unrelated save error untouched', async () => {
      const boom = new Error('connection lost');
      const { service } = build({ saveError: boom });
      await expect(
        service.create({ center_code: 'CENTER-10', email: 'new@cgiar.org' }),
      ).rejects.toBe(boom);
    });
  });

  describe('update (RCF-R-7)', () => {
    it('deactivates and reactivates without deleting', async () => {
      const { service, contactRepo } = build({ contacts: [row()] });
      expect((await service.update(5, { is_active: false }, 3)).is_active).toBe(
        false,
      );
      expect((await service.update(5, { is_active: true }, 3)).is_active).toBe(
        true,
      );
      expect(contactRepo.save).toHaveBeenCalledTimes(2);
      expect(contactRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ last_updated_by: 3 }),
      );
    });

    it('404 for an unknown id', async () => {
      const { service } = build();
      expect(await status(service.update(1, { name: 'x' }))).toBe(404);
    });

    it('409 when the new email already belongs to another contact of the Center', async () => {
      const { service } = build({
        contacts: [row(), row({ id: '6', email: 'other@cgiar.org' })],
      });
      expect(
        await status(service.update(6, { email: 'enrico@cgiar.org' })),
      ).toBe(409);
    });

    it('does not flag the row as a duplicate of itself when the email is unchanged', async () => {
      const { service } = build({ contacts: [row()] });
      const view = await service.update(5, {
        email: 'enrico@cgiar.org',
        name: 'E.',
      });
      expect(view.name).toBe('E.');
    });
  });

  describe('setRouting (RCF-R-8)', () => {
    it('warns when turned on with 0 active contacts', async () => {
      const { service, routings } = build({
        contacts: [row({ is_active: false })],
      });
      const result = await service.setRouting(
        'CENTER-10',
        { route_all_to_center: true },
        9,
      );
      expect(result.warning).toEqual(
        expect.stringContaining('no active focal point'),
      );
      expect(result).toMatchObject({
        route_all_to_center: true,
        active_contacts: 0,
      });
      expect(routings[0]).toMatchObject({
        center_code: 'CENTER-10',
        route_all_to_center: 1,
        created_by: 9,
      });
    });

    it('no warning with an active contact, and none when turned off', async () => {
      const { service } = build({ contacts: [row()] });
      expect(
        (await service.setRouting('CENTER-10', { route_all_to_center: true }))
          .warning,
      ).toBeNull();
      expect(
        (await service.setRouting('CENTER-10', { route_all_to_center: false }))
          .warning,
      ).toBeNull();
    });

    it('upserts: a second call updates the same row', async () => {
      const { service, routings } = build();
      await service.setRouting('CENTER-10', { route_all_to_center: true }, 1);
      await service.setRouting('CENTER-10', { route_all_to_center: false }, 2);
      expect(routings).toHaveLength(1);
      expect(routings[0]).toMatchObject({
        route_all_to_center: 0,
        last_updated_by: 2,
      });
    });

    it('400 for an unknown Center', async () => {
      const { service } = build();
      expect(
        await status(service.setRouting('NOPE', { route_all_to_center: true })),
      ).toBe(400);
    });
  });
});

describe('Center focal point DTOs', () => {
  it('trims and lower-cases the email, trims the name, blank name becomes null', async () => {
    const dto = plainToInstance(CreateCenterFocalPointDto, {
      center_code: ' CENTER-10 ',
      name: '   ',
      email: '  Joren.Verbist@CGIAR.org ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      center_code: 'CENTER-10',
      name: null,
      email: 'joren.verbist@cgiar.org',
    });
  });

  it.each(['', '   ', 'not-an-email', 'a@'])(
    'rejects the email %p',
    async (email) => {
      const dto = plainToInstance(CreateCenterFocalPointDto, {
        center_code: 'C',
        email,
      });
      expect((await validate(dto)).some((e) => e.property === 'email')).toBe(
        true,
      );
    },
  );

  it('PATCH body: every field optional, bad email and non-boolean flag rejected', async () => {
    expect(
      await validate(plainToInstance(UpdateCenterFocalPointDto, {})),
    ).toHaveLength(0);
    const bad = await validate(
      plainToInstance(UpdateCenterFocalPointDto, {
        email: 'x',
        is_active: 'yes',
      }),
    );
    expect(bad.map((e) => e.property).sort()).toEqual(['email', 'is_active']);
  });

  it('routing body requires a boolean', async () => {
    expect(
      await validate(
        plainToInstance(UpdateCenterRoutingDto, { route_all_to_center: true }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateCenterRoutingDto, { route_all_to_center: 1 }),
      ),
    ).not.toHaveLength(0);
  });
});
