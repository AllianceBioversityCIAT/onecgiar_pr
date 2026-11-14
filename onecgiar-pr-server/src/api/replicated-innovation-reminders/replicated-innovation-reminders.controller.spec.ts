// @akili-spec changes/replicated-innovation-reminders
import { ValidRoleGuard } from '../../shared/guards/valid-role.guard';
import { RoleEnum, RoleTypeEnum } from '../../shared/constants/role-type.enum';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ReplicatedInnovationRemindersController } from './replicated-innovation-reminders.controller';

/**
 * `RIR-T-5` / `RIR-R-10` — the authorization wiring, proven by reflection on EVERY route handler.
 * Not proven here: that the guard returns 403 at runtime (T-8's live check).
 */
const proto = ReplicatedInnovationRemindersController.prototype;
const routeHandlers = Object.getOwnPropertyNames(proto).filter(
  (name) =>
    name !== 'constructor' &&
    Reflect.getMetadata('path', proto[name as keyof typeof proto]) !==
      undefined,
);

describe('ReplicatedInnovationRemindersController authorization', () => {
  it('exposes the six endpoints of design section 4 plus the four focal-point endpoints of RCF section 6', () => {
    expect([...routeHandlers].sort()).toEqual(
      [
        'cancel',
        'create',
        'list',
        'preview',
        'send',
        'update',
        'listCenterFocalPoints',
        'createCenterFocalPoint',
        'updateCenterFocalPoint',
        'updateCenterRouting',
      ].sort(),
    );
  });

  it('has no DELETE route (RCF-R-7: contacts are never hard-deleted)', () => {
    const DELETE = 3; // RequestMethod.DELETE
    const methods = routeHandlers.map((name) =>
      Reflect.getMetadata('method', proto[name as keyof typeof proto]),
    );
    expect(methods).not.toContain(DELETE);
  });

  it('maps the focal-point handlers to the design section 6 paths', () => {
    const route = (name: string) => [
      Reflect.getMetadata('path', (proto as any)[name]),
      Reflect.getMetadata('method', (proto as any)[name]),
    ];
    // RequestMethod: GET 0, POST 1, PATCH 4
    expect(route('listCenterFocalPoints')).toEqual(['center-focal-points', 0]);
    expect(route('createCenterFocalPoint')).toEqual(['center-focal-points', 1]);
    expect(route('updateCenterFocalPoint')).toEqual([
      'center-focal-points/:id',
      4,
    ]);
    expect(route('updateCenterRouting')).toEqual([
      'center-focal-points/centers/:code/routing',
      4,
    ]);
  });

  it.each(routeHandlers)(
    '%s carries @Roles(ADMIN, APPLICATION) and ValidRoleGuard',
    (name) => {
      const handler = proto[name as keyof typeof proto];
      expect(Reflect.getMetadata('role', handler)).toEqual({
        roles: RoleEnum.ADMIN,
        type: RoleTypeEnum.APPLICATION,
      });
      expect(Reflect.getMetadata('__guards__', handler)).toContain(
        ValidRoleGuard,
      );
    },
  );

  it('the controller is wrapped by the ResponseInterceptor', () => {
    expect(
      Reflect.getMetadata(
        '__interceptors__',
        ReplicatedInnovationRemindersController,
      ),
    ).toContain(ResponseInterceptor);
  });

  it('id params go through ParseIntPipe', () => {
    for (const name of [
      'update',
      'cancel',
      'preview',
      'send',
      'updateCenterFocalPoint',
    ]) {
      const args = Reflect.getMetadata(
        '__routeArguments__',
        ReplicatedInnovationRemindersController,
        name,
      );
      const idArg = Object.values<any>(args).find((a) => a.data === 'id');
      expect(
        idArg?.pipes?.map((p: any) => p.name ?? p.constructor?.name),
      ).toEqual(expect.arrayContaining(['ParseIntPipe']));
    }
  });

  it('wraps a service result in the interceptor envelope', async () => {
    const service: any = { send: jest.fn().mockResolvedValue({ sent: 1 }) };
    const controller = new ReplicatedInnovationRemindersController(
      service,
      {} as any,
    );
    await expect(controller.send(3)).resolves.toEqual({
      response: { sent: 1 },
      message: 'Campaign dispatched',
      statusCode: 200,
    });
  });

  it('wraps the focal-point results in the envelope and passes the user id', async () => {
    const focal: any = {
      list: jest.fn().mockResolvedValue([{ code: 'CENTER-10' }]),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      setRouting: jest.fn().mockResolvedValue({ warning: null }),
    };
    const controller = new ReplicatedInnovationRemindersController(
      {} as any,
      focal,
    );
    const user: any = { id: 7 };
    await expect(controller.listCenterFocalPoints()).resolves.toMatchObject({
      statusCode: 200,
      response: [{ code: 'CENTER-10' }],
    });
    await expect(
      controller.createCenterFocalPoint(
        { center_code: 'C', email: 'a@b.co' },
        user,
      ),
    ).resolves.toMatchObject({ statusCode: 201, response: { id: 1 } });
    expect(focal.create).toHaveBeenCalledWith(
      { center_code: 'C', email: 'a@b.co' },
      7,
    );
    await controller.updateCenterFocalPoint(1, { is_active: false }, user);
    expect(focal.update).toHaveBeenCalledWith(1, { is_active: false }, 7);
    await controller.updateCenterRouting(
      'C',
      { route_all_to_center: true },
      user,
    );
    expect(focal.setRouting).toHaveBeenCalledWith(
      'C',
      { route_all_to_center: true },
      7,
    );
  });
});
