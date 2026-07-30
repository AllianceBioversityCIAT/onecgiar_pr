import { Test, TestingModule } from '@nestjs/testing';
import { IsNull } from 'typeorm';
import { RoleByUserRepository } from '../../../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ContributorsRoleResolverService } from './contributors-role-resolver.service';

describe('ContributorsRoleResolverService', () => {
  let service: ContributorsRoleResolverService;

  const mockRoleByUserRepository = {
    find: jest.fn(),
  };
  const mockResultRepository = {
    getUserRolesForResults: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorsRoleResolverService,
        {
          provide: RoleByUserRepository,
          useValue: mockRoleByUserRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
      ],
    }).compile();

    service = module.get(ContributorsRoleResolverService);
  });

  it('should resolve result-specific roles and general application role', async () => {
    mockRoleByUserRepository.find.mockResolvedValueOnce([
      { role: 3 },
      { role: 1 },
    ]);
    mockResultRepository.getUserRolesForResults.mockResolvedValueOnce([
      { result_id: '101', role_id: 4, role_name: 'Lead' },
      { result_id: 'invalid', role_id: 2, role_name: 'Ignored' },
    ]);

    const { rolesByResult, userGeneralRole } = await service.resolve(
      user,
      [101, 102],
    );

    expect(mockRoleByUserRepository.find).toHaveBeenCalledWith({
      where: {
        user: user.id,
        active: true,
        initiative_id: IsNull(),
        action_area_id: IsNull(),
      },
      select: ['role'],
    });
    expect(mockResultRepository.getUserRolesForResults).toHaveBeenCalledWith(
      user.id,
      [101, 102],
    );
    expect(userGeneralRole).toBe(1);
    expect(rolesByResult.get(101)).toEqual({
      role_id: 4,
      role_name: 'Lead',
    });
    expect(rolesByResult.has(Number.NaN)).toBe(false);
  });

  it('should return null general role when user has no admin/application roles', async () => {
    mockRoleByUserRepository.find.mockResolvedValueOnce([{ role: 5 }]);
    mockResultRepository.getUserRolesForResults.mockResolvedValueOnce([]);

    const { rolesByResult, userGeneralRole } = await service.resolve(user, [
      201,
    ]);

    expect(userGeneralRole).toBeNull();
    expect(rolesByResult.size).toBe(0);
  });

  it('should skip role lookups when user id is invalid', async () => {
    const { rolesByResult, userGeneralRole } = await service.resolve(
      { id: Number.NaN } as TokenDto,
      [101],
    );

    expect(mockRoleByUserRepository.find).not.toHaveBeenCalled();
    expect(mockResultRepository.getUserRolesForResults).not.toHaveBeenCalled();
    expect(userGeneralRole).toBeNull();
    expect(rolesByResult.size).toBe(0);
  });

  it('should skip result role lookup when no result ids are provided', async () => {
    mockRoleByUserRepository.find.mockResolvedValueOnce([{ role: 2 }]);

    const { userGeneralRole } = await service.resolve(user, []);

    expect(mockResultRepository.getUserRolesForResults).not.toHaveBeenCalled();
    expect(userGeneralRole).toBe(2);
  });
});
