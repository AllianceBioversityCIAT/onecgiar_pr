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

  // BIL-RTE-T-1 — design §5.1 / DD-3: single-query membership reads that never throw on
  // multiple matching `role_by_user` rows (P-10).
  describe('hasActiveRoleOnInitiative', () => {
    it('returns true when the EXISTS query reports a match', async () => {
      mockQuery.mockResolvedValue([{ has_role: '1' }]);

      const result = await repository.hasActiveRoleOnInitiative(10, 20);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
        [10, 20],
      );
    });

    it('returns false when the EXISTS query reports no match', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      const result = await repository.hasActiveRoleOnInitiative(10, 99);

      expect(result).toBe(false);
    });

    it('scopes the query to the initiative and active rows only', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      await repository.hasActiveRoleOnInitiative(10, 20);

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('rbu.initiative_id = ?');
      expect(query).toContain('rbu.active > 0');
    });

    // Reviewer FAIL #1 (rework, attempt 2): the initiative itself must be active too, the same
    // condition the ToC path already enforces via `getContributorInitiativeAndPrimaryByResult`.
    it('requires the initiative itself to be active (ci.active > 0)', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      await repository.hasActiveRoleOnInitiative(10, 20);

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('clarisa_initiatives');
      expect(query).toContain('ci.active > 0');
    });

    it('never throws on multiple matching rows (single EXISTS row back)', async () => {
      // A user with two roles on the same initiative still resolves as one boolean row.
      mockQuery.mockResolvedValue([{ has_role: '1' }]);

      await expect(repository.hasActiveRoleOnInitiative(10, 20)).resolves.toBe(
        true,
      );
    });

    it('propagates repository errors through HandlersError', async () => {
      mockQuery.mockRejectedValue(new Error('boom'));

      await expect(
        repository.hasActiveRoleOnInitiative(10, 20),
      ).rejects.toThrow('boom');
    });
  });

  describe('hasActiveRoleOnAnyInitiativeLinkedToResult', () => {
    it('returns true when the user has a role on a linked initiative', async () => {
      mockQuery.mockResolvedValue([{ has_role: '1' }]);

      const result =
        await repository.hasActiveRoleOnAnyInitiativeLinkedToResult(10, 100);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('results_by_inititiative'),
        [10, 100],
      );
    });

    it('returns false when no linked initiative carries an active role for the user', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      const result =
        await repository.hasActiveRoleOnAnyInitiativeLinkedToResult(10, 100);

      expect(result).toBe(false);
    });

    it('scopes the join to active role rows and active result-by-initiative rows', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      await repository.hasActiveRoleOnAnyInitiativeLinkedToResult(10, 100);

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('rbu.active > 0');
      expect(query).toContain('rbi.is_active > 0');
      expect(query).toContain('rbi.result_id = ?');
    });

    // Reviewer FAIL #1 (rework, attempt 2): attempt 1 joined only role_by_user to
    // results_by_inititiative, so a member of a retired/deactivated initiative whose `rbi` row was
    // still active would pass the Decision rule while the ToC rule refused the same user on the
    // same initiative. Both decisions must now share the same "active initiative" condition.
    it('also requires the linked initiative itself to be active (ci.active > 0)', async () => {
      mockQuery.mockResolvedValue([{ has_role: '0' }]);

      await repository.hasActiveRoleOnAnyInitiativeLinkedToResult(10, 100);

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('clarisa_initiatives');
      expect(query).toContain('ci.active > 0');
    });

    it('propagates repository errors through HandlersError', async () => {
      mockQuery.mockRejectedValue(new Error('boom'));

      await expect(
        repository.hasActiveRoleOnAnyInitiativeLinkedToResult(10, 100),
      ).rejects.toThrow('boom');
    });
  });
});
