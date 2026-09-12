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

  // @akili-spec changes/cognito-email-otp-login (OTP-T-15, OTP-R-36) — a deactivated
  // PRMS account: decoy at start, OTP_NOT_AUTHORIZED at verify, never reaches Cognito.
  const mockInactiveOtpUser = {
    ...mockOtpUser,
    id: 43,
    email: 'inactive@icrisat.org',
    active: false,
  };

  // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — an obviously fake,
  // unsigned ID token: the signature is never verified (the tokens come from our
  // own microservice call), only the base64url payload is decoded.
  const buildFakeIdToken = (claims: Record<string, unknown>): string =>
    `fake-header.${Buffer.from(JSON.stringify(claims)).toString(
      'base64url',
    )}.fake-signature`;

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
            // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — mirrors the
            // real `JwtService.decode`: base64url payload → JSON, `null` when the
            // string is not a JWT. Kept faithful so the claim-extraction logic
            // under test is exercised for real, not fed a canned object.
            decode: jest.fn((token: string) => {
              try {
                return JSON.parse(
                  Buffer.from(token.split('.')[1], 'base64url').toString(
                    'utf8',
                  ),
                );
              } catch {
                return null;
              }
            }),
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, design.md §18.5,
    // requirements.md §14 OTP-R-3 modified / OTP-R-5 modified) — REPLACES the T-5
    // test "(b)(c) unknown user gets a decoy, no MS call". A center user no longer
    // needs a PRMS record before the first login: an allow-listed, unknown-in-PRMS
    // email now goes straight to the microservice and Cognito decides (its
    // `userNotFound` fake challenge keeps the response neutral).
    it('(b)(c)(T-15) an allow-listed email with no PRMS record reaches the microservice and logs outcome sent', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(authMicroservice, 'startEmailOtp')
        .mockResolvedValue({ session: 'cognito-real-session' } as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'unknown@icrisat.org',
      } as OtpStartDto);

      expect(authMicroservice.startEmailOtp).toHaveBeenCalledTimes(1);
      expect(authMicroservice.startEmailOtp).toHaveBeenCalledWith(
        'unknown@icrisat.org',
      );
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual({
        sent: true,
        session: 'cognito-real-session',
        destination: 'u***@icrisat.org',
      });
      expect(result.message).toBe(
        'If this account exists, a code has been sent.',
      );
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'sent'"),
        ),
      ).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, OTP-R-36, OTP-AC-21) —
    // the decoy survives for `active = false`: a deactivated account must never
    // reach Cognito, and its body must be indistinguishable from a real start.
    it('(T-15/OTP-R-36) an inactive PRMS user gets the decoy at start, no MS call, and a body indistinguishable from a real one', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'startEmailOtp')
        .mockResolvedValueOnce({ session: 'cognito-real-session' } as any);

      const realResult = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockInactiveOtpUser as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const inactiveResult = await service.startOtp({
        email: 'inactive@icrisat.org',
      } as OtpStartDto);

      // Only the active user's start reached the microservice.
      expect(authMicroservice.startEmailOtp).toHaveBeenCalledTimes(1);
      expect(authMicroservice.startEmailOtp).toHaveBeenCalledWith(
        'a@icrisat.org',
      );

      expect(inactiveResult.status).toBe(realResult.status);
      expect(inactiveResult.status).toBe(HttpStatus.OK);
      expect(inactiveResult.message).toBe(realResult.message);
      expect(Object.keys(inactiveResult.response).sort()).toEqual(
        Object.keys(realResult.response).sort(),
      );
      expect(inactiveResult.response.sent).toBe(true);
      expect(inactiveResult.response.destination).toBe('i***@icrisat.org');
      // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3)
      // Prefix-free — the old `/^otp:/` prefix was itself an existence oracle.
      expect(inactiveResult.response.session).not.toContain('otp:');
      expect(inactiveResult.response.session).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(
        (service as any).verifyDecoySession(
          inactiveResult.response.session,
          'inactive@icrisat.org',
        ),
      ).toEqual({ isDecoy: true, expired: false, exp: expect.any(Number) });
      expect(realResult.response.session).toBe('cognito-real-session');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'denied_user'"),
        ),
      ).toBe(true);
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0), design.md §13
    // item (a), Reviewer FAIL — "re-encoded, not removed") — the old layout carried
    // `exp` as 13 zero-padded ASCII digits at a fixed offset. Encoding the raw
    // epoch-ms integer as 8 bytes was NOT enough to remove that fingerprint: every
    // epoch-ms value until ~2039 has 3 leading zero bytes plus near-constant high
    // bits, so `slice(65, 76)` still decoded to "a value near now ± 5 min" for
    // every decoy and to a ~uniform 64-bit value for a real Cognito session — a
    // classifier from one `start` response, just laundered through base64url. The
    // segment is now XOR-masked with an HMAC(key, nonce)-derived keystream before
    // encoding, so it carries no signal until the HMAC itself is verified.
    it('(exp encoding) the exp segment is 11 base64url chars with no 13-digit fixed-offset fingerprint, and is NOT a decodable near-now classifier', () => {
      const exp = Date.now() + 5 * 60 * 1000;
      const decoyA = (service as any).buildDecoySession(
        'sample@icrisat.org',
        exp,
      );
      const decoyB = (service as any).buildDecoySession(
        'sample@icrisat.org',
        exp,
      );

      // No run of >= 13 decimal digits anywhere in the decoy (was guaranteed at a
      // fixed offset by the old 13-digit decimal `exp`).
      expect(decoyA).not.toMatch(/\d{13}/);
      expect(decoyB).not.toMatch(/\d{13}/);

      // exp segment sits right after hmac(43) + nonce(22): exactly 11 base64url chars.
      const expSegA = decoyA.slice(65, 76);
      const expSegB = decoyB.slice(65, 76);
      expect(expSegA).toHaveLength(11);
      expect(expSegA).toMatch(/^[A-Za-z0-9_-]{11}$/);

      // Two decoys minted for the SAME exp (rotation, T-13) must NOT share the
      // encoded segment — each decoy has its own random nonce, and the nonce keys
      // the mask, so the same timestamp produces unrelated-looking ciphertext.
      // (Before masking, this was `expSegA === expSegB` — exactly the fingerprint
      // the Reviewer flagged: the encoded value alone told you the timestamp.)
      expect(expSegA).not.toBe(expSegB);
      expect(decoyA).not.toBe(decoyB);

      // Two decoys 1 ms apart (still both "near now") must also look unrelated —
      // proves the masking isn't merely per-call jitter that happens to differ for
      // equal inputs; nearby real timestamps don't produce recognizably-related
      // segments either.
      const decoyC = (service as any).buildDecoySession(
        'sample@icrisat.org',
        exp + 1,
      );
      const expSegC = decoyC.slice(65, 76);
      expect(expSegC).not.toBe(expSegA);

      // No constant run >= 3 chars at any fixed offset within the exp segment
      // across many samples — the tell the Reviewer identified (`AAAB` for ~199
      // days, 6 constant chars today) must be gone once every segment is masked.
      const samples = Array.from({ length: 50 }, () =>
        (service as any)
          .buildDecoySession('sample@icrisat.org', exp)
          .slice(65, 76),
      );
      for (let offset = 0; offset <= 11 - 3; offset++) {
        const runs = new Set(
          samples.map((s: string) => s.slice(offset, offset + 3)),
        );
        expect(runs.size).toBeGreaterThan(1);
      }

      // Round-trips back to the same millisecond value on verify (only after the
      // HMAC has confirmed the decoy — `verifyDecoySession` unmasks internally).
      const parsed = (service as any).verifyDecoySession(
        decoyA,
        'sample@icrisat.org',
      );
      expect(parsed.isDecoy).toBe(true);
      expect(parsed.exp).toBe(exp);
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
      ).toEqual({ isDecoy: true, expired: false, exp: expect.any(Number) });

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
    // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — UPDATED from T-5: the
    // user handed to `createSuccessfulLoginResponse` is now the one returned by
    // `UserService.createOrUpdateUserFromAuthProvider` (the provider flow's step),
    // and `last_login` is written exactly as `validateAuthCode` writes it.
    it('(e) verify success deep-equals createSuccessfulLoginResponse for the same tokens and the provisioned/updated user', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockOtpUser as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

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
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: mockOtpUser.id, email: mockOtpUser.email },
        { last_login: expect.any(Date) },
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'a@icrisat.org' },
      });
      // An already-known active user is `ok`, never `provisioned`.
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'ok'"),
        ),
      ).toBe(true);
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'provisioned'"),
        ),
      ).toBe(false);
    });

    it('(e′) a fixture user without roles gets 403 needsRoles on the OTP path exactly as singIn', async () => {
      const userWithoutRoles = { ...mockOtpUser, obj_role_by_user: [] };
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutRoles as any);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(userWithoutRoles as any);

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.response.needsRoles).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, design.md §18.5,
    // requirements.md §14 OTP-R-5 modified, OTP-AC-20) — first login provisions the
    // PRMS user from the ID-token claims, exactly as the CGIAR provider flow does.
    it('(T-15/OTP-AC-20) a successful verify with no PRMS record provisions the user from the ID-token claims, logs provisioned, and returns the provider-flow login response', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const tokens = {
        ...mockAuthResponse.tokens,
        idToken: buildFakeIdToken({
          email: 'new@icrisat.org',
          given_name: 'Nia',
          family_name: 'Nuevo',
          name: 'Nia Nuevo',
        }),
      };
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens } as any);
      const provisionedUser = {
        id: 99,
        email: 'new@icrisat.org',
        first_name: 'Nia',
        last_name: 'Nuevo',
        active: true,
        obj_role_by_user: [{ id: 3, role: 'guest' }],
      };
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(provisionedUser as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const expected = (service as any).createSuccessfulLoginResponse(
        provisionedUser,
        tokens,
      );

      const result = await service.verifyOtp({
        email: 'NEW@ICRISAT.ORG',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).toHaveBeenCalledWith({
        email: 'new@icrisat.org',
        given_name: 'Nia',
        family_name: 'Nuevo',
        name: 'Nia Nuevo',
      });
      expect(result).toEqual(expected);
      expect(result.response.valid).toBe(true);
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 99, email: 'new@icrisat.org' },
        { last_login: expect.any(Date) },
      );
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'provisioned'"),
        ),
      ).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — the ID token is
    // decoded, never verified, so its `email` claim is not authority: the request
    // email (already normalised and rate-limited under) always wins.
    it('(T-15) the request email wins over a differing ID-token email claim', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockResolvedValue({
        tokens: {
          ...mockAuthResponse.tokens,
          idToken: buildFakeIdToken({
            email: 'attacker@evil.org',
            given_name: 'Mal',
          }),
        },
      } as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockOtpUser as any);

      await service.verifyOtp({
        email: 'Victim@ICRISAT.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).toHaveBeenCalledWith({
        email: 'victim@icrisat.org',
        given_name: 'Mal',
        family_name: undefined,
        name: undefined,
      });
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, OTP-R-36, OTP-AC-21)
    it('(T-15/OTP-AC-21) an inactive PRMS user gets OTP_NOT_AUTHORIZED at verify without reaching the microservice, byte-identical to the unknown-user body', async () => {
      // Reference body: unknown in PRMS, the microservice denies the code.
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValueOnce({
        status: 401,
        response: { code: 'NOT_AUTHORIZED' },
      });
      const unknownResult = await service.verifyOtp({
        email: 'ghost@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockInactiveOtpUser as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const inactiveResult = await service.verifyOtp({
        email: 'inactive@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(inactiveResult).toEqual(unknownResult);
      expect(inactiveResult.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(inactiveResult.response.code).toBe('OTP_NOT_AUTHORIZED');
      // Only the reference (unknown-user) call reached the microservice.
      expect(authMicroservice.verifyEmailOtp).toHaveBeenCalledTimes(1);
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — an account deactivated
    // between the pre-check and the provisioning call still answers neutrally, never
    // with the 503 the generic error mapper would produce for a bare Error.
    it('(T-15) maps the "User is inactive" throw from createOrUpdateUserFromAuthProvider to OTP_NOT_AUTHORIZED', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(authMicroservice, 'verifyEmailOtp')
        .mockResolvedValue({ tokens: mockAuthResponse.tokens } as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockRejectedValue(
          new Error(
            'Failed to create or update user: User is inactive. Please contact support.',
          ),
        );
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — UPDATED from T-5: the
    // fall-through now ends at the microservice (an unknown-in-PRMS email is no
    // longer rejected locally), and a reply without tokens is OTP_NOT_AUTHORIZED.
    it('a session too short to carry the decoy layout is treated as real and goes to the microservice (not a decoy)', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '123456',
        session: 'not-a-real-session-and-too-short-to-be-a-decoy',
      } as OtpVerifyDto);

      expect(authMicroservice.verifyEmailOtp).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — UPDATED from T-5: an
    // unknown-in-PRMS email is decided by Cognito now, so it reaches the microservice;
    // the 401 comes from the microservice's denial, not from a local existence gate.
    it('an unknown user (no decoy session) reaches the microservice and returns its 401 OTP_NOT_AUTHORIZED', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: { code: 'NOT_AUTHORIZED' },
      });

      const result = await service.verifyOtp({
        email: 'ghost@icrisat.org',
        code: '123456',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(authMicroservice.verifyEmailOtp).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).not.toHaveBeenCalled();
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0)) — CODE_MISMATCH
    // is covered separately below ("verifyOtp — rotated session on OTP_CODE_MISMATCH")
    // because it now requires a rotated `session` to reach 401 at all; a session-less
    // CODE_MISMATCH maps to 503 OTP_UPSTREAM_UNAVAILABLE instead (contract violation),
    // so it no longer belongs in this generic "carries no session" table.
    it.each([
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

  // @akili-spec changes/cognito-email-otp-login (OTP-T-13, design.md §18.1 steps 9-10,
  // requirements.md §13 OTP-R-7/OTP-R-4 modified, OTP-AC-18) — the rotated Cognito `session`
  // the microservice attaches to a CODE_MISMATCH reply must reach the 401 payload; the decoy
  // path (which never calls the microservice) must never carry one.
  describe('verifyOtp — rotated session on OTP_CODE_MISMATCH (OTP-T-13)', () => {
    it('carries the rotated session when the microservice mismatch error has one', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: {
          code: 'CODE_MISMATCH',
          message: 'stable copy',
          session: 'rotated-cognito-session',
        },
      });

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_CODE_MISMATCH');
      expect(result.response.session).toBe('rotated-cognito-session');
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0)) — every real
    // CODE_MISMATCH reply rotates a `session` (design.md §18.1 step 9); one that
    // doesn't is a microservice contract violation, not a legitimate user answer
    // (and emitting a mismatch body without `session` would itself be a reverse
    // existence oracle, since decoy mismatches always mint one — OTP-T-13 rework
    // 2). Map it to the same upstream-unavailable response as a downed microservice.
    it('treats a session-less CODE_MISMATCH from the microservice as OTP_UPSTREAM_UNAVAILABLE (contract violation, not a user path)', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: { code: 'CODE_MISMATCH', message: 'stable copy' },
      });
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(result.response).not.toHaveProperty('session');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'upstream_error'"),
        ),
      ).toBe(true);
    });

    it('treats an empty-string session on a CODE_MISMATCH reply the same way (not just a missing key)', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: {
          code: 'CODE_MISMATCH',
          message: 'stable copy',
          session: '',
        },
      });

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(result.response).not.toHaveProperty('session');
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2, design.md §18.1
    // row 10, requirements.md OTP-R-4, design.md OTP-DD-3 — corrected after the T-13
    // Reviewer FAIL, 2026-09-11) — the presence/absence of `session` on a mismatch was
    // itself a user-existence oracle: a real mismatch always carries one (microservice
    // rotation), so a decoy mismatch WITHOUT one let one `start` + one wrong `verify`
    // classify any address. A decoy mismatch now mints a fresh decoy session, carrying
    // the SAME `exp` as the original (never extending the lifetime past the start-time
    // window) and the same length-jitter class as any other decoy.
    it('a decoy mismatch mints a fresh decoy session carrying the SAME exp as the original (never an oracle)', async () => {
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');
      const originalCheck = (service as any).verifyDecoySession(
        decoy,
        'unknown@icrisat.org',
      );
      expect(originalCheck.isDecoy).toBe(true);

      const result = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '123456',
        session: decoy,
      } as OtpVerifyDto);

      expect(result.response.code).toBe('OTP_CODE_MISMATCH');
      expect(result.response.session).toEqual(expect.any(String));
      expect(result.response.session).not.toBe(decoy);
      expect(result.response.session.length).toBeGreaterThanOrEqual(1400);
      expect(result.response.session.length).toBeLessThanOrEqual(1700);

      const rotatedCheck = (service as any).verifyDecoySession(
        result.response.session,
        'unknown@icrisat.org',
      );
      expect(rotatedCheck.isDecoy).toBe(true);
      expect(rotatedCheck.expired).toBe(false);
      expect(rotatedCheck.exp).toBe(originalCheck.exp);
      expect(authMicroservice.verifyEmailOtp).not.toHaveBeenCalled();
    });

    // Reviewer remediation: byte-shape parity between the real and decoy mismatch
    // bodies is the actual anti-oracle invariant — not merely "decoy has a session".
    it('real mismatch and decoy mismatch bodies carry identical key sets and message (no existence oracle)', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: {
          code: 'CODE_MISMATCH',
          message: 'stable copy',
          session: 'rotated-cognito-session',
        },
      });

      const realResult = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');
      const decoyResult = await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code: '000000',
        session: decoy,
      } as OtpVerifyDto);

      expect(realResult.response.code).toBe('OTP_CODE_MISMATCH');
      expect(decoyResult.response.code).toBe('OTP_CODE_MISMATCH');
      expect(Object.keys(realResult.response).sort()).toEqual(
        Object.keys(decoyResult.response).sort(),
      );
      expect(realResult.message).toBe(decoyResult.message);
      expect(realResult.status).toBe(decoyResult.status);
    });

    it('never logs the rotated session', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockRejectedValue({
        status: 401,
        response: {
          code: 'CODE_MISMATCH',
          message: 'stable copy',
          session: 'rotated-cognito-session',
        },
      });
      const logSpy = jest.spyOn((service as any)._logger, 'log');
      const warnSpy = jest.spyOn((service as any)._logger, 'warn');
      const errorSpy = jest.spyOn((service as any)._logger, 'error');

      await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000',
        session: 'cognito-real-session',
      } as OtpVerifyDto);

      // Reviewer advisory 3 — must land before the loop below: without it the test
      // would pass vacuously if verifyOtp stopped logging altogether (all three spies
      // empty), proving nothing about the rotated session specifically.
      expect(logSpy).toHaveBeenCalled();

      const calls = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ].flat();
      calls.forEach((arg) => {
        expect(String(arg)).not.toContain('rotated-cognito-session');
      });
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
      jest.spyOn(authMicroservice, 'verifyEmailOtp').mockResolvedValue({
        tokens: {
          ...mockAuthResponse.tokens,
          // @akili-spec changes/cognito-email-otp-login (OTP-T-15) — the decoded
          // ID-token claims must never reach a log line either (OTP-R-11).
          idToken: buildFakeIdToken({
            email: 'a@icrisat.org',
            given_name: 'Ada',
            family_name: 'Icrisat',
          }),
        },
      } as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockOtpUser as any);

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
