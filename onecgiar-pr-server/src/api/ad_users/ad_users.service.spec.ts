import { Test, TestingModule } from '@nestjs/testing';
import { AdUserService } from './ad_users.service';
import { AdUserRepository } from './repository/ad-users.repository';
import { ActiveDirectoryService } from '../../auth/services/active-directory.service';

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
        users: mockUsers,
        fromCache: true,
        totalFound: 1,
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
        users: [mockSavedUser],
        fromCache: false,
        totalFound: 1,
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
        users: [],
        fromCache: true,
        totalFound: 0,
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
});
