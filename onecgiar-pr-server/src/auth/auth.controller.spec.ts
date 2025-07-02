import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActiveDirectoryService } from './services/active-directory.service';
import { HttpStatus } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';

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

  const mockSearchUsersResponse = [
    {
      cn: 'John Doe',
      displayName: 'John Doe',
      mail: 'john.doe@cgiar.org',
      sAMAccountName: 'jdoe',
      givenName: 'John',
      sn: 'Doe',
      userPrincipalName: 'john.doe@cgiar.org',
      title: 'Senior Developer',
      department: 'IT Department',
      company: 'CGIAR',
    },
  ];

  const mockAuthService = {
    getAuthURL: jest.fn(),
    singIn: jest.fn(),
    validateAuthCode: jest.fn(),
    pusherAuth: jest.fn(),
  };

  const mockActiveDirectoryService = {
    searchUsers: jest.fn(),
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
    it('should search users in Active Directory successfully', async () => {
      const query = 'john';
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce(
        mockSearchUsersResponse,
      );

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Users found successfully',
        response: mockSearchUsersResponse,
        status: 200,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith('john');
    });

    it('should return no users found message when search returns empty array', async () => {
      const query = 'nonexistent';
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce([]);

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'No users found',
        response: [],
        status: 200,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith(
        'nonexistent',
      );
    });

    it('should return error when query is empty string', async () => {
      const query = '';
      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      });
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should return error when query is too short', async () => {
      const query = 'a';
      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      });
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should return error when query is null', async () => {
      const query = null as any;
      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      });
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should return error when query is undefined', async () => {
      const query = undefined as any;
      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      });
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      const query = 'john';
      const errorMessage = 'AD connection failed';
      mockActiveDirectoryService.searchUsers.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Error searching users: Error: AD connection failed',
        response: [],
        status: 500,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith('john');
    });

    it('should trim whitespace from query', async () => {
      const query = '  john  ';
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce(
        mockSearchUsersResponse,
      );

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Users found successfully',
        response: mockSearchUsersResponse,
        status: 200,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith('john');
    });

    it('should handle query with only whitespace', async () => {
      const query = '   ';
      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Query must be at least 2 characters',
        response: [],
        status: 400,
      });
      expect(activeDirectoryService.searchUsers).not.toHaveBeenCalled();
    });

    it('should return correct message for single user result', async () => {
      const query = 'john';
      const singleUserResponse = [mockSearchUsersResponse[0]];
      mockActiveDirectoryService.searchUsers.mockResolvedValueOnce(
        singleUserResponse,
      );

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Users found successfully',
        response: singleUserResponse,
        status: 200,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const query = 'john';
      const stringError = 'String error message';
      mockActiveDirectoryService.searchUsers.mockRejectedValueOnce(stringError);

      const result = await controller.searchUsers(query);

      expect(result).toEqual({
        message: 'Error searching users: String error message',
        response: [],
        status: 500,
      });
      expect(activeDirectoryService.searchUsers).toHaveBeenCalledWith('john');
    });
  });
});
