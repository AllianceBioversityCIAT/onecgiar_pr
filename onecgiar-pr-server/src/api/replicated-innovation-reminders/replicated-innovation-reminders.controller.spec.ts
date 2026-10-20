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
  it('exposes the six endpoints of design section 4', () => {
    expect(routeHandlers.sort()).toEqual(
      ['cancel', 'create', 'list', 'preview', 'send', 'update'].sort(),
    );
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
    for (const name of ['update', 'cancel', 'preview', 'send']) {
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
    const controller = new ReplicatedInnovationRemindersController(service);
    await expect(controller.send(3)).resolves.toEqual({
      response: { sent: 1 },
      message: 'Campaign dispatched',
      statusCode: 200,
    });
  });
});
