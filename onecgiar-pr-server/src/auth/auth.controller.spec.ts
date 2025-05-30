import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpStatus } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

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

  const mockAuthService = {
    getAuthURL: jest.fn(),
    singIn: jest.fn(),
    validateAuthCode: jest.fn(),
    pusherAuth: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
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
});
