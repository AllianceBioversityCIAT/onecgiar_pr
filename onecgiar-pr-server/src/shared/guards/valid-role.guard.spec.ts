import { Reflector } from '@nestjs/core';
import { ValidRoleGuard } from './valid-role.guard';
import { RoleEnum, RoleTypeEnum } from '../constants/role-type.enum';

describe('ValidRoleGuard', () => {
  const makeAuthHeader = (payload: Record<string, any>) => {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `x.${b64}.y`;
  };

  const makeContext = (authHeader: string) =>
    ({
      getHandler: () => function handler() { },
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { auth: authHeader },
        }),
      }),
    }) as any;

  it('debe retornar true cuando el rol es válido y cumple role <= requerido', async () => {
    const repo = { $_isValidRole: jest.fn().mockResolvedValue(RoleEnum.ADMIN) } as any;
    const reflector: Partial<Reflector> = {
      get: jest.fn().mockReturnValue({
        roles: RoleEnum.GUEST,
        type: RoleTypeEnum.APPLICATION,
      }),
    };

    const guard = new ValidRoleGuard(repo, reflector as Reflector);
    const tokenId = 123;
    const ctx = makeContext(makeAuthHeader({ id: tokenId }));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(repo.$_isValidRole).toHaveBeenCalledWith(tokenId, RoleTypeEnum.APPLICATION);
  });

  it('debe retornar false cuando el rol no cumple el requerido', async () => {
    const repo = { $_isValidRole: jest.fn().mockResolvedValue(RoleEnum.MEMBER) } as any;
    const reflector: Partial<Reflector> = {
      get: jest.fn().mockReturnValue({
        roles: RoleEnum.GUEST,
        type: RoleTypeEnum.APPLICATION,
      }),
    };

    const guard = new ValidRoleGuard(repo, reflector as Reflector);
    const ctx = makeContext(makeAuthHeader({ id: 999 }));

    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });
});

