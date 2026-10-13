import {
  MiddlewareConsumer,
  Module,
  NestModule,
  INestApplication,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtMiddleware } from '../Middlewares/jwt.middleware';
import { RoleByUserController } from './role-by-user/role-by-user.controller';
import { RoleByUserModule } from './role-by-user/role-by-user.module';
import { RoleByUserService } from './role-by-user/role-by-user.service';
import { RoleByUserRepository } from './role-by-user/RoleByUser.repository';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { UserRepository } from './user/repositories/user.repository';

const SECRET = 'unit-test-secret';
const ADMIN_ID = 1;
const USER_ID = 2;

const roleByUserRepository = {
  isUserAdmin: jest.fn(async (id: number) => id === ADMIN_ID),
};
const roleByUserService = {
  create: jest.fn().mockResolvedValue({ response: {}, status: 201 }),
  allRolesByUser: jest.fn().mockResolvedValue({ response: {}, status: 200 }),
};
const userService = {
  createFull: jest.fn().mockResolvedValue({ response: {}, status: 201 }),
  updateUserStatus: jest.fn().mockResolvedValue({ response: {}, status: 200 }),
  updateUserRoles: jest.fn().mockResolvedValue({ response: {}, status: 200 }),
};
const userRepository = { updateLastLogin: jest.fn().mockResolvedValue(null) };

// Test modules reuse the REAL `configure()` of the production modules, so the
// JwtMiddleware route list under test is the one that ships.
@Module({
  controllers: [RoleByUserController],
  providers: [
    JwtMiddleware,
    JwtService,
    { provide: RoleByUserService, useValue: roleByUserService },
    { provide: RoleByUserRepository, useValue: roleByUserRepository },
    { provide: UserRepository, useValue: userRepository },
  ],
})
class RoleByUserTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    RoleByUserModule.prototype.configure.call(this, consumer);
  }
}

@Module({
  controllers: [UserController],
  providers: [
    JwtMiddleware,
    JwtService,
    { provide: UserService, useValue: userService },
    { provide: RoleByUserRepository, useValue: roleByUserRepository },
    { provide: UserRepository, useValue: userRepository },
  ],
})
class UserTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    UserModule.prototype.configure.call(this, consumer);
  }
}

describe('auth write routes require a verified admin session', () => {
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
          { path: 'auth/role-by-user', module: RoleByUserTestModule },
          { path: 'auth/user', module: UserTestModule },
        ]),
        RoleByUserTestModule,
        UserTestModule,
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
    adminToken = await sign(ADMIN_ID);
    userToken = await sign(USER_ID);
  });

  afterAll(async () => {
    process.env.JWT_SKEY = previousSecret;
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // POST /auth/user/create validates its body (400 before the handler on a bad one).
  const validCreateUser = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    is_cgiar: false,
    role_assignments: [{ role_id: 2, entity_id: 5 }],
  };

  const writes: Array<[string, 'post' | 'patch', string, jest.Mock]> = [
    [
      'POST /auth/role-by-user',
      'post',
      '/auth/role-by-user',
      roleByUserService.create as any,
    ],
    [
      'POST /auth/user/create',
      'post',
      '/auth/user/create',
      userService.createFull as any,
    ],
    [
      'PATCH /auth/user/change/status',
      'patch',
      '/auth/user/change/status',
      userService.updateUserStatus as any,
    ],
    [
      'PATCH /auth/user/update/roles',
      'patch',
      '/auth/user/update/roles',
      userService.updateUserRoles as any,
    ],
  ];

  describe.each(writes)('%s', (_label, method, url, handler) => {
    it('no session -> 401 and nothing executed', async () => {
      await request(app.getHttpServer())[method](url).send({}).expect(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('unsigned/forged token -> 401 and nothing executed', async () => {
      const forged = `x.${Buffer.from(JSON.stringify({ id: ADMIN_ID, email: 'a@b.c' })).toString('base64')}.y`;
      await request(app.getHttpServer())
        [method](url)
        .set('auth', forged)
        .send({})
        .expect(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('logged non-admin -> 403 and nothing executed', async () => {
      await request(app.getHttpServer())
        [method](url)
        .set('auth', userToken)
        .send({})
        .expect(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('admin -> allowed', async () => {
      const res = await request(app.getHttpServer())
        [method](url)
        .set('auth', adminToken)
        .send(url.endsWith('/create') ? validCreateUser : {});
      expect(res.status).toBeLessThan(300);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /auth/role-by-user/get/user/:id', () => {
    it('no session -> 401 and no data read', async () => {
      await request(app.getHttpServer())
        .get('/auth/role-by-user/get/user/2')
        .expect(401);
      expect(roleByUserService.allRolesByUser).not.toHaveBeenCalled();
    });

    it('forged token -> 401', async () => {
      const forged = `x.${Buffer.from(JSON.stringify({ id: 2, email: 'a@b.c' })).toString('base64')}.y`;
      await request(app.getHttpServer())
        .get('/auth/role-by-user/get/user/2')
        .set('auth', forged)
        .expect(401);
    });

    it('any logged user (non-admin included) keeps reading roles', async () => {
      await request(app.getHttpServer())
        .get('/auth/role-by-user/get/user/2')
        .set('auth', userToken)
        .expect(200);
      expect(roleByUserService.allRolesByUser).toHaveBeenCalledTimes(1);
    });
  });
});
