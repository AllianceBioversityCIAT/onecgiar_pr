import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApplicationAdminGuard } from './application-admin.guard';

describe('ApplicationAdminGuard', () => {
  const ctx = (user?: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  it('refuses with 401 when no verified session is attached', async () => {
    const repo = { isUserAdmin: jest.fn() } as any;
    const guard = new ApplicationAdminGuard(repo);
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repo.isUserAdmin).not.toHaveBeenCalled();
  });

  it('refuses with 403 for a logged non-admin', async () => {
    const repo = { isUserAdmin: jest.fn().mockResolvedValue(false) } as any;
    const guard = new ApplicationAdminGuard(repo);
    await expect(guard.canActivate(ctx({ id: 7 }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.isUserAdmin).toHaveBeenCalledWith(7);
  });

  it('refuses with 403 when the user has no platform role row (null)', async () => {
    const repo = { isUserAdmin: jest.fn().mockResolvedValue(null) } as any;
    const guard = new ApplicationAdminGuard(repo);
    await expect(guard.canActivate(ctx({ id: 7 }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets an application admin through', async () => {
    const repo = { isUserAdmin: jest.fn().mockResolvedValue(true) } as any;
    const guard = new ApplicationAdminGuard(repo);
    await expect(guard.canActivate(ctx({ id: 1 }))).resolves.toBe(true);
  });
});
