import { ExecutionContext, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AdminPanelRepository } from './admin-panel.repository';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelModule } from './admin-panel.module';
import { ValidRoleGuard } from '../../../shared/guards/valid-role.guard';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import {
  RoleEnum,
  RoleTypeEnum,
} from '../../../shared/constants/role-type.enum';

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('AdminPanelRepository.userLastLoginReport (ULR-T-1)', () => {
  let query: jest.Mock;
  let handlersError: { returnErrorRepository: jest.Mock };
  let repository: AdminPanelRepository;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    handlersError = {
      returnErrorRepository: jest.fn().mockReturnValue(new Error('handled')),
    };
    repository = new AdminPanelRepository(
      { query } as any,
      handlersError as any,
    );
  });

  const getSql = async () => {
    await repository.userLastLoginReport();
    expect(query).toHaveBeenCalledTimes(1);
    return normalize(query.mock.calls[0][0]);
  };

  it('returns the rows from a single query', async () => {
    const rows = [{ id: 1 }];
    query.mockResolvedValue(rows);
    await expect(repository.userLastLoginReport()).resolves.toBe(rows);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('filters active users only (ULR-R-1)', async () => {
    const sql = await getSql();
    expect(sql).toMatch(/from `?users`?/i);
    expect(sql).toMatch(/where u\.active\s*(=\s*1|>\s*0)/i);
  });

  it('contains no JOIN (ULR-R-12)', async () => {
    expect(await getSql()).not.toMatch(/\bjoin\b/i);
  });

  it('selects exactly the eight columns and nothing else (ULR-R-5)', async () => {
    const sql = await getSql();
    const select = sql.match(/select (.*) from/i)[1];
    expect(select).toMatch(/u\.id\b/);
    expect(select).toMatch(/u\.first_name\b/);
    expect(select).toMatch(/u\.last_name\b/);
    expect(select).toMatch(/u\.email\b/);
    expect(select).toMatch(/u\.is_cgiar\b/);
    expect(select).toMatch(/u\.active\b/);
    expect(select).toMatch(/as last_login\b/i);
    expect(select).toMatch(/as days_since_last_login\b/i);
    expect(select).not.toMatch(/password|created_date|\*/i);
    // count top-level select items (commas at parenthesis depth 0)
    let depth = 0;
    let items = 1;
    for (const ch of select) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) items++;
    }
    expect(items).toBe(8);
  });

  it('formats last_login as text and computes calendar-day diff in SQL (ULR-R-3, ULR-R-9)', async () => {
    const sql = await getSql();
    expect(sql).toContain("DATE_FORMAT(u.last_login, '%Y-%m-%d %H:%i:%s')");
    expect(sql).toContain('DATEDIFF(CURDATE(), DATE(u.last_login))');
  });

  it('orders never-logged-in last, newest first, then id ascending (ULR-R-2)', async () => {
    const sql = await getSql();
    expect(sql).toMatch(
      /order by u\.last_login IS NULL( ASC)?, u\.last_login DESC, u\.id ASC/i,
    );
  });

  it('turns a query failure into the repository handled error', async () => {
    query.mockRejectedValue(new Error('db down'));
    await expect(repository.userLastLoginReport()).rejects.toThrow('handled');
    expect(handlersError.returnErrorRepository).toHaveBeenCalledWith(
      expect.objectContaining({ className: AdminPanelRepository.name }),
    );
  });
});

describe('AdminPanelService.userLastLoginReport (ULR-T-1)', () => {
  let repo: { userLastLoginReport: jest.Mock };
  let handlersError: { returnErrorRes: jest.Mock };
  let service: AdminPanelService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    repo = { userLastLoginReport: jest.fn() };
    handlersError = {
      returnErrorRes: jest
        .fn()
        .mockReturnValue({ response: {}, message: 'err', status: 500 }),
    };
    service = new AdminPanelService(
      handlersError as any,
      repo as any,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('wraps rows in the standard response shape', async () => {
    const rows = [
      { id: 7, email: 'secret.person@example.org', first_name: 'Secret' },
    ];
    repo.userLastLoginReport.mockResolvedValue(rows);
    await expect(service.userLastLoginReport()).resolves.toEqual({
      response: rows,
      message: 'Successful response',
      status: HttpStatus.OK,
    });
  });

  it('logs only the row count, never row values (ULR-R-14)', async () => {
    repo.userLastLoginReport.mockResolvedValue([
      { id: 7, email: 'secret.person@example.org', first_name: 'Secret' },
      { id: 8, email: 'other@example.org', first_name: 'Other' },
    ]);
    await service.userLastLoginReport();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).toContain('2');
    expect(logged).not.toMatch(/secret|other@|example\.org|Secret|Other/);
  });

  it('returns the handled error result when the repository fails', async () => {
    const error = new Error('boom');
    repo.userLastLoginReport.mockRejectedValue(error);
    const result = await service.userLastLoginReport();
    expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
      error,
      debug: true,
    });
    expect(result).toEqual({ response: {}, message: 'err', status: 500 });
  });
});

describe('AdminPanelController GET report/users/last-login wiring (ULR-T-2)', () => {
  const handler = AdminPanelController.prototype.userLastLoginReport;

  it('is registered as GET report/users/last-login', () => {
    expect(handler).toBeDefined();
    // 'path' and 'method' metadata: method 0 = GET
    expect(Reflect.getMetadata('path', handler)).toBe(
      'report/users/last-login',
    );
    expect(Reflect.getMetadata('method', handler)).toBe(0);
  });

  it('carries ValidRoleGuard metadata (ULR-AC-5/6 wiring)', () => {
    const guards = Reflect.getMetadata('__guards__', handler) ?? [];
    expect(guards).toContain(ValidRoleGuard);
  });

  it('carries Roles metadata ADMIN / APPLICATION (ULR-R-4)', () => {
    expect(Reflect.getMetadata('role', handler)).toEqual({
      roles: RoleEnum.ADMIN,
      type: RoleTypeEnum.APPLICATION,
    });
  });

  it('delegates to AdminPanelService.userLastLoginReport', async () => {
    const result = { response: [], message: 'ok', status: 200 };
    const service = {
      userLastLoginReport: jest.fn().mockResolvedValue(result),
    };
    const controller = new AdminPanelController(service as any);
    await expect(controller.userLastLoginReport()).resolves.toBe(result);
    expect(service.userLastLoginReport).toHaveBeenCalledTimes(1);
  });

  describe('real ValidRoleGuard with mocked RoleByUserRepository', () => {
    const ctxWithToken = (userId: number): ExecutionContext => {
      const payload = Buffer.from(JSON.stringify({ id: userId })).toString(
        'base64',
      );
      return {
        getHandler: () => handler,
        switchToHttp: () => ({
          getRequest: () => ({ headers: { auth: `h.${payload}.s` } }),
        }),
      } as unknown as ExecutionContext;
    };
    const guardWith = (isValidRole: jest.Mock) =>
      new ValidRoleGuard(
        { $_isValidRole: isValidRole } as unknown as RoleByUserRepository,
        new Reflector(),
      );

    it('denies a user with no application role', async () => {
      const isValidRole = jest.fn().mockResolvedValue(undefined);
      await expect(
        guardWith(isValidRole).canActivate(ctxWithToken(5)),
      ).resolves.toBe(false);
      expect(isValidRole).toHaveBeenCalledWith(5, RoleTypeEnum.APPLICATION);
    });

    it('denies a non-admin application role (GUEST)', async () => {
      const isValidRole = jest.fn().mockResolvedValue(RoleEnum.GUEST);
      await expect(
        guardWith(isValidRole).canActivate(ctxWithToken(5)),
      ).resolves.toBe(false);
    });

    it('allows an admin application role', async () => {
      const isValidRole = jest.fn().mockResolvedValue(RoleEnum.ADMIN);
      await expect(
        guardWith(isValidRole).canActivate(ctxWithToken(1)),
      ).resolves.toBe(true);
    });
  });

  it('Nest testing module resolves AdminPanelController with RoleByUserRepository provided (DI)', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminPanelController],
      providers: [
        { provide: AdminPanelService, useValue: {} },
        { provide: RoleByUserRepository, useValue: {} },
      ],
    }).compile();
    expect(moduleRef.get(AdminPanelController)).toBeInstanceOf(
      AdminPanelController,
    );
  });

  it('AdminPanelModule declares RoleByUserRepository as a provider', () => {
    const providers = Reflect.getMetadata('providers', AdminPanelModule);
    expect(providers).toContain(RoleByUserRepository);
  });
});
