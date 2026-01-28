import { DataSource, Like } from 'typeorm';
import { AdUserRepository } from './ad-users.repository';
import { AdUser } from '../entity/ad-user.entity';

describe('AdUserRepository', () => {
  let repo: AdUserRepository;
  let mockFind: jest.SpyInstance;
  let mockFindOne: jest.SpyInstance;
  let mockUpdate: jest.SpyInstance;
  let mockSave: jest.SpyInstance;
  let mockCreateQueryBuilder: jest.SpyInstance;
  let getManyMock: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new AdUserRepository(mockDataSource);

    mockFind = jest.spyOn(repo, 'find').mockResolvedValue([]);
    mockFindOne = jest.spyOn(repo, 'findOne').mockResolvedValue(null);
    mockUpdate = jest.spyOn(repo, 'update').mockResolvedValue({} as any);
    mockSave = jest.spyOn(repo, 'save').mockResolvedValue({} as AdUser);

    getManyMock = jest.fn().mockResolvedValue([]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: getManyMock,
    };
    mockCreateQueryBuilder = jest
      .spyOn(repo, 'createQueryBuilder')
      .mockReturnValue(qb as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined and construct with DataSource', () => {
    expect(repo).toBeDefined();
    expect(mockDataSource.createEntityManager).toHaveBeenCalled();
  });

  describe('searchLocalUsers', () => {
    it('should return empty array when query is null', async () => {
      const result = await repo.searchLocalUsers(null as any);

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when query is undefined', async () => {
      const result = await repo.searchLocalUsers(undefined as any);

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when query is empty string', async () => {
      const result = await repo.searchLocalUsers('');

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when query length is less than 2', async () => {
      const result = await repo.searchLocalUsers('a');

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when query is only whitespace', async () => {
      const result = await repo.searchLocalUsers('  ');

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should call find with correct params and return results when query is valid', async () => {
      const mockUsers: Partial<AdUser>[] = [
        { id: 1, display_name: 'Jane Doe', mail: 'jane@test.org' },
      ];
      mockFind.mockResolvedValueOnce(mockUsers);

      const result = await repo.searchLocalUsers('jane');

      expect(result).toEqual(mockUsers);
      expect(mockFind).toHaveBeenCalledTimes(1);
      const callArg = mockFind.mock.calls[0][0];
      expect(callArg.take).toBe(100);
      expect(callArg.order).toEqual({ display_name: 'ASC' });
      expect(callArg.where).toHaveLength(8);
      const searchQuery = '%jane%';
      expect(callArg.where).toEqual(
        expect.arrayContaining([
          { display_name: Like(searchQuery), is_active: true },
          { mail: Like(searchQuery), is_active: true },
          { sam_account_name: Like(searchQuery), is_active: true },
          { given_name: Like(searchQuery), is_active: true },
          { sn: Like(searchQuery), is_active: true },
          { title: Like(searchQuery), is_active: true },
          { department: Like(searchQuery), is_active: true },
          { company: Like(searchQuery), is_active: true },
        ]),
      );
    });

    it('should trim query before searching', async () => {
      mockFind.mockResolvedValueOnce([]);

      await repo.searchLocalUsers('  john  ');

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              display_name: Like('%john%'),
            }),
          ]),
        }),
      );
    });
  });

  describe('findByEmail', () => {
    it('should call findOne with mail and is_active true', async () => {
      const email = 'user@cgiar.org';
      const mockUser = { id: 1, mail: email, is_active: true } as AdUser;
      mockFindOne.mockResolvedValueOnce(mockUser);

      const result = await repo.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { mail: email, is_active: true },
      });
    });

    it('should return null when user not found', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      const result = await repo.findByEmail('nonexistent@test.org');

      expect(result).toBeNull();
    });
  });

  describe('findByIdentifier', () => {
    it('should call findOne with mail, sam_account_name, user_principal_name', async () => {
      const identifier = 'jdoe';
      const mockUser = {
        id: 1,
        sam_account_name: identifier,
        is_active: true,
      } as AdUser;
      mockFindOne.mockResolvedValueOnce(mockUser);

      const result = await repo.findByIdentifier(identifier);

      expect(result).toEqual(mockUser);
      expect(mockFindOne).toHaveBeenCalledWith({
        where: [
          { mail: identifier, is_active: true },
          { sam_account_name: identifier, is_active: true },
          { user_principal_name: identifier, is_active: true },
        ],
      });
    });

    it('should return null when no user matches', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      const result = await repo.findByIdentifier('unknown');

      expect(result).toBeNull();
    });
  });

  describe('saveFromADUser', () => {
    const baseAdUserData = {
      cn: 'CN=John',
      displayName: 'John Doe',
      mail: 'john@cgiar.org',
      sAMAccountName: 'jdoe',
      givenName: 'John',
      sn: 'Doe',
      userPrincipalName: 'john@cgiar.org',
      title: 'Researcher',
      department: 'IT',
      company: 'CGIAR',
      manager: null,
      employeeID: null,
      employeeNumber: null,
      employeeType: null,
      description: null,
    };

    it('should update existing user when findByEmail returns user', async () => {
      const existingUser = {
        id: 42,
        mail: baseAdUserData.mail,
        is_active: true,
      } as AdUser;
      const updatedUser = { ...existingUser, display_name: 'John Doe' };
      mockFindOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);

      const result = await repo.saveFromADUser(baseAdUserData);

      expect(result).toEqual(updatedUser);
      expect(mockUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          mail: baseAdUserData.mail,
          display_name: baseAdUserData.displayName,
          sam_account_name: baseAdUserData.sAMAccountName,
          is_active: true,
          last_synced_at: expect.any(Date),
        }),
      );
      expect(mockFindOne).toHaveBeenCalledTimes(2);
      expect(mockFindOne).toHaveBeenNthCalledWith(1, {
        where: { mail: baseAdUserData.mail, is_active: true },
      });
      expect(mockFindOne).toHaveBeenNthCalledWith(2, {
        where: { id: 42 },
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should save new user when findByEmail returns null', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      const savedUser = {
        id: 1,
        mail: baseAdUserData.mail,
        display_name: baseAdUserData.displayName,
      } as AdUser;
      mockSave.mockResolvedValueOnce(savedUser);

      const result = await repo.saveFromADUser(baseAdUserData);

      expect(result).toEqual(savedUser);
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          mail: baseAdUserData.mail,
          display_name: baseAdUserData.displayName,
          sam_account_name: baseAdUserData.sAMAccountName,
          given_name: baseAdUserData.givenName,
          sn: baseAdUserData.sn,
          user_principal_name: baseAdUserData.userPrincipalName,
          title: baseAdUserData.title,
          department: baseAdUserData.department,
          company: baseAdUserData.company,
          is_active: true,
          last_synced_at: expect.any(Date),
        }),
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should map all AD fields to entity fields', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      const fullAdData = {
        ...baseAdUserData,
        manager: 'CN=Manager',
        employeeID: 'E001',
        employeeNumber: '123',
        employeeType: 'Full-time',
        description: 'Dev',
      };
      mockSave.mockResolvedValueOnce({ id: 1 } as AdUser);

      await repo.saveFromADUser(fullAdData);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          manager: 'CN=Manager',
          employee_id: 'E001',
          employee_number: '123',
          employee_type: 'Full-time',
          description: 'Dev',
        }),
      );
    });
  });

  describe('getUsersNeedingSync', () => {
    it('should use default 30 days when daysOld not provided', async () => {
      const mockUsers: Partial<AdUser>[] = [
        { id: 1, last_synced_at: new Date('2020-01-01') },
      ];
      getManyMock.mockResolvedValueOnce(mockUsers);

      const result = await repo.getUsersNeedingSync();

      expect(result).toEqual(mockUsers);
      expect(mockCreateQueryBuilder).toHaveBeenCalledWith('user');
      const qb = (mockCreateQueryBuilder as jest.Mock).mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith(
        'user.last_synced_at < :cutoffDate OR user.last_synced_at IS NULL',
        { cutoffDate: expect.any(Date) },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('user.is_active = :isActive', {
        isActive: true,
      });
      expect(qb.getMany).toHaveBeenCalled();
    });

    it('should use custom daysOld when provided', async () => {
      getManyMock.mockResolvedValueOnce([]);
      const before = new Date();

      await repo.getUsersNeedingSync(7);

      const after = new Date();
      const qb = (mockCreateQueryBuilder as jest.Mock).mock.results[0].value;
      const cutoffArg = qb.where.mock.calls[0][1].cutoffDate as Date;
      expect(cutoffArg.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 8 * 24 * 60 * 60 * 1000,
      );
      expect(cutoffArg.getTime()).toBeLessThanOrEqual(
        after.getTime() - 6 * 24 * 60 * 60 * 1000,
      );
    });

    it('should return users from getMany', async () => {
      const users = [{ id: 1 }, { id: 2 }] as AdUser[];
      getManyMock.mockResolvedValueOnce(users);

      const result = await repo.getUsersNeedingSync(14);

      expect(result).toEqual(users);
    });
  });
});
