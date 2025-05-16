import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { HandlersError } from '../shared/handlers/error.utils';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { UserLoginDto } from './dto/login-user.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { User } from './modules/user/entities/user.entity';
import { AuthMicroserviceModule } from '../shared/microservices/auth-microservice/auth-microservice.module';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: UserService;
  let userRepository: UserRepository;
  let handlersError: HandlersError;
  let authMicroservice: AuthMicroserviceService;

  const originalEnv = process.env;
  const mockEnv = {
    JWT_SKEY: 'test-jwt-secret',
    PUSHER_APP_ID: 'test-app-id',
    PUSHER_API_KEY: 'test-api-key',
    PUSHER_API_SECRET: 'test-api-secret',
    PUSHER_APP_CLUSTER: 'test-cluster',
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    active: true,
    obj_role_by_user: [{ id: 1, role: 3 }],
  } as User;

  const mockUserNoRoles = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    active: true,
    obj_role_by_user: [],
  } as User;

  const mockAuthResponse = {
    tokens: {
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    },
    userInfo: {
      sub: 'user123',
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User',
    },
  };

  const mockTokenValidationResponse = {
    accessToken: 'test-access-token',
    idToken: 'test-id-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    userInfo: {
      sub: 'user123',
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User',
    },
  };

  const mockAuthUrl = {
    authUrl: 'https://login.example.com/authorize?client_id=123',
  };

  const mockJwtToken = 'mock.jwt.token';

  const mockJwtService = {
    sign: jest.fn(() => mockJwtToken),
  };

  const mockUserService = {
    createOrUpdateUserFromAuthProvider: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    updateLastLoginUserByEmail: jest.fn(),
    userDataPusher: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRes: jest.fn((config) => ({
      response: config.error.response || { error: true },
      message: config.error.message || 'Error message',
      status: config.error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    })),
  };

  const mockAuthMicroservice = {
    authenticateWithCustomCredentials: jest.fn(),
    getAuthenticationUrl: jest.fn(),
    validateAuthorizationCode: jest.fn(),
  };

  const mockPusherAuthenticate = jest.fn(() => ({
    auth: 'pusher-auth-token',
    channel_data: '{"user_id":"1"}',
  }));

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, ...mockEnv };

    jest.clearAllMocks();

    jest.mock('pusher', () => {
      return jest.fn().mockImplementation(() => ({
        authenticate: mockPusherAuthenticate,
      }));
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
        {
          provide: AuthMicroserviceService,
          useValue: mockAuthMicroservice,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
    handlersError = module.get<HandlersError>(HandlersError);
    authMicroservice = module.get<AuthMicroserviceService>(
      AuthMicroserviceService,
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('singIn', () => {
    it('should authenticate user with valid credentials', async () => {
      const userLoginDto: UserLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthMicroservice.authenticateWithCustomCredentials.mockResolvedValueOnce(
        mockAuthResponse,
      );
      mockUserService.createOrUpdateUserFromAuthProvider.mockResolvedValueOnce(
        mockUser,
      );

      const result = await service.singIn(userLoginDto);

      expect(result).toEqual({
        message: 'Successful login',
        response: {
          valid: true,
          token: mockJwtToken,
          user: {
            id: mockUser.id,
            user_name: `${mockUser.first_name} ${mockUser.last_name}`,
            email: mockUser.email,
          },
          auth_tokens: mockAuthResponse.tokens,
        },
        status: HttpStatus.ACCEPTED,
      });

      expect(
        authMicroservice.authenticateWithCustomCredentials,
      ).toHaveBeenCalledWith(
        userLoginDto.email.toLowerCase(),
        userLoginDto.password,
      );
      expect(userService.createOrUpdateUserFromAuthProvider).toHaveBeenCalled();
      expect(userRepository.updateLastLoginUserByEmail).toHaveBeenCalledWith(
        userLoginDto.email.toLowerCase(),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        },
        { secret: mockEnv.JWT_SKEY },
      );
    });

    it('should throw an error when required fields are missing', async () => {
      const userLoginDto: UserLoginDto = {
        email: '',
        password: '',
      };

      const result = await service.singIn(userLoginDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          message: 'Missing required fields: email or password.',
          response: {
            valid: false,
          },
          status: HttpStatus.BAD_REQUEST,
        },
      });
    });

    it('should throw an error when authentication fails and user exists', async () => {
      const userLoginDto: UserLoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const authError = new Error('Authentication failed');
      mockAuthMicroservice.authenticateWithCustomCredentials.mockRejectedValueOnce(
        authError,
      );
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.singIn(userLoginDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          response: {
            valid: false,
          },
          message: 'Authentication failed',
          status: HttpStatus.UNAUTHORIZED,
        },
      });
    });

    it('should throw an error when authentication fails and user does not exist', async () => {
      const userLoginDto: UserLoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const authError = new Error('Authentication failed');
      mockAuthMicroservice.authenticateWithCustomCredentials.mockRejectedValueOnce(
        authError,
      );
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.singIn(userLoginDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          message: `The user ${userLoginDto.email} is not registered in the system.`,
          response: {
            valid: false,
          },
          status: HttpStatus.NOT_FOUND,
        },
      });
    });
  });

  describe('getAuthURL', () => {
    it('should return authentication URL for the specified provider', async () => {
      const provider = 'AzureAD';
      mockAuthMicroservice.getAuthenticationUrl.mockResolvedValueOnce(
        mockAuthUrl,
      );

      const result = await service.getAuthURL(provider);

      expect(result).toEqual({
        message: 'Authentication URL generated successfully',
        response: mockAuthUrl,
        status: HttpStatus.OK,
      });

      expect(authMicroservice.getAuthenticationUrl).toHaveBeenCalledWith(
        provider,
      );
    });

    it('should handle errors when getting authentication URL fails', async () => {
      const provider = 'AzureAD';
      const error = new Error('Failed to get authentication URL');
      mockAuthMicroservice.getAuthenticationUrl.mockRejectedValueOnce(error);

      const result = await service.getAuthURL(provider);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error,
      });
    });
  });

  describe('validateAuthCode', () => {
    it('should validate authorization code and return user information with token', async () => {
      const authCodeDto: AuthCodeValidationDto = {
        code: 'test-auth-code',
      };

      mockAuthMicroservice.validateAuthorizationCode.mockResolvedValueOnce(
        mockTokenValidationResponse,
      );
      mockUserService.createOrUpdateUserFromAuthProvider.mockResolvedValueOnce(
        mockUser,
      );

      const result = await service.validateAuthCode(authCodeDto);

      expect(result).toEqual({
        message: 'Successful login',
        response: {
          valid: true,
          token: mockJwtToken,
          auth_tokens: {
            accessToken: mockTokenValidationResponse.accessToken,
            idToken: mockTokenValidationResponse.idToken,
            refreshToken: mockTokenValidationResponse.refreshToken,
            expiresIn: mockTokenValidationResponse.expiresIn,
          },
          user: {
            id: mockUser.id,
            user_name: `${mockUser.first_name} ${mockUser.last_name}`,
            email: mockUser.email,
          },
        },
        status: HttpStatus.OK,
      });

      expect(authMicroservice.validateAuthorizationCode).toHaveBeenCalledWith(
        authCodeDto.code,
      );
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).toHaveBeenCalledWith(mockTokenValidationResponse.userInfo);
      expect(userRepository.update).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
        },
        {
          last_login: expect.any(Date),
        },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        },
        { secret: mockEnv.JWT_SKEY },
      );
    });

    it('should throw an error when user info is missing email', async () => {
      const authCodeDto: AuthCodeValidationDto = {
        code: 'test-auth-code',
      };

      const invalidUserInfoResponse = {
        ...mockTokenValidationResponse,
        userInfo: { sub: 'user123' },
      };

      mockAuthMicroservice.validateAuthorizationCode.mockResolvedValueOnce(
        invalidUserInfoResponse,
      );

      const result = await service.validateAuthCode(authCodeDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          message: 'The user does not have an email address.',
          status: HttpStatus.BAD_REQUEST,
        },
      });
    });

    it('should throw an error when user has no roles assigned', async () => {
      const authCodeDto: AuthCodeValidationDto = {
        code: 'test-auth-code',
      };

      mockAuthMicroservice.validateAuthorizationCode.mockResolvedValueOnce(
        mockTokenValidationResponse,
      );
      mockUserService.createOrUpdateUserFromAuthProvider.mockResolvedValueOnce(
        mockUserNoRoles,
      );

      const result = await service.validateAuthCode(authCodeDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: {
          message: `The user ${mockUserNoRoles.email} does not have rol associate.`,
          status: HttpStatus.UNAUTHORIZED,
        },
      });
    });

    it('should handle general errors during validation', async () => {
      const authCodeDto: AuthCodeValidationDto = {
        code: 'test-auth-code',
      };

      const error = new Error('Validation failed');
      mockAuthMicroservice.validateAuthorizationCode.mockRejectedValueOnce(
        error,
      );

      const result = await service.validateAuthCode(authCodeDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error,
      });
    });
  });

  describe('pusherAuth', () => {
    it('should return error when Pusher authentication fails', async () => {
      const pusherAuthDto = {
        socket_id: 'socket-123',
        channel_name: 'presence-channel',
      };
      const resultId = 1;
      const userId = 1;

      const error = new Error('Failed to get user data');
      mockUserRepository.userDataPusher.mockRejectedValueOnce(error);

      const result = await service.pusherAuth(pusherAuthDto, resultId, userId);

      expect(result).toEqual(error);
    });
  });
});
