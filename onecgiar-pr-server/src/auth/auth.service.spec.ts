import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { FindOperator } from 'typeorm';
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
// @akili-spec changes/cognito-email-otp-login (OTP-T-16) — PRMS now owns the code
// lifecycle and sends the email itself; Cognito is off the Center path entirely.
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpChallenge } from './otp/otp-challenge.entity';
import { OtpChallengeService } from './otp/otp-challenge.service';
import { EmailNotificationManagementService } from '../shared/microservices/email-notification-management/email-notification-management.service';

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
  let otpChallengeService: OtpChallengeService;
  let emailNotification: EmailNotificationManagementService;

  // @akili-spec changes/cognito-email-otp-login (OTP-T-16) — an in-memory stand-in
  // for the `otp_challenges` table. The REAL `OtpChallengeService` runs on top of
  // it, so every HMAC, attempt count and consume in these tests is the production
  // construction, not a canned mock answer.
  let otpRows: any[];
  const otpRepositoryMock = {
    save: jest.fn(async (row: any) => {
      otpRows.push({ id: otpRows.length + 1, created_at: new Date(), ...row });
      return row;
    }),
    findOne: jest.fn(
      async ({ where: { nonce } }: any) =>
        otpRows.find((row) => row.nonce === nonce) ?? null,
    ),
    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, reviewer advisory) —
    // both mocks implement the SAME conditional semantics the real `UPDATE …
    // WHERE …` statements do: a `FindOperator` in the criteria (`LessThan`,
    // `IsNull`) is a real WHERE clause, not decoration, so `affected` is 0 whenever
    // the row no longer matches it by the time the "statement" runs — exactly what
    // makes the two concurrency fixes below observable against this in-memory row
    // store instead of a live MySQL connection.
    increment: jest.fn(async (where: any, field: string, by: number) => {
      const row = otpRows.find((candidate) => candidate.nonce === where.nonce);
      if (!row) return { affected: 0 };
      const ceiling = where.attempts;
      if (
        ceiling instanceof FindOperator &&
        ceiling.type === 'lessThan' &&
        !(row.attempts < ceiling.value)
      ) {
        return { affected: 0 };
      }
      row[field] += by;
      return { affected: 1 };
    }),
    update: jest.fn(async (where: any, patch: any) => {
      const row = otpRows.find((candidate) => candidate.nonce === where.nonce);
      if (!row) return { affected: 0 };
      const unconsumed = where.consumed_at;
      if (
        unconsumed instanceof FindOperator &&
        unconsumed.type === 'isNull' &&
        row.consumed_at != null
      ) {
        return { affected: 0 };
      }
      Object.assign(row, patch);
      return { affected: 1 };
    }),
    delete: jest.fn(async () => ({ affected: 0 })),
  };

  /** The code as the user receives it: read back out of the email that was sent. */
  const codeFromLastEmail = (): string => {
    const calls = (emailNotification.sendEmail as jest.Mock).mock.calls;
    const text = calls[calls.length - 1][0].emailBody.message.text as string;
    return /\b(\d{6})\b/.exec(text)[1];
  };

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

  const mockJwtToken = 'mock-jwt-token';

  beforeEach(async () => {
    process.env.JWT_SKEY = 'test-secret';
    process.env.EMAIL_SENDER = 'PRMS-No-reply@cgiar.org';
    otpRows = [];
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
        OtpChallengeService,
        {
          provide: getRepositoryToken(OtpChallenge),
          useValue: otpRepositoryMock,
        },
        {
          provide: EmailNotificationManagementService,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    otpChallengeService = module.get<OtpChallengeService>(OtpChallengeService);
    emailNotification = module.get<EmailNotificationManagementService>(
      EmailNotificationManagementService,
    );
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
      expect(otpRepositoryMock.save).not.toHaveBeenCalled();
      expect(emailNotification.sendEmail).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'denied_domain'"),
        ),
      ).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) —
    // REPLACES the T-15 test "…reaches the microservice". PRMS now creates the
    // challenge row and sends the email itself; no Cognito call exists on this path.
    it('(T-16) an allow-listed email with no PRMS record gets a challenge row, the code email, and outcome sent', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'unknown@icrisat.org',
      } as OtpStartDto);

      expect(otpRows).toHaveLength(1);
      expect(emailNotification.sendEmail).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual({
        sent: true,
        session: expect.any(String),
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, requirements.md §15
    // OTP-R-32 modified) — the exact DTO handed to the PRMS mail pipeline.
    it('(T-16/OTP-R-32) sends the branded PRMS email carrying the code in both bodies', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);

      await service.startOtp({ email: 'A@Icrisat.ORG ' } as OtpStartDto);

      const code = codeFromLastEmail();
      expect(code).toMatch(/^\d{6}$/);
      expect(emailNotification.sendEmail).toHaveBeenCalledWith({
        from: {
          email: 'PRMS-No-reply@cgiar.org',
          name: 'PRMS Reporting Tool -',
        },
        emailBody: {
          subject: 'Your PRMS Reporting Tool sign-in code',
          to: ['a@icrisat.org'],
          cc: [],
          bcc: '',
          message: {
            text: expect.stringContaining(code),
            socketFile: expect.stringContaining(code),
          },
        },
      });
      // The HTML body is the branded one, not the plain-text alternative.
      const dto = (emailNotification.sendEmail as jest.Mock).mock.calls[0][0];
      expect(dto.emailBody.message.socketFile).toContain(
        'Email_PRMS_Header.png',
      );
      expect(dto.emailBody.message.socketFile).toContain(
        'The code expires in 5 minutes and can only be used once.',
      );
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) — the
    // session handed back is the SAME signed encoder the decoy uses, carrying the
    // challenge's own nonce and expiry: real and decoy sessions stay byte-shaped
    // alike, and only the presence of a row for the nonce tells them apart.
    it('(T-16) the real session is a verifiable decoy-encoded blob carrying the challenge nonce and expiry', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      const parsed = (service as any).verifyDecoySession(
        result.response.session,
        'a@icrisat.org',
      );
      expect(parsed.isDecoy).toBe(true);
      expect(parsed.expired).toBe(false);
      expect(parsed.nonce).toBe(otpRows[0].nonce);
      expect(parsed.exp).toBe(otpRows[0].expires_at.getTime());
      expect(result.response.session.length).toBeGreaterThanOrEqual(1400);
      expect(result.response.session.length).toBeLessThanOrEqual(1700);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, requirements.md §13
    // OTP-R-35) — a mail pipeline that will not take the message must NOT leak that
    // fact to the caller: neutral 200, outcome `email_failed` for the runbook.
    it('(OTP-R-35) a failing email still answers the neutral 200 and logs outcome email_failed', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest.spyOn(emailNotification, 'sendEmail').mockImplementation(() => {
        throw new Error('broker down');
      });
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual({
        sent: true,
        session: expect.any(String),
        destination: 'a***@icrisat.org',
      });
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'email_failed'"),
        ),
      ).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, OTP-R-36, OTP-AC-21) —
    // the decoy survives for `active = false`: a deactivated account gets no row and
    // no email, and its body must be indistinguishable from a real start.
    it('(OTP-R-36) an inactive PRMS user gets the decoy at start — no row, no email — with a body indistinguishable from a real one', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockOtpUser as any);

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

      // Only the active user's start created a challenge and sent a code.
      expect(otpRows).toHaveLength(1);
      expect(emailNotification.sendEmail).toHaveBeenCalledTimes(1);

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
      ).toEqual({
        isDecoy: true,
        expired: false,
        exp: expect.any(Number),
        nonce: expect.any(String),
      });
      // Byte-shape parity with the real one: same layout, same jitter class.
      expect(realResult.response.session).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(
        Math.abs(
          realResult.response.session.length -
            inactiveResult.response.session.length,
        ),
      ).toBeLessThanOrEqual(300);
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

    // @akili-spec changes/cognito-email-otp-login (design.md §13 item (l), runbook
    // "Known pre-PROD fixes" #1) — the residual statistic the Reviewer found after
    // the keyed mask landed: a canonical base64url encoder emits zero for the bits
    // that fall off the end of a segment whose byte length is not a multiple of 3.
    // hmac (32 B → 43 chars) leaves 2 unused bits, nonce (16 B → 22 chars) leaves 4,
    // exp (8 B → 11 chars) leaves 2 — so offsets 42/64/75 were confined to 16/4/16
    // alphabet values in EVERY decoy, a 3-offset charset test that a uniformly
    // random real session passes with p ≈ 1/256. Filling the unused bits with
    // randomness removes the classifier at zero cost: Node's decoder drops them,
    // so the authenticated bytes are untouched.
    const BASE64URL_ALPHABET =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    it('(§13 (l)) the trailing char of the hmac/nonce/exp segments is uniform over the base64url alphabet, not the 16/4/16-value subset canonical encoding leaves — 200 samples', () => {
      const samples: string[] = Array.from({ length: 200 }, () =>
        (service as any).buildDecoySession('sample@icrisat.org'),
      );
      const distinctAt = (i: number) => new Set(samples.map((s) => s[i])).size;

      // hmac tail, nonce tail, exp tail. 200 samples over a uniform 64-char
      // alphabet yield ~61 distinct values; 48 is a wide safety margin, while the
      // pre-fix values (16 / 4 / 16) are far below it.
      expect(distinctAt(42)).toBeGreaterThanOrEqual(48);
      expect(distinctAt(64)).toBeGreaterThanOrEqual(48);
      expect(distinctAt(75)).toBeGreaterThanOrEqual(48);

      // The Reviewer's claim stated exactly: canonical encoding forces those
      // alphabet indices to ≡ 0 (mod 4) / (mod 16) / (mod 4) in every decoy.
      const idx = (c: string) => BASE64URL_ALPHABET.indexOf(c);
      expect(samples.some((s) => idx(s[42]) % 4 !== 0)).toBe(true);
      expect(samples.some((s) => idx(s[64]) % 16 !== 0)).toBe(true);
      expect(samples.some((s) => idx(s[75]) % 4 !== 0)).toBe(true);

      // …and the randomised bits stay decoder-invisible: every sample still
      // verifies as an unexpired decoy for its email.
      samples.slice(0, 25).forEach((s) => {
        expect(
          (service as any).verifyDecoySession(s, 'sample@icrisat.org'),
        ).toEqual({
          isDecoy: true,
          expired: false,
          exp: expect.any(Number),
          nonce: expect.any(String),
        });
      });
    });

    it('(§13 (l)) randomised trailing bits do not weaken the decoy: meaningful-bit tampering at any segment offset still fails the HMAC', () => {
      const email = 'sample@icrisat.org';
      const decoy = (service as any).buildDecoySession(email);
      const swap = (s: string, i: number, newIdx: number) =>
        s.slice(0, i) + BASE64URL_ALPHABET[newIdx] + s.slice(i + 1);
      const idx = (s: string, i: number) => BASE64URL_ALPHABET.indexOf(s[i]);

      // Shifting an alphabet index by 4 changes a bit that IS part of the
      // authenticated bytes at every one of these offsets.
      [0, 21, 42, 43, 64, 65, 75].forEach((i) => {
        const tampered = swap(decoy, i, (idx(decoy, i) + 4) % 64);
        expect(
          (service as any).verifyDecoySession(tampered, email).isDecoy,
        ).toBe(false);
      });

      // The nonce and exp tails are authenticated even in their unused bits: the
      // HMAC is taken over the segments exactly as emitted, so re-rolling only
      // the low bits there still fails the check.
      [
        [64, 15],
        [75, 3],
      ].forEach(([i, mask]) => {
        const reRolled = swap(
          decoy,
          i,
          (idx(decoy, i) & ~mask) | ((idx(decoy, i) + 1) & mask),
        );
        expect(
          (service as any).verifyDecoySession(reRolled, email).isDecoy,
        ).toBe(false);
      });

      // Only the hmac segment's own 2 unused bits are outside the authenticated
      // bytes — verify compares the DECODED 32-byte digest, which the decoder
      // yields identically whatever those bits hold. Re-rolling them is therefore
      // a semantic no-op, and forges nothing: it takes a valid decoy as input and
      // produces another encoding of the same digest.
      const reRolledHmacTail = swap(
        decoy,
        42,
        (idx(decoy, 42) & ~3) | ((idx(decoy, 42) + 1) & 3),
      );
      expect(reRolledHmacTail).not.toBe(decoy);
      expect(
        (service as any).verifyDecoySession(reRolledHmacTail, email),
      ).toEqual((service as any).verifyDecoySession(decoy, email));
    });

    it('(§13 (l)) exp still round-trips, expires, and survives rotation verbatim with randomised trailing bits', () => {
      const email = 'sample@icrisat.org';
      const exp = Date.now() + 4 * 60 * 1000;

      const original = (service as any).buildDecoySession(email, exp);
      expect((service as any).verifyDecoySession(original, email)).toEqual({
        isDecoy: true,
        expired: false,
        exp,
        nonce: original.slice(43, 65),
      });

      const rotated = (service as any).buildDecoySession(email, exp);
      expect(rotated).not.toBe(original);
      expect((service as any).verifyDecoySession(rotated, email).exp).toBe(exp);

      const stale = (service as any).buildDecoySession(email, Date.now() - 1);
      const staleCheck = (service as any).verifyDecoySession(stale, email);
      expect(staleCheck.isDecoy).toBe(true);
      expect(staleCheck.expired).toBe(true);
    });

    // @akili-spec changes/cognito-email-otp-login (design.md §13 item (l)) — the
    // second half of the residual: `computeOtpExpMask` and `computeOtpDecoyHmac`
    // both key off `_otpDecoyKey` with no domain-separation tag, so "no input of
    // one can ever be an input of the other" rested on the `|` separator never
    // appearing in a base64url nonce — an argument about the encoding, not about
    // the construction. A distinct tag prefix per derivation makes it structural.
    it('(§13 (l)) the exp-mask and decoy-auth HMACs are domain-separated under the shared _otpDecoyKey', () => {
      const key = Buffer.from('test-secret'); // process.env.JWT_SKEY, set in beforeEach
      const email = 'sample@icrisat.org';
      const decoy = (service as any).buildDecoySession(email);
      const nonce = decoy.slice(43, 65);
      const expStr = decoy.slice(65, 76);

      const mask: Buffer = (service as any).computeOtpExpMask(nonce);
      expect(
        mask.equals(
          createHmac('sha256', key)
            .update(`otp-decoy-mask\0${nonce}`)
            .digest()
            .subarray(0, 8),
        ),
      ).toBe(true);
      // …and NOT the untagged derivation the Reviewer flagged.
      expect(
        mask.equals(
          createHmac('sha256', key).update(nonce).digest().subarray(0, 8),
        ),
      ).toBe(false);

      const authDigest: Buffer = (service as any).computeOtpDecoyHmac(
        email,
        nonce,
        expStr,
      );
      expect(
        authDigest.equals(
          createHmac('sha256', key)
            .update(`otp-decoy-auth\0${email}|${nonce}|${expStr}`)
            .digest(),
        ),
      ).toBe(true);
      expect(
        authDigest.equals(
          createHmac('sha256', key)
            .update(`${email}|${nonce}|${expStr}`)
            .digest(),
        ),
      ).toBe(false);
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
          OtpChallengeService,
          {
            provide: getRepositoryToken(OtpChallenge),
            useValue: otpRepositoryMock,
          },
          {
            provide: EmailNotificationManagementService,
            useValue: { sendEmail: jest.fn() },
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
      ).toEqual({
        isDecoy: true,
        expired: false,
        exp: expect.any(Number),
        nonce: expect.any(String),
      });

      if (original === undefined) {
        delete process.env.JWT_SKEY;
      } else {
        process.env.JWT_SKEY = original;
      }
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16) — REPLACES the T-5/T-15
    // "(g)/(p) microservice call fails / reply has no session" pair: there is no
    // microservice on this path any more. The remaining way `start` can fail is the
    // challenge write, and it keeps the same neutral 503 the client already handles.
    it('(g) returns 503 OTP_UPSTREAM_UNAVAILABLE and logs internal_error when the challenge cannot be stored', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(otpChallengeService, 'create')
        .mockRejectedValue(new Error('db down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response).toEqual({
        valid: false,
        code: 'OTP_UPSTREAM_UNAVAILABLE',
      });
      expect(emailNotification.sendEmail).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
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
      expect(otpRepositoryMock.save).not.toHaveBeenCalled();
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
      expect(otpRepositoryMock.save).not.toHaveBeenCalled();
      expect(emailNotification.sendEmail).not.toHaveBeenCalled();
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1,
  // requirements.md §15 OTP-R-37/OTP-R-38) — REPLACES every `verifyOtp` describe
  // that mocked `AuthMicroserviceService`. There is no Cognito call on this path
  // any more: each test drives a REAL `start` (real challenge row, real HMACs,
  // real session encoder) and reads the code back out of the email exactly as the
  // user reads it, then verifies against that.
  describe('verifyOtp (PRMS-owned challenge)', () => {
    /** Runs a real `start` and returns what the user ends up holding. */
    const startFor = async (
      email: string,
    ): Promise<{ session: string; code: string }> => {
      const started = await service.startOtp({ email } as OtpStartDto);
      return {
        session: started.response.session as string,
        code: codeFromLastEmail(),
      };
    };

    beforeEach(() => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockOtpUser as any);
    });

    it('(OTP-R-38) the right code consumes the challenge, provisions through the provider path and returns a session with NO Cognito tokens', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const expected = (service as any).createSuccessfulLoginResponse(
        mockOtpUser,
        null,
      );

      const result = await service.verifyOtp({
        email: 'A@ICRISAT.ORG',
        code,
        session,
      } as OtpVerifyDto);

      expect(result).toEqual(expected);
      expect(result.response.valid).toBe(true);
      expect(result.response.token).toBe(mockJwtToken);
      // OTP-R-38 — no `auth_tokens` for a center session; nothing downstream reads it.
      expect(result.response).not.toHaveProperty('auth_tokens');
      // The challenge is spent.
      expect(otpRows[0].consumed_at).toEqual(expect.any(Date));
      // Provisioning runs with the request email only — no names exist on this path.
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).toHaveBeenCalledWith({ email: 'a@icrisat.org' });
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: mockOtpUser.id, email: mockOtpUser.email },
        { last_login: expect.any(Date) },
      );
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'ok'"),
        ),
      ).toBe(true);
    });

    it('(OTP-AC-20) an email with no PRMS record is provisioned on first success and logged as provisioned', async () => {
      const { session, code } = await startFor('new@icrisat.org');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
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

      const result = await service.verifyOtp({
        email: 'new@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result).toEqual(
        (service as any).createSuccessfulLoginResponse(provisionedUser, null),
      );
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'provisioned'"),
        ),
      ).toBe(true);
    });

    it('a user without roles gets 403 needsRoles on the OTP path exactly as singIn', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      const userWithoutRoles = { ...mockOtpUser, obj_role_by_user: [] };
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(userWithoutRoles as any);

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.FORBIDDEN);
      expect(result.response.needsRoles).toBe(true);
    });

    it('a wrong code counts an attempt and returns a rotated session carrying the SAME nonce and expiry', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      const nonce = otpRows[0].nonce;
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: code === '000000' ? '111111' : '000000',
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_CODE_MISMATCH');
      expect(result.message).toBe('Code incorrect. Try again.');
      expect(otpRows[0].attempts).toBe(1);
      expect(otpRows[0].consumed_at).toBeNull();

      const rotated = (service as any).verifyDecoySession(
        result.response.session,
        'a@icrisat.org',
      );
      expect(result.response.session).not.toBe(session);
      expect(rotated.isDecoy).toBe(true);
      expect(rotated.nonce).toBe(nonce);
      expect(rotated.exp).toBe(otpRows[0].expires_at.getTime());
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'mismatch'"),
        ),
      ).toBe(true);
    });

    it('the rotated session still verifies the right code — two misses then the right code signs in', async () => {
      const started = await startFor('a@icrisat.org');
      const { code } = started;
      let { session } = started;

      for (let i = 0; i < 2; i++) {
        const miss = await service.verifyOtp({
          email: 'a@icrisat.org',
          code: '000000' === code ? '111111' : '000000',
          session,
        } as OtpVerifyDto);
        expect(miss.response.code).toBe('OTP_CODE_MISMATCH');
        session = miss.response.session;
      }

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.response.valid).toBe(true);
      expect(otpRows[0].attempts).toBe(2);
      expect(otpRows[0].consumed_at).toEqual(expect.any(Date));
      // One code, one email — a retry never re-sends (OTP-R-32 scenario).
      expect(emailNotification.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('(OTP-AC-22) the third wrong code answers OTP_ATTEMPTS_EXCEEDED', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      const wrong = code === '000000' ? '111111' : '000000';
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const first = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: wrong,
        session,
      } as OtpVerifyDto);
      const second = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: wrong,
        session: first.response.session,
      } as OtpVerifyDto);
      const third = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: wrong,
        session: second.response.session,
      } as OtpVerifyDto);

      expect(first.response.code).toBe('OTP_CODE_MISMATCH');
      expect(second.response.code).toBe('OTP_CODE_MISMATCH');
      expect(third.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(third.response.code).toBe('OTP_ATTEMPTS_EXCEEDED');
      expect(third.message).toBe('Too many attempts — request a new code.');
      expect(otpRows[0].attempts).toBe(3);
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'attempts_exceeded'"),
        ),
      ).toBe(true);
    });

    it('an exhausted challenge keeps answering OTP_ATTEMPTS_EXCEEDED, even for the right code', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      otpRows[0].attempts = 3;

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.response.code).toBe('OTP_ATTEMPTS_EXCEEDED');
      expect(otpRows[0].consumed_at).toBeNull();
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).not.toHaveBeenCalled();
    });

    it('(OTP-T-16 review) a real challenge past its TTL answers OTP_NOT_AUTHORIZED — the envelope expiry check covers it, never reaching the row', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const { session, code } = await startFor('a@icrisat.org');
      jest.setSystemTime(new Date('2026-01-01T00:10:00.000Z')); // +10min > 5min TTL
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(otpRepositoryMock.findOne).not.toHaveBeenCalled();
      expect(otpRows[0].consumed_at).toBeNull();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);

      jest.useRealTimers();
    });

    it('(OTP-R-37 concurrency, reviewer RISK) two concurrent right-code verifies — only one mints a session, the other is not authorized', async () => {
      const { session, code } = await startFor('a@icrisat.org');

      const [first, second] = await Promise.all([
        service.verifyOtp({
          email: 'a@icrisat.org',
          code,
          session,
        } as OtpVerifyDto),
        service.verifyOtp({
          email: 'a@icrisat.org',
          code,
          session,
        } as OtpVerifyDto),
      ]);

      const outcomes = [first, second].map((r) => r.response.code ?? 'OK');
      expect(outcomes.filter((c) => c === 'OK')).toHaveLength(1);
      expect(outcomes.filter((c) => c === 'OTP_NOT_AUTHORIZED')).toHaveLength(
        1,
      );
      expect(otpRows[0].consumed_at).toEqual(expect.any(Date));
    });

    it('(OTP-R-37 concurrency, reviewer RISK) two concurrent wrong codes with one miss left before the ceiling — both are exceeded, and attempts is capped at 3 instead of overshooting to 4', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      const wrong = code === '000000' ? '111111' : '000000';
      otpRows[0].attempts = 2; // one miss left before OTP_CHALLENGE_MAX_ATTEMPTS

      const [first, second] = await Promise.all([
        service.verifyOtp({
          email: 'a@icrisat.org',
          code: wrong,
          session,
        } as OtpVerifyDto),
        service.verifyOtp({
          email: 'a@icrisat.org',
          code: wrong,
          session,
        } as OtpVerifyDto),
      ]);

      expect(first.response.code).toBe('OTP_ATTEMPTS_EXCEEDED');
      expect(second.response.code).toBe('OTP_ATTEMPTS_EXCEEDED');
      // The conditional increment (`attempts < 3`) lets at most one of the two
      // concurrent misses actually write — the un-guarded `increment(...)` this
      // replaces would have let both through and left `attempts` at 4.
      expect(otpRows[0].attempts).toBe(3);
    });

    it('(OTP-R-37) a code works exactly once — replaying it answers OTP_NOT_AUTHORIZED', async () => {
      const { session, code } = await startFor('a@icrisat.org');

      const first = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);
      const logSpy = jest.spyOn((service as any)._logger, 'log');
      const replay = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(first.response.valid).toBe(true);
      expect(replay.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(replay.response).toEqual({
        valid: false,
        code: 'OTP_NOT_AUTHORIZED',
      });
      expect(replay.message).toBe('Code incorrect or expired.');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'consumed'"),
        ),
      ).toBe(true);
    });

    it('a decoy session (no challenge row) answers OTP_CODE_MISMATCH with a rotated decoy — same nonce, same exp', async () => {
      const decoy = (service as any).buildDecoySession('inactive@icrisat.org');
      const originalCheck = (service as any).verifyDecoySession(
        decoy,
        'inactive@icrisat.org',
      );
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'inactive@icrisat.org',
        code: '123456',
        session: decoy,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_CODE_MISMATCH');
      expect(userRepository.findOne).not.toHaveBeenCalled();

      const rotatedCheck = (service as any).verifyDecoySession(
        result.response.session,
        'inactive@icrisat.org',
      );
      expect(result.response.session).not.toBe(decoy);
      expect(rotatedCheck.isDecoy).toBe(true);
      expect(rotatedCheck.expired).toBe(false);
      expect(rotatedCheck.exp).toBe(originalCheck.exp);
      // @akili-spec changes/cognito-email-otp-login (OTP-T-16) — the nonce must be
      // carried over here too. A real mismatch MUST rotate the same nonce (the row
      // is keyed by it), so a decoy that rolled a fresh one would let an attacker
      // compare chars 43..65 across two rotations and classify the address.
      expect(rotatedCheck.nonce).toBe(originalCheck.nonce);
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'mismatch'"),
        ),
      ).toBe(true);
    });

    it('a session PRMS never issued (fails the HMAC) answers OTP_NOT_AUTHORIZED and touches nothing', async () => {
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: 'not-a-real-session-and-too-short-to-be-a-decoy',
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(otpRepositoryMock.findOne).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);
    });

    it('a forged blob of the right length but a non-matching HMAC is not a session either', async () => {
      const decoy = (service as any).buildDecoySession('a@icrisat.org');
      const forged = (decoy[0] === 'A' ? 'B' : 'A') + decoy.slice(1);

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '123456',
        session: forged,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
      expect(otpRepositoryMock.findOne).not.toHaveBeenCalled();
    });

    it('(o) an expired session answers OTP_NOT_AUTHORIZED without a challenge lookup', async () => {
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
      expect(otpRepositoryMock.findOne).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);

      jest.useRealTimers();
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-R-36, OTP-AC-21) — an account
    // deactivated AFTER its code was issued must not sign in. The gate sits on the
    // match branch, since an already-inactive account never gets a row at all.
    it('(OTP-R-36) an account deactivated after the code was issued gets OTP_NOT_AUTHORIZED on the right code', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockInactiveOtpUser as any);
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response).toEqual({
        valid: false,
        code: 'OTP_NOT_AUTHORIZED',
      });
      expect(
        userService.createOrUpdateUserFromAuthProvider,
      ).not.toHaveBeenCalled();
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'not_authorized'"),
        ),
      ).toBe(true);
    });

    it('maps the "User is inactive" throw from createOrUpdateUserFromAuthProvider to OTP_NOT_AUTHORIZED', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockRejectedValue(
          new Error(
            'Failed to create or update user: User is inactive. Please contact support.',
          ),
        );

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(result.response.code).toBe('OTP_NOT_AUTHORIZED');
    });

    it('logs internal_error (still 503 neutral) when the challenge lookup throws', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      jest
        .spyOn(otpChallengeService, 'findActive')
        .mockRejectedValue(new Error('db down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
        ),
      ).toBe(true);
    });

    it('logs internal_error (still 503 neutral) when the user lookup throws on verify', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('db down'));
      const logSpy = jest.spyOn((service as any)._logger, 'log');

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
      expect(
        logSpy.mock.calls.some((call) =>
          String(call[0]).includes("outcome: 'internal_error'"),
        ),
      ).toBe(true);
    });

    it('answers the neutral 503 when provisioning fails for an unexpected reason', async () => {
      const { session, code } = await startFor('a@icrisat.org');
      jest
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockRejectedValue(new Error('boom'));

      const result = await service.verifyOtp({
        email: 'a@icrisat.org',
        code,
        session,
      } as OtpVerifyDto);

      expect(result.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(result.response.code).toBe('OTP_UPSTREAM_UNAVAILABLE');
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2, OTP-T-16) — the
  // anti-oracle invariant survives the move off Cognito: a mismatch on a REAL
  // challenge and a mismatch on a decoy must be indistinguishable byte-for-byte in
  // shape (same keys, same copy, same status, same session-length class).
  describe('verifyOtp — real vs decoy mismatch parity', () => {
    it('both mismatch bodies carry identical key sets, copy and status', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);

      const started = await service.startOtp({
        email: 'a@icrisat.org',
      } as OtpStartDto);
      const realResult = await service.verifyOtp({
        email: 'a@icrisat.org',
        code: '000000' === codeFromLastEmail() ? '111111' : '000000',
        session: started.response.session,
      } as OtpVerifyDto);

      const decoy = (service as any).buildDecoySession('inactive@icrisat.org');
      const decoyResult = await service.verifyOtp({
        email: 'inactive@icrisat.org',
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
      expect(realResult.response.session).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decoyResult.response.session).toMatch(/^[A-Za-z0-9_-]+$/);
      [realResult, decoyResult].forEach((r) => {
        expect(r.response.session.length).toBeGreaterThanOrEqual(1400);
        expect(r.response.session.length).toBeLessThanOrEqual(1700);
      });
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-13/OTP-T-16) — `mapOtpVerifyError`
  // is now only the catch-all for an unexpected throw inside `verifyOtp`; its
  // code-specific branches are retained (and pinned here) because the copy they own
  // is the copy the PRMS-owned branches above emit.
  describe('mapOtpVerifyError', () => {
    it.each([
      ['CODE_EXPIRED', 'OTP_CODE_EXPIRED', 'expired', HttpStatus.UNAUTHORIZED],
      [
        'ATTEMPTS_EXCEEDED',
        'OTP_ATTEMPTS_EXCEEDED',
        'attempts_exceeded',
        HttpStatus.UNAUTHORIZED,
      ],
      [
        'NOT_AUTHORIZED',
        'OTP_NOT_AUTHORIZED',
        'not_authorized',
        HttpStatus.UNAUTHORIZED,
      ],
      [
        'CHALLENGE_NOT_SUPPORTED',
        'OTP_NOT_AUTHORIZED',
        'not_authorized',
        HttpStatus.UNAUTHORIZED,
      ],
      [
        'ANYTHING_ELSE',
        'OTP_UPSTREAM_UNAVAILABLE',
        'upstream_error',
        HttpStatus.SERVICE_UNAVAILABLE,
      ],
    ])('maps %s to %s', (msCode, expectedCode, outcome, status) => {
      expect(
        (service as any).mapOtpVerifyError({ response: { code: msCode } }),
      ).toEqual(
        expect.objectContaining({ code: expectedCode, outcome, status }),
      );
    });

    it('maps a bare Error (no response code) to the neutral upstream-unavailable answer', () => {
      expect((service as any).mapOtpVerifyError(new Error('boom'))).toEqual(
        expect.objectContaining({
          code: 'OTP_UPSTREAM_UNAVAILABLE',
          outcome: 'upstream_error',
          status: HttpStatus.SERVICE_UNAVAILABLE,
        }),
      );
    });
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-5/OTP-T-16, OTP-R-11, .cursorrules)
  describe('start/verifyOtp — no secrets in logs', () => {
    it('never logs the full email, the code or a session across start/verify', async () => {
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
        .spyOn(userService, 'createOrUpdateUserFromAuthProvider')
        .mockResolvedValue(mockOtpUser as any);

      const email = 'a@icrisat.org';
      const started = await service.startOtp({ email } as OtpStartDto);
      const session = started.response.session as string;
      const code = codeFromLastEmail();
      const decoy = (service as any).buildDecoySession('unknown@icrisat.org');

      const missed = await service.verifyOtp({
        email,
        code: code === '000000' ? '111111' : '000000',
        session,
      } as OtpVerifyDto);
      await service.verifyOtp({
        email,
        code,
        session: missed.response.session,
      } as OtpVerifyDto);
      await service.verifyOtp({
        email: 'unknown@icrisat.org',
        code,
        session: decoy,
      } as OtpVerifyDto);

      // Guards against a vacuous pass if the OTP path ever stopped logging at all.
      expect(logSpy).toHaveBeenCalled();

      const calls = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ].flat();

      calls.forEach((arg) => {
        const text = String(arg);
        expect(text).not.toContain(email);
        expect(text).not.toContain(code);
        expect(text).not.toContain(session);
        expect(text).not.toContain(decoy);
        expect(text).not.toContain(otpRows[0].nonce);
        expect(text).not.toContain(otpRows[0].code_hmac);
        expect(text).not.toContain(otpRows[0].email_hash);
      });
    });

    it('never stores the plaintext email or code in the challenge row (OTP-R-11)', async () => {
      jest
        .spyOn(globalParameterCacheService, 'getParam')
        .mockResolvedValue('icrisat.org');
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockOtpUser as any);

      await service.startOtp({ email: 'a@icrisat.org' } as OtpStartDto);
      const code = codeFromLastEmail();

      const stored = JSON.stringify(otpRows[0]);
      expect(stored).not.toContain('a@icrisat.org');
      expect(stored).not.toContain('icrisat.org');
      expect(stored).not.toContain(code);
    });
  });
});
