import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { HandlersError } from '../shared/handlers/error.utils';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { GlobalParameterCacheService } from '../shared/services/cache/global-parameter-cache.service';
import { HttpStatus } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';
import { OtpStartDto } from './dto/otp-start.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';

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
  let globalParameterCacheService: GlobalParameterCacheService;

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

  // @akili-spec changes/cognito-email-otp-login (OTP-T-5) — Center-path fixture user
  const mockOtpUser = {
    id: 42,
    email: 'a@icrisat.org',
    first_name: 'Ada',
    last_name: 'Icrisat',
    active: true,
    obj_role_by_user: [{ id: 7, role: 'member' }],
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
              message: error.message ?? 'Internal server error',
              status: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
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
            startEmailOtp: jest.fn(),
            verifyEmailOtp: jest.fn(),
          },
        },
        {
          provide: GlobalParameterCacheService,
          useValue: {
            getParam: jest.fn(),
            clearCacheByKey: jest.fn(),
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
    globalParameterCacheService = module.get<GlobalParameterCacheService>(
      GlobalParameterCacheService,
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

      expect(result.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.response.valid).toBe(false);
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
        undefined,
      );
    });

    it('should handle errors when getting auth URL', async () => {
      const error = new Error('Provider not supported');
      jest
        .spyOn(authMicroservice, 'getAuthenticationUrl')
        .mockRejectedValue(error);

      await service.getAuthURL('invalid-provider');

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
        undefined,
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

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.message).toContain(
        'The user test@example.com does not have any roles assigned. Please contact the administrator.',
      );
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

      await service.completePasswordChallenge(mockChallengeDto);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  describe('getOtpAllowedDomains', () => {
    it('splits, trims, lower-cases, and drops empties and a leading @', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue(' ICRISAT.org, @cifor-icraf.org,,');

      const domains = await service.getOtpAllowedDomains();

      expect(globalParameterCacheService.getParam).toHaveBeenCalledWith(
        'OTP_ALLOWED_EMAIL_DOMAINS',
      );
      expect(domains).toEqual(['icrisat.org', 'cifor-icraf.org']);
    });

    it('returns [] for an empty string', async () => {
      jest.spyOn(globalParameterCacheService, 'getParam').mockResolvedValue('');

      expect(await service.getOtpAllowedDomains()).toEqual([]);
    });

    it('returns [] for undefined', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue(undefined);

      expect(await service.getOtpAllowedDomains()).toEqual([]);
    });

    it('returns [] for null', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue(null);

      expect(await service.getOtpAllowedDomains()).toEqual([]);
    });
  });

  describe('getOtpConfig', () => {
    it('returns the project envelope with the parsed domains', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org,cifor-icraf.org');

      const result = await service.getOtpConfig();

      expect(globalParameterCacheService.getParam).toHaveBeenCalledWith(
        'OTP_ALLOWED_EMAIL_DOMAINS',
      );
      expect(result).toEqual({
        message: 'OTP allow-list retrieved successfully',
        response: { domains: ['icrisat.org', 'cifor-icraf.org'] },
        status: HttpStatus.OK,
      });
    });

    it('returns an empty domains list when the parameter is empty', async () => {
      jest.spyOn(globalParameterCacheService, 'getParam').mockResolvedValue('');

      const result = await service.getOtpConfig();

      expect(result.response.domains).toEqual([]);
      expect(result.status).toBe(HttpStatus.OK);
    });

    it('delegates to the shared error handler when the cache lookup throws', async () => {
      const error = new Error('cache down');
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockRejectedValue(error);

      await service.getOtpConfig();

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-4 review pointers)
  describe('getOtpAllowedDomains — staleness, dedupe, @ parser (OTP-T-4 follow-ups)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears the cache when the last read is more than 60s stale', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
      jest.spyOn(globalParameterCacheService, 'clearCacheByKey');

      await service.getOtpAllowedDomains();
      expect(globalParameterCacheService.clearCacheByKey).toHaveBeenCalledTimes(
        1,
      );

      jest.advanceTimersByTime(30_000);
      await service.getOtpAllowedDomains();
      expect(globalParameterCacheService.clearCacheByKey).toHaveBeenCalledTimes(
        1,
      );

      jest.advanceTimersByTime(31_000);
      await service.getOtpAllowedDomains();
      expect(globalParameterCacheService.clearCacheByKey).toHaveBeenCalledTimes(
        2,
      );
    });

    it('drops entries that still contain @ after stripping a leading @', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org,a@b@c,@@foo.org');

      expect(await service.getOtpAllowedDomains()).toEqual(['icrisat.org']);
    });

    it('de-duplicates domains', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org,ICRISAT.ORG, icrisat.org ');

      expect(await service.getOtpAllowedDomains()).toEqual(['icrisat.org']);
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-5, requirements.md OTP-R-3/4/5/6/11/12/13)
  describe('startOtp', () => {
    beforeEach(() => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
    });

    it('(a) returns 400 OTP_DOMAIN_NOT_ALLOWED for a foreign domain, no MS call, outcome denied_domain', async () => {
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@foreign.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.response).toEqual({
        valid: false,
        code: 'OTP_DOMAIN_NOT_ALLOWED',
      });
      expect(authMicroservice.startEmailOtp).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'denied_domain'"),
        ),
      ).toBe(true);
    });

    it('(b)(c) unknown user gets a byte-identical shape neutral 200 with a decoy session, masked destination, no MS call — known user gets one MS call and the Cognito session', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'startEmailOtp')
        .mockResolvedValueOnce({ session: 'cognito-real-session' } as any);

      const knownResult = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);

      const unknownResult = await service.startOtp({
        email: 'unknown@icrisat.org',
      } as OtpStartDto);

      expect(knownResult.status).toBe(HttpStatus.OK);
      expect(unknownResult.status).toBe(HttpStatus.OK);
      expect(Object.keys(unknownResult.response).sort()).toEqual(
        Object.keys(knownResult.response).sort(),
      );
      expect(typeof unknownResult.response.session).toBe(
        typeof knownResult.response.session,
      );
      expect(typeof unknownResult.response.destination).toBe(
        typeof knownResult.response.destination,
      );
      expect(unknownResult.response.sent).toBe(true);
      // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3)
      // Prefix-free now — the old `/^otp:/` prefix was itself an existence oracle.
      expect(unknownResult.response.session).not.toContain('otp:');
      expect(unknownResult.response.session).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(
        (service as any).verifyDecoySession(
          unknownResult.response.session,
          'unknown@icrisat.org',
        ),
      ).toEqual({ isDecoy: true, expired: false });
      expect(unknownResult.response.destination).toBe('u***@icrisat.org');
      expect(knownResult.response.session).toBe('cognito-real-session');
      expect(authMicroservice.startEmailOtp).toHaveBeenCalledTimes(1);
      expect(authMicroservice.startEmailOtp).toHaveBeenCalledWith(
        'a@icrisat.org',
      );
    });

    // (o) — 20 samples: length ∈ [1400, 1700], base64url only, never contains 'otp:'
    it('(o) decoy sessions are jittered uniformly in [1400, 1700] chars, base64url-only, never containing "otp:" — 20 samples', () => {
      const lengths = Array.from(
        { length: 20 },
        () => (service as any).buildDecoySession('sample@icrisat.org').length,
      );

      lengths.forEach((len: number) => {
        expect(len).toBeGreaterThanOrEqual(1400);
        expect(len).toBeLessThanOrEqual(1700);
      });
      // Some spread across the samples — not a constant length.
      expect(new Set(lengths).size).toBeGreaterThan(1);

      const samples = Array.from({ length: 20 }, () =>
        (service as any).buildDecoySession('sample@icrisat.org'),
      );
      samples.forEach((s: string) => {
        expect(s).not.toContain('otp:');
        expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it('(o) two decoys for the same email differ even with JWT_SKEY unset (per-process random fallback key)', async () => {
      const original = process.env.JWT_SKEY;
      delete process.env.JWT_SKEY;

      const moduleWithoutSkey: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: JwtService, useValue: { sign: jest.fn() } },
          { provide: UserService, useValue: {} },
          {
            provide: UserRepository,
            useValue: {
              findOne: jest.fn(),
              updateLastLoginUserByEmail: jest.fn(),
            },
          },
          { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
          {
            provide: AuthMicroserviceService,
            useValue: { startEmailOtp: jest.fn(), verifyEmailOtp: jest.fn() },
          },
          {
            provide: GlobalParameterCacheService,
            useValue: { getParam: jest.fn(), clearCacheByKey: jest.fn() },
          },
        ],
      }).compile();
      const serviceWithoutSkey =
        moduleWithoutSkey.get<AuthService>(AuthService);

      const decoyA = (serviceWithoutSkey as any).buildDecoySession(
        'a@icrisat.org',
      );
      const decoyB = (serviceWithoutSkey as any).buildDecoySession(
        'a@icrisat.org',
      );

      expect(decoyA).not.toBe(decoyB);
      expect(
        (serviceWithoutSkey as any).verifyDecoySession(decoyA, 'a@icrisat.org'),
      ).toEqual({ isDecoy: true, expired: false });

      if (original === undefined) {
        delete process.env.JWT_SKEY;
      } else {
        process.env.JWT_SKEY = original;
      }
    });

    it('(g) returns 503 OTP_UPSTREAM_UNAVAILABLE when the microservice call fails', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'startEmailOtp').mockRejectedValue({
        status: 502,
        response: { code: 'UPSTREAM_ERROR' },
      });

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response).toEqual({
        valid: false,
        code: 'OTP_UPSTREAM_UNAVAILABLE',
      });
    });

    // (p) — a resolved (not rejected) MS reply missing `session` is also 503 upstream_error.
    it('(p) returns 503 OTP_UPSTREAM_UNAVAILABLE when the microservice start reply has no session', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'startEmailOtp')
        .mockResolvedValue({} as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response).toEqual({
        valid: false,
        code: 'OTP_UPSTREAM_UNAVAILABLE',
      });
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'upstream_error'"),
        ),
      ).toBe(true);
    });

    // Lens-A advisory — PRMS-side failures (allow-list read, findOne) log
    // `internal_error`, not `upstream_error`, so the runbook never blames Cognito
    // for a local DB/cache fault. The HTTP response stays the same neutral 503.
    it('logs internal_error (still 503 neutral) when the allow-list read throws', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockRejectedValueOnce(new Error('cache down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
        ),
      ).toBe(true);
      expect(authMicroservice.startEmailOtp).not.toHaveBeenCalled();
    });

    it('logs internal_error (still 503 neutral) when findOne throws', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValueOnce(new Error('db down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
        ),
      ).toBe(true);
      expect(authMicroservice.startEmailOtp).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('(e) verify success deep-equals createSuccessfulLoginResponse for the same tokens and fixture user with obj_role_by_user', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);
      jest
        .spyOn(userRepository, 'updateLastLoginUserByEmail')
        .mockResolvedValue(undefined);

      const expected = (service as any).createSuccessfulLoginResponse(
        mockOtpUser,
        mockAuthResponse.tokens,
      );

      const result = await service.verifyOtp({
        email: 'A@ICRISAT.ORG',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result).toEqual(expected);
      expect(userRepository.updateLastLoginUserByEmail).toHaveBeenCalledTimes(
        1,
      );
      expect(userRepository.updateLastLoginUserByEmail).toHaveBeenCalledWith(
        'a@icrisat.org',
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'a@icrisat.org', active: true },
        relations: ['obj_role_by_user'],
      });
    });

    it('(e′) a fixture user without roles gets 403 needsRoles on the OTP path exactly as singIn', async () => {
      const userWithoutRoles = { ...mockOtpUser, obj_role_by_user: [] };
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutRoles as any);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.response.needsRoles).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3,
    // design.md §4.1/OTP-DD-3, judgment lens-B advisory (b)) — a verified decoy now
    // answers exactly like a wrong code on a real session (OTP_CODE_MISMATCH), not
    // OTP_NOT_AUTHORIZED, so an unknown account is indistinguishable step-for-step.
    it('(e″/o) a verified (unexpired) decoy session on verify returns 401 OTP_CODE_MISMATCH without calling the microservice or the user lookup', async () => {
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '123456',
        session: decoy,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_CODE_MISMATCH');
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'mismatch'"),
        ),
      ).toBe(true);
    });

    // (o) — an expired decoy (exp in the past) → 401 OTP_NOT_AUTHORIZED, no MS call.
    it('(o) an expired decoy session on verify returns 401 OTP_NOT_AUTHORIZED without calling the microservice', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');
      jest.setSystemTime(new Date('2026-01-01T00:10:00.000Z')); // +10min > 5min TTL
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '123456',
        session: decoy,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);

      jest.useRealTimers();
    });

    it('a session too short to carry the decoy layout falls through to the user lookup (not a decoy)', async () => {
      const result = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '123456',
        session: 'not-a-real-session-and-too-short-to-be-a-decoy',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
    });

    // (o) — a forged blob of the right length (but wrong HMAC) is NOT a decoy —
    // it goes to the microservice like any other (unrecognised) real session.
    it('(o) a forged blob of the right length but a non-matching HMAC is treated as real and goes to the microservice', async () => {
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');
      // Flip one byte of the hmac segment — same total length, fails the HMAC check.
      const forged = (decoy[0] === 'A' ? 'B' : 'A') + decoy.slice(1);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: { code: 'NOT_AUTHORIZED' },
      });

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: forged,
      } as OtpVerifyDto);

      expect(authMicroservice.verifyEmailOtp).toHaveBeenCalledTimes(1);
      expect(authMicroservice.verifyEmailOtp).toHaveBeenCalledWith(
        'a@icrisat.org',
        '123456',
        forged,
      );
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
    });

    it('an unknown user (no decoy session) also returns 401 OTP_NOT_AUTHORIZED', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.verifyOtp({
        email: 'ghost@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
    });

    // Lens-A advisory — a findOne failure on verify is PRMS-side (internal_error),
    // still a neutral 503, never blamed on the microservice.
    it('logs internal_error (still 503 neutral) when findOne throws on verify', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValueOnce(new Error('db down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
        ),
      ).toBe(true);
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
    });

    it.each([
      ['CODE_MISMATCH', 'OTP_CODE_MISMATCH'],
      ['CODE_EXPIRED', 'OTP_CODE_EXPIRED'],
      ['ATTEMPTS_EXCEEDED', 'OTP_ATTEMPTS_EXCEEDED'],
      ['NOT_AUTHORIZED', 'OTP_NOT_AUTHORIZED'],
      ['CHALLENGE_NOT_SUPPORTED', 'OTP_NOT_AUTHORIZED'],
    ])(
      '(f) maps microservice code %s to %s (401)',
      async (msCode, expectedCode) => {
        jest
          .spyOn(userRepository, 'findOne')
          .mockResolvedValue(mockOtpUser as any);
        jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
          status: 401,
          response: { code: msCode, message: 'stable copy' },
        });

        const result = await service.verifyOtp({
          email: 'a@icrisat.org',
          code: '000000',
          session: 'cognito-real-session',
        } as OtpVerifyDto);

        expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.response.code).toBe(expectedCode);
      },
    );

    it('(g) returns 503 OTP_UPSTREAM_UNAVAILABLE when the microservice is down', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 502,
        response: { code: 'UPSTREAM_ERROR' },
      });

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-5, tasks.md verification (h), OTP-R-11, .cursorrules)
  describe('start/verifyOtp — no secrets in logs', () => {
    it('never logs the full email, code, session or tokens across start/verify', async () => {
      const logSpy = jest.spyOn((service as any)._logger, 'log');
      const warnSpy = jest.spyOn((service as any)._logger, 'warn');
      const errorSpy = jest.spyOn((service as any)._logger, 'error');

      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'startEmailOtp')
        .mockResolvedValue({ session: 'cognito-real-session' } as any);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);
      jest
        .spyOn(userRepository, 'updateLastLoginUserByEmail')
        .mockResolvedValue(undefined);

      const email = 'a@icrisat.org';
      const code = '654321';
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');

      await service.startOtp({ email } as OtpStartDto);
      await service.verifyOtp({
        email,
        code,
        session: 'cognito-real-session',
      } as OtpVerifyDto);
      await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code,
        session: decoy,
      } as OtpVerifyDto);

      const calls = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ].flat();

      calls.forEach((arg) => {
        const text = String(arg);
        expect(text).not.toContain(email);
        expect(text).not.toContain(code);
        expect(text).not.toContain('cognito-real-session');
        expect(text).not.toContain(decoy);
        expect(text).not.toContain(mockAuthResponse.tokens.accessToken);
      });
    });
  });
});
