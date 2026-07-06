import { Test, TestingModule } from '@nestjs/testing';
import { RoleByUserService } from './role-by-user.service';
import { RoleByUserRepository } from './RoleByUser.repository';
import { RoleLevelsService } from '../role-levels/role-levels.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { UserRepository } from '../user/repositories/user.repository';
import { HttpStatus } from '@nestjs/common';

describe('RoleByUserService', () => {
  let service: RoleByUserService;
  let roleByUserRepository: RoleByUserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleByUserService,
        {
          provide: RoleByUserRepository,
          useValue: {
            getAllRolesByUser: jest.fn(),
            getSpecificRole: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RoleLevelsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({
              response: [{ id: 1, name: 'Center' }],
              message: 'ok',
              status: HttpStatus.OK,
            }),
          },
        },
        {
          provide: HandlersError,
          useValue: {
            returnErrorRes: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoleByUserService>(RoleByUserService);
    roleByUserRepository =
      module.get<RoleByUserRepository>(RoleByUserRepository);
  });

  describe('allRolesByUser', () => {
    it('should include center roles in response', async () => {
      (roleByUserRepository.getAllRolesByUser as jest.Mock).mockResolvedValue([
        {
          role_id: 2,
          role_level_id: 1,
          role_level_name: 'Application',
          description: 'Guest',
          initiative_id: null,
          action_area_id: null,
          center_id: null,
        },
        {
          role_id: 9,
          role_level_id: 4,
          role_level_name: 'Center',
          description: 'Center User',
          initiative_id: null,
          action_area_id: null,
          center_id: 'CIMMYT',
          center_name: 'CIMMYT Center',
          center_acronym: 'CIMMYT',
        },
      ]);

      const result = await service.allRolesByUser(1);

      expect(result.status).toBe(HttpStatus.OK);
      expect((result as any).response.center).toEqual([
        {
          center_id: 'CIMMYT',
          center_name: 'CIMMYT Center',
          center_acronym: 'CIMMYT',
          role_id: 9,
          role_name: 'Center User',
        },
      ]);
    });
  });
});
