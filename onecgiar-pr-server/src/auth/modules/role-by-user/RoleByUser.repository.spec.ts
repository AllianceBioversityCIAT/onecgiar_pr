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

  // P2-3157 — centre → users, the inverse of validationCenterPermissions.
  describe('getUserIdsByCenter', () => {
    it('returns the active Center User ids for the centre', async () => {
      mockQuery.mockResolvedValue([
        { user_id: 11 },
        { user_id: '12' },
        { user_id: 13 },
      ]);

      const result = await repository.getUserIdsByCenter('CIAT');

      expect(result).toEqual([11, 12, 13]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('rbu.center_id = ?'),
        ['CIAT'],
      );
    });

    it('scopes the query to the Center User role and active rows', async () => {
      mockQuery.mockResolvedValue([]);

      await repository.getUserIdsByCenter('IRRI');

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('rbu.`role` = 9');
      expect(query).toContain('rbu.active > 0');
    });

    it('returns an empty array when the centre has no users', async () => {
      mockQuery.mockResolvedValue([]);

      expect(await repository.getUserIdsByCenter('IRRI')).toEqual([]);
    });

    it('drops rows without a usable user id', async () => {
      mockQuery.mockResolvedValue([
        { user_id: null },
        { user_id: 0 },
        { user_id: 'not-a-number' },
        { user_id: 7 },
      ]);

      expect(await repository.getUserIdsByCenter('CIAT')).toEqual([7]);
    });
  });
});
