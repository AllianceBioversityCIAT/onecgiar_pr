import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActiveDirectoryService } from './services/active-directory.service';
import { HttpStatus } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { SearchUsersDto } from './dto/search-users.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let activeDirectoryService: ActiveDirectoryService;

  const mockAuthUrl = {
    authUrl: 'https://login.example.com/authorize?client_id=123',
  };

  const mockAuthUrlResponse = {
    message: 'Authentication URL generated successfully',
    response: mockAuthUrl,
    status: HttpStatus.OK,
  };

  const mockLoginResponse = {
    message: 'Successful login',
    response: {
      valid: true,
      token: 'mock.jwt.token',
      user: {
        id: 1,
        user_name: 'Test User',
        email: 'test@example.com',
      },
      auth_tokens: {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      },
    },
    status: HttpStatus.ACCEPTED,
  };

  const mockValidateCodeResponse = {
    message: 'Successful login',
    response: {
      valid: true,
      token: 'mock.jwt.token',
      auth_tokens: {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      },
      user: {
        id: 1,
        user_name: 'Test User',
        email: 'test@example.com',
      },
    },
    status: HttpStatus.OK,
  };
  const mockPusherAuthResponse = {
    auth: 'pusher-auth-token',
  };

  const mockSearchUsersResponse = {
    users: [
      {
        cn: 'John Doe',
        displayName: 'John Doe',
        mail: 'john.doe@cgiar.org',
        sAMAccountName: 'jdoe',
        givenName: 'John',
        sn: 'Doe',
        userPrincipalName: 'john.doe@cgiar.org',
        department: 'IT',
        title: 'Developer',
      },
    ],
    total: 1,
    hasMore: false,
  };

  const mockServiceStatus = {
    initialized: true,
    hasConfig: true,
    configDetails: {
      hasUrl: true,
      hasBaseDN: true,
      hasDomain: true,
    },
    cacheStats: {
      size: 0,
      keys: [],
    },
  };

  const mockAuthService = {
    getAuthURL: jest.fn(),
    singIn: jest.fn(),
    validateAuthCode: jest.fn(),
    pusherAuth: jest.fn(),
  };

  const mockActiveDirectoryService = {
    searchUsers: jest.fn(),
    getServiceStatus: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ActiveDirectoryService,
          useValue: mockActiveDirectoryService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    activeDirectoryService = module.get<ActiveDirectoryService>(
      ActiveDirectoryService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuthURL', () => {
    it('should return authentication URL for the specified provider', async () => {
      const provider = 'AzureAD';
      mockAuthService.getAuthURL.mockResolvedValueOnce(mockAuthUrlResponse);

      const result = await controller.getAuthURL(provider);

      expect(result).toEqual(mockAuthUrlResponse);
      expect(authService.getAuthURL).toHaveBeenCalledWith(provider);
    });
  });

  describe('login', () => {
    it('should authenticate user with email and password', async () => {
      const userLoginDto: UserLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockAuthService.singIn.mockResolvedValueOnce(mockLoginResponse);

      const result = await controller.login(userLoginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.singIn).toHaveBeenCalledWith(userLoginDto);
    });
  });

  describe('validateAuthCode', () => {
    it('should validate authorization code and authenticate user', async () => {
      const authCodeDto: AuthCodeValidationDto = {
        code: 'test-auth-code',
        provider: 'AzureAD',
      };
      mockAuthService.validateAuthCode.mockResolvedValueOnce(
        mockValidateCodeResponse,
      );

      const result = await controller.validateAuthCode(authCodeDto);

      expect(result).toEqual(mockValidateCodeResponse);
      expect(authService.validateAuthCode).toHaveBeenCalledWith(authCodeDto);
    });
  });

  describe('signInPusher', () => {
    it('should authenticate Pusher connection', async () => {
      const pusherAuthDto: PusherAuthDot = {
        socket_id: 'socket-123',
        channel_name: 'presence-channel',
      };
      const resultId = 1;
      const userId = 1;
      mockAuthService.pusherAuth.mockResolvedValueOnce(mockPusherAuthResponse);

      const result = await controller.signInPusher(
        pusherAuthDto,
        resultId,
        userId,
      );
      expect(result).toEqual(mockPusherAuthResponse.auth);
      expect(authService.pusherAuth).toHaveBeenCalledWith(
        pusherAuthDto,
        resultId,
        userId,
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users in Active Directory', async () => {
      const searchDto: SearchUsersDto = {
        query: 'john',
        limit: 10,
        useCache: true,
      };
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce(
        mockSearchUsersResponse,
      );

      const result = await controller.searchUsers(searchDto);

      expect(result).toEqual({
        message: 'Users found successfully',
        response: mockSearchUsersResponse,
        status: 200,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith(
        'john',
        10,
        true,
      );
    });
  });

  describe('getSearchServiceStatus', () => {
    it('should return Active Directory service status', async () => {
      mockActiveDirectoryService.getServiceStatus.mockReturnValueOnce(
        mockServiceStatus,
      );

      const result = await controller.getSearchServiceStatus();

      expect(result).toEqual({
        message: 'Service status retrieved successfully',
        response: mockServiceStatus,
        status: 200,
      });
      expect(activeDirectoryService.getServiceStatus).toHaveBeenCalled();
    });
  });
});
