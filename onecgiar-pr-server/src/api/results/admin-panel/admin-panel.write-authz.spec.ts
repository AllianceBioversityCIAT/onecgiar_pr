import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelService } from './admin-panel.service';

const SECRET = 'unit-test-secret';
const adminPanelService = {
  kpBulkSync: jest.fn().mockResolvedValue({ response: {}, status: 200 }),
  patchPhaseInitiativeReportingBulk: jest
    .fn()
    .mockResolvedValue({ response: {}, status: 200 }),
  patchPhaseInitiativeReporting: jest
    .fn()
    .mockResolvedValue({ response: {}, status: 200 }),
  getPhaseReportingInitiativesDetail: jest
    .fn()
    .mockResolvedValue({ response: {}, status: 200 }),
};
// 1 = application admin, 6 = plain member (min role per ValidRoleGuard)
const roleByUserRepository = {
  $_isValidRole: jest.fn(async (id: number) => (id === 1 ? 1 : 6)),
};

@Module({
  controllers: [AdminPanelController],
  providers: [
    JwtMiddleware,
    JwtService,
    { provide: AdminPanelService, useValue: adminPanelService },
    { provide: RoleByUserRepository, useValue: roleByUserRepository },
    {
      provide: UserRepository,
      useValue: { updateLastLogin: jest.fn().mockResolvedValue(null) },
    },
  ],
})
class AdminPanelTestModule implements NestModule {
  // Same coverage app.module.ts gives every `api/*` route.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('api/results/admin-panel');
  }
}

describe('admin-panel write routes are admin-only', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  const previousSecret = process.env.JWT_SKEY;

  beforeAll(async () => {
    process.env.JWT_SKEY = SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: SECRET }),
        RouterModule.register([
          { path: 'api/results/admin-panel', module: AdminPanelTestModule },
        ]),
        AdminPanelTestModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    const jwt = new JwtService({ secret: SECRET });
    const sign = (id: number) =>
      jwt.signAsync({
        id,
        email: `u${id}@x.org`,
        first_name: 'a',
        last_name: 'b',
      });
    adminToken = await sign(1);
    userToken = await sign(2);
  });

  afterAll(async () => {
    process.env.JWT_SKEY = previousSecret;
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const writes: Array<[string, string, jest.Mock]> = [
    [
      'PATCH bulk/kps',
      '/api/results/admin-panel/bulk/kps',
      adminPanelService.kpBulkSync as any,
    ],
    [
      'PATCH phases/:phaseId/reporting-initiatives/bulk',
      '/api/results/admin-panel/phases/3/reporting-initiatives/bulk',
      adminPanelService.patchPhaseInitiativeReportingBulk as any,
    ],
    [
      'PATCH phases/:phaseId/reporting-initiatives/:initiativeId',
      '/api/results/admin-panel/phases/3/reporting-initiatives/9',
      adminPanelService.patchPhaseInitiativeReporting as any,
    ],
  ];

  describe.each(writes)('%s', (_label, url, handler) => {
    it('no session -> 401', async () => {
      await request(app.getHttpServer()).patch(url).send({}).expect(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('logged non-admin -> 403', async () => {
      await request(app.getHttpServer())
        .patch(url)
        .set('auth', userToken)
        .send({})
        .expect(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('admin -> allowed', async () => {
      const res = await request(app.getHttpServer())
        .patch(url)
        .set('auth', adminToken)
        .send({ reporting_enabled: true });
      expect(res.status).toBeLessThan(300);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it('GET reporting-initiatives detail stays open to any logged user (unchanged)', async () => {
    await request(app.getHttpServer())
      .get('/api/results/admin-panel/phases/3/reporting-initiatives')
      .set('auth', userToken)
      .expect(200);
  });
});
