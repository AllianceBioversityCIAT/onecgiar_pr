import { Test, TestingModule } from '@nestjs/testing';
import { RoleByUserRepository } from './RoleByUser.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { DataSource } from 'typeorm';

describe('RoleByUserRepository', () => {
  let repository: RoleByUserRepository;

  const mockQuery = jest.fn();
  const mockDataSource = {
    createEntityManager: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleByUserRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HandlersError,
          useValue: {
            returnErrorRepository: jest.fn((config) => {
              throw config.error;
            }),
          },
        },
      ],
    }).compile();

    repository = module.get<RoleByUserRepository>(RoleByUserRepository);
    repository.query = mockQuery;
  });

  describe('validationCenterPermissions', () => {
    it('should return 1 when user has active Center User role for center', async () => {
      mockQuery.mockResolvedValue([{ validation: '1' }]);

      const result = await repository.validationCenterPermissions(10, 'CIMMYT');

      expect(result).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('rbu.center_id'),
        [10, 'CIMMYT'],
      );
    });

    it('should return 0 when user has no center assignment', async () => {
      mockQuery.mockResolvedValue([{ validation: '0' }]);

      const result = await repository.validationCenterPermissions(10, 'IRRI');

      expect(result).toBe(0);
    });
  });
});
