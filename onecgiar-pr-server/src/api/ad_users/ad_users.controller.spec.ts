import { Test, TestingModule } from '@nestjs/testing';
import { AdUsersController } from './ad_users.controller';
import { AdUserService } from './ad_users.service';

describe('AdUsersController', () => {
  let controller: AdUsersController;
  let adUserService: AdUserService;

  const mockAdUserService = {
    searchUsers: jest.fn(),
    validateLeadContactPerson: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdUsersController],
      providers: [
        {
          provide: AdUserService,
          useValue: mockAdUserService,
        },
      ],
    }).compile();

    controller = module.get<AdUsersController>(AdUsersController);
    adUserService = module.get<AdUserService>(AdUserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const query = 'john';
      const mockResponse = {
        users: [
          {
            id: 1,
            display_name: 'John Doe',
            mail: 'john.doe@cgiar.org',
            sam_account_name: 'jdoe',
          },
        ],
        fromCache: true,
        totalFound: 1,
      };

      mockAdUserService.searchUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.searchUsers(query);

      expect(result).toEqual(mockResponse);
      expect(adUserService.searchUsers).toHaveBeenCalledWith(query);
    });
  });

  describe('validateEmail', () => {
    it('should validate email successfully', async () => {
      const email = 'john.doe@cgiar.org';
      const mockResponse = {
        isValid: true,
        user: {
          id: 1,
          display_name: 'John Doe',
          mail: email,
        },
      };

      mockAdUserService.validateLeadContactPerson.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.validateEmail(email);

      expect(result).toEqual(mockResponse);
      expect(adUserService.validateLeadContactPerson).toHaveBeenCalledWith(
        email,
      );
    });

    it('should return validation error for invalid email', async () => {
      const email = 'invalid@example.com';
      const mockResponse = {
        isValid: false,
        error: 'User not found in Active Directory',
      };

      mockAdUserService.validateLeadContactPerson.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.validateEmail(email);

      expect(result).toEqual(mockResponse);
      expect(adUserService.validateLeadContactPerson).toHaveBeenCalledWith(
        email,
      );
    });
  });
});
