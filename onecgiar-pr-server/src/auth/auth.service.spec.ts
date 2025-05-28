import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { HandlersError } from '../shared/handlers/error.utils';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { HttpStatus } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';

jest.mock('pusher', () => {
  return jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
  }));
});

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let userRepository: UserRepository;
  let handlersError: HandlersError;
  let authMicroservice: AuthMicroserviceService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    active: true,
    obj_role_by_user: [{ id: 1, role: 'admin' }],
  };

  const mockAuthResponse = {
    tokens: {
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    },
  };

  const mockJwtToken = 'mock-jwt-token';

  beforeEach(async () => {
    process.env.JWT_SKEY = 'test-secret';
    process.env.PUSHER_APP_ID = 'test-app-id';
    process.env.PUSHER_API_KEY = 'test-api-key';
    process.env.PUSHER_API_SECRET = 'test-api-secret';
    process.env.PUSHER_APP_CLUSTER = 'test-cluster';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(mockJwtToken),
          },
        },
        {
          provide: UserService,
          useValue: {
            createOrUpdateUserFromAuthProvider: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
            updateLastLoginUserByEmail: jest.fn(),
            update: jest.fn(),
            userDataPusher: jest.fn(),
          },
        },
        {
          provide: HandlersError,
          useValue: {
            returnErrorRes: jest.fn().mockImplementation(({ error }) => ({
              message: error.message || 'Internal server error',
              status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
            })),
          },
        },
        {
          provide: AuthMicroserviceService,
          useValue: {
            authenticateWithCustomCredentials: jest.fn(),
            getAuthenticationUrl: jest.fn(),
            validateAuthorizationCode: jest.fn(),
            completeNewPasswordChallenge: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
    handlersError = module.get<HandlersError>(HandlersError);
    authMicroservice = module.get<AuthMicroserviceService>(
      AuthMicroserviceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('singIn', () => {
    const mockLoginDto: UserLoginDto = {
      email: 'TEST@EXAMPLE.COM  ',
      password: 'password123',
    };

    it('should successfully authenticate a user with valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(authMicroservice, 'authenticateWithCustomCredentials')
        .mockResolvedValue(mockAuthResponse as any);
      jest
        .spyOn(userRepository, 'updateLastLoginUserByEmail')
        .mockResolvedValue(undefined);

      const result = await service.singIn(mockLoginDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response.valid).toBe(true);
      expect(result.response.token).toBe(mockJwtToken);
      expect(result.response.user.email).toBe('test@example.com');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', active: true },
        relations: ['obj_role_by_user'],
      });
      expect(
        authMicroservice.authenticateWithCustomCredentials,
      ).toHaveBeenCalledWith('test@example.com', 'password123', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });
    });

    it('should return error when email or password is missing', async () => {
      const invalidLoginDto = { email: '', password: '' };

      const result = await service.singIn(invalidLoginDto as UserLoginDto);

      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.message).toContain('Missing required fields');
    });

    it('should return error when user is not found in local database', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.singIn(mockLoginDto);

      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.response.valid).toBe(false);
      expect(result.message).toContain('User not found in local database');
    });

    it('should handle NEW_PASSWORD_REQUIRED challenge', async () => {
      const challengeResponse = {
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: 'mock-session',
        userAttributes: { email: 'test@example.com' },
        userId: 'mock-user-id',
      };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(authMicroservice, 'authenticateWithCustomCredentials')
        .mockResolvedValue(challengeResponse as any);

      const result = await service.singIn(mockLoginDto);

      expect(result.status).toBe(HttpStatus.ACCEPTED);
      expect(result.response.challengeRequired).toBe(true);
      expect(result.response.challengeName).toBe('NEW_PASSWORD_REQUIRED');
      expect(result.response.session).toBe('mock-session');
    });

    it('should return error when user has no roles', async () => {
      const userWithoutRoles = { ...mockUser, obj_role_by_user: [] };
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutRoles as any);
      jest
        .spyOn(authMicroservice, 'authenticateWithCustomCredentials')
        .mockResolvedValue(mockAuthResponse as any);

      const result = await service.singIn(mockLoginDto);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.response.valid).toBe(false);
      expect(result.response.needsRoles).toBe(true);
      expect(result.message).toContain('does not have any roles assigned');
    });

    it('should handle authentication failure from microservice', async () => {
      const authError = {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(authMicroservice, 'authenticateWithCustomCredentials')
        .mockRejectedValue(authError);

      const result = await service.singIn(mockLoginDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.valid).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });

  describe('pusherAuth', () => {
    const mockPusherAuthDto: PusherAuthDot = {
      socket_id: 'mock-socket-id',
      channel_name: 'presence-channel',
    };

    it('should successfully authenticate pusher connection', async () => {
      const mockPusherData = {
        user_id: 1,
        first_name: 'Test',
        last_name: 'User',
        aplication_role: 'admin',
        initiative_role: true,
      };
      jest
        .spyOn(userRepository, 'userDataPusher')
        .mockResolvedValue(mockPusherData as any);
      const mockAuth = { auth: 'mock-auth-token' };
      (service as any).pusher.authenticate = jest
        .fn()
        .mockReturnValue(mockAuth);

      const result = await service.pusherAuth(mockPusherAuthDto, 1, 1);

      expect(result).toEqual({ auth: mockAuth });
      expect(userRepository.userDataPusher).toHaveBeenCalledWith(1, 1);
      expect((service as any).pusher.authenticate).toHaveBeenCalledWith(
        'mock-socket-id',
        'presence-channel',
        expect.objectContaining({
          user_id: '1',
          user_info: expect.objectContaining({
            name: 'Test User',
            roles: 'admin',
            initiativeRoles: '1',
          }),
        }),
      );
    });

    it('should handle errors in pusher authentication', async () => {
      const error = new Error('Database error');
      jest.spyOn(userRepository, 'userDataPusher').mockRejectedValue(error);

      const result = await service.pusherAuth(mockPusherAuthDto, 1, 1);

      expect(result).toBe(error);
    });
  });

  describe('getAuthURL', () => {
    it('should successfully get authentication URL', async () => {
      const provider = 'google';
      const mockAuthUrl = 'https://auth.example.com/oauth/authorize';
      jest
        .spyOn(authMicroservice, 'getAuthenticationUrl')
        .mockResolvedValue(mockAuthUrl as any);

      const result = await service.getAuthURL(provider);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toBe(mockAuthUrl);
      expect(authMicroservice.getAuthenticationUrl).toHaveBeenCalledWith(
        provider,
      );
    });

    it('should handle errors when getting auth URL', async () => {
      const error = new Error('Provider not supported');
      jest
        .spyOn(authMicroservice, 'getAuthenticationUrl')
        .mockRejectedValue(error);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  describe('validateAuthCode', () => {
    const mockAuthCodeDto: AuthCodeValidationDto = {
      code: 'mock-auth-code',
    };

    it('should successfully validate auth code and create/update user', async () => {
      const mockAuthCodeResponse = {
        ...mockAuthResponse,
        userInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      jest
        .spyOn(authMicroservice, 'validateAuthorizationCode')
        .mockResolvedValue(mockAuthCodeResponse as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.validateAuthCode(mockAuthCodeDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response.valid).toBe(true);
      expect(result.response.token).toBe(mockJwtToken);
      expect(authMicroservice.validateAuthorizationCode).toHaveBeenCalledWith(
        'mock-auth-code',
      );
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).toHaveBeenCalledWith(mockAuthCodeResponse.userInfo);
    });

    it('should return error when user has no email', async () => {
      const mockAuthCodeResponse = {
        ...mockAuthResponse,
        userInfo: {
          firstName: 'Test',
          lastName: 'User',
        },
      };
      jest
        .spyOn(authMicroservice, 'validateAuthorizationCode')
        .mockResolvedValue(mockAuthCodeResponse as any);

      const result = await service.validateAuthCode(mockAuthCodeDto);

      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.message).toContain('does not have an email address');
    });

    it('should return error when user has no roles', async () => {
      const mockAuthCodeResponse = {
        ...mockAuthResponse,
        userInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      const userWithoutRoles = { ...mockUser, obj_role_by_user: [] };
      jest
        .spyOn(authMicroservice, 'validateAuthorizationCode')
        .mockResolvedValue(mockAuthCodeResponse as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(userWithoutRoles as any);

      const result = await service.validateAuthCode(mockAuthCodeDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.message).toContain('does not have rol associate');
    });
  });

  describe('completePasswordChallenge', () => {
    const mockChallengeDto: CompletePasswordChallengeDto = {
      username: 'test@example.com',
      newPassword: 'newPassword123',
      session: 'mock-session',
    };

    it('should successfully complete password challenge', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(authMicroservice, 'completeNewPasswordChallenge')
        .mockResolvedValue(mockAuthResponse as any);
      jest
        .spyOn(userRepository, 'updateLastLoginUserByEmail')
        .mockResolvedValue(undefined);

      const result = await service.completePasswordChallenge(mockChallengeDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response.valid).toBe(true);
      expect(result.response.token).toBe(mockJwtToken);
      expect(result.message).toContain('Password set successfully');
      expect(
        authMicroservice.completeNewPasswordChallenge,
      ).toHaveBeenCalledWith({
        username: 'test@example.com',
        newPassword: 'newPassword123',
        session: 'mock-session',
      });
    });

    it('should return error when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.completePasswordChallenge(mockChallengeDto);

      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toContain('User not found in local database');
    });

    it('should return error when user has no roles after password change', async () => {
      const userWithoutRoles = { ...mockUser, obj_role_by_user: [] };
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutRoles as any);
      jest
        .spyOn(authMicroservice, 'completeNewPasswordChallenge')
        .mockResolvedValue(mockAuthResponse as any);

      const result = await service.completePasswordChallenge(mockChallengeDto);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.response.needsRoles).toBe(true);
    });

    it('should handle errors from auth microservice', async () => {
      const error = new Error('Invalid session');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(authMicroservice, 'completeNewPasswordChallenge')
        .mockRejectedValue(error);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });
});
