import { Test, TestingModule } from '@nestjs/testing';
import { AdUserService } from './ad_users.service';
import { AdUserRepository } from './repository/ad-users.repository';
import { ActiveDirectoryService } from '../../auth/services/active-directory.service';
import { HttpStatus } from '@nestjs/common';

describe('AdUsersService', () => {
  let service: AdUserService;
  let adUserRepository: AdUserRepository;
  let activeDirectoryService: ActiveDirectoryService;

  const mockAdUserRepository = {
    searchLocalUsers: jest.fn(),
    findByIdentifier: jest.fn(),
    saveFromADUser: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockActiveDirectoryService = {
    searchUsers: jest.fn(),
    getUserDetails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdUserService,
        {
          provide: AdUserRepository,
          useValue: mockAdUserRepository,
        },
        {
          provide: ActiveDirectoryService,
          useValue: mockActiveDirectoryService,
        },
      ],
    }).compile();

    service = module.get<AdUserService>(AdUserService);
    adUserRepository = module.get<AdUserRepository>(AdUserRepository);
    activeDirectoryService = module.get<ActiveDirectoryService>(
      ActiveDirectoryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should return users from local cache when found', async () => {
      const query = 'john';
      const mockUsers = [
        {
          id: 1,
          display_name: 'John Doe',
          mail: 'john.doe@cgiar.org',
          sam_account_name: 'jdoe',
          is_active: true,
        },
      ];

      mockAdUserRepository.searchLocalUsers.mockResolvedValueOnce(mockUsers);

      const result = await service.searchUsers(query);

      expect(result).toEqual({
        response: mockUsers,
        message: 'Users found in local cache',
        status: HttpStatus.OK,
      });
      expect(adUserRepository.searchLocalUsers).toHaveBeenCalledWith(query);
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should search in AD when no local results found', async () => {
      const query = 'jane';
      const mockADUsers = [
        {
          displayName: 'Jane Smith',
          mail: 'jane.smith@cgiar.org',
          sAMAccountName: 'jsmith',
        },
      ];
      const mockSavedUser = {
        id: 2,
        display_name: 'Jane Smith',
        mail: 'jane.smith@cgiar.org',
        sam_account_name: 'jsmith',
        is_active: true,
      };

      mockAdUserRepository.searchLocalUsers.mockResolvedValueOnce([]);
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce(mockADUsers);
      mockAdUserRepository.saveFromADUser.mockResolvedValueOnce(mockSavedUser);

      const result = await service.searchUsers(query);

      expect(result).toEqual({
        response: [mockSavedUser],
        message: 'Users found in Active Directory',
        status: HttpStatus.OK,
      });
      expect(adUserRepository.searchLocalUsers).toHaveBeenCalledWith(query);
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith(query);
      expect(adUserRepository.saveFromADUser).toHaveBeenCalledWith(
        mockADUsers[0],
      );
    });

    it('should return empty results for short query', async () => {
      const result = await service.searchUsers('a');

      expect(result).toEqual({
        response: [],
        message: 'Query must be at least 2 characters long',
        status: HttpStatus.BAD_REQUEST,
      });
      expect(adUserRepository.searchLocalUsers).not.toHaveBeenCalled();
    });
  });

  describe('validateLeadContactPerson', () => {
    it('should validate existing user', async () => {
      const email = 'john.doe@cgiar.org';
      const mockUser = {
        id: 1,
        display_name: 'John Doe',
        mail: email,
        is_active: true,
      };

      mockAdUserRepository.findByIdentifier.mockResolvedValueOnce(mockUser);

      const result = await service.validateLeadContactPerson(email);

      expect(result).toEqual({
        isValid: true,
        user: mockUser,
      });
    });

    it('should return error for non-existing user', async () => {
      const email = 'nonexistent@cgiar.org';

      mockAdUserRepository.findByIdentifier.mockResolvedValueOnce(null);
      mockActiveDirectoryService.getUserDetails.mockResolvedValueOnce(null);

      const result = await service.validateLeadContactPerson(email);

      expect(result).toEqual({
        isValid: false,
        error: 'User not found in Active Directory',
      });
    });

    it('should return error for empty email', async () => {
      const result = await service.validateLeadContactPerson('');

      expect(result).toEqual({
        isValid: false,
        error: 'Email is required',
      });
    });
  });

  describe('resolveOrCreateContact', () => {
    it('should return null when no identifier is provided', async () => {
      const result = await service.resolveOrCreateContact(undefined, {
        mail: 'a@cgiar.org',
      });

      expect(result).toBeNull();
      expect(adUserRepository.findByIdentifier).not.toHaveBeenCalled();
    });

    it('should return the existing AD user without creating a new one', async () => {
      const mockUser = {
        id: 5,
        mail: 'existing@cgiar.org',
        is_active: true,
      };
      mockAdUserRepository.findByIdentifier.mockResolvedValueOnce(mockUser);

      const result = await service.resolveOrCreateContact(
        'existing@cgiar.org',
        { mail: 'existing@cgiar.org', displayName: 'Existing User' },
      );

      expect(result).toEqual(mockUser);
      expect(adUserRepository.saveFromADUser).not.toHaveBeenCalled();
    });

    it('should create a new AD user from the fallback data when none exists locally or in AD', async () => {
      mockAdUserRepository.findByIdentifier.mockResolvedValueOnce(null);
      mockActiveDirectoryService.getUserDetails.mockResolvedValueOnce(null);
      const fallback = { mail: 'new@cgiar.org', displayName: 'New User' };
      const created = { id: 9, mail: 'new@cgiar.org' };
      mockAdUserRepository.saveFromADUser.mockResolvedValueOnce(created);

      const result = await service.resolveOrCreateContact(
        'new@cgiar.org',
        fallback,
      );

      expect(adUserRepository.saveFromADUser).toHaveBeenCalledWith(fallback);
      expect(result).toEqual(created);
    });

    it('should return null when nothing resolves and no fallback data is given', async () => {
      mockAdUserRepository.findByIdentifier.mockResolvedValueOnce(null);
      mockActiveDirectoryService.getUserDetails.mockResolvedValueOnce(null);

      const result = await service.resolveOrCreateContact('missing@cgiar.org');

      expect(result).toBeNull();
      expect(adUserRepository.saveFromADUser).not.toHaveBeenCalled();
    });

    it('should return null and never throw when the repository errors', async () => {
      mockAdUserRepository.findByIdentifier.mockRejectedValueOnce(
        new Error('DB down'),
      );

      const result = await service.resolveOrCreateContact('broken@cgiar.org', {
        mail: 'broken@cgiar.org',
      });

      expect(result).toBeNull();
    });
  });
});
