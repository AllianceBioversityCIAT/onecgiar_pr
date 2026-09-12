import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { env } from 'process';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { HandlersError } from '../shared/handlers/error.utils';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import Pusher from 'pusher';
import { AuthMicroserviceService } from '../shared/microservices/auth-microservice/auth-microservice.service';
import { AuthCodeValidationDto } from './dto/auth-code-validation.dto';
import { CompletePasswordChallengeDto } from './dto/complete-password-challenge.dto';
import { GlobalParameterCacheService } from '../shared/services/cache/global-parameter-cache.service';
import { OtpStartDto } from './dto/otp-start.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { returnFormatService } from '../shared/extendsGlobalDTO/returnServices.dto';
import {
  normaliseOtpEmail,
  extractOtpDomain,
  logOtpEvent,
} from './utils/otp-shared.util';

// @akili-spec changes/cognito-email-otp-login (OTP-T-4, OTP-R-9)
export const OTP_ALLOWED_EMAIL_DOMAINS_PARAM = 'OTP_ALLOWED_EMAIL_DOMAINS';

// @akili-spec changes/cognito-email-otp-login (OTP-T-4 review pointer 1) — local TTL
// on top of GlobalParameterCacheService's own (unbounded) cache.
const OTP_DOMAINS_CACHE_TTL_MS = 60_000;

// @akili-spec changes/cognito-email-otp-login (OTP-T-5, design.md §4.1, OTP-DD-3)
// Neutral copy — never reveals account existence.
const OTP_NEUTRAL_SENT_MESSAGE =
  'If this account exists, a code has been sent.';
const OTP_DOMAIN_NOT_ALLOWED_MESSAGE =
  'That email domain is not enabled for this option — use your CGIAR account or the external-user option, or contact PRMSTechSupport@cgiar.org';
const OTP_UPSTREAM_UNAVAILABLE_MESSAGE =
  'We could not reach the sign-in service. Try again in a minute or contact support.';
const OTP_NOT_AUTHORIZED_MESSAGE = 'Code incorrect or expired.';
const OTP_CODE_MISMATCH_MESSAGE = 'Code incorrect. Try again.';
const OTP_CODE_EXPIRED_MESSAGE = 'Code expired — request a new one.';
const OTP_ATTEMPTS_EXCEEDED_MESSAGE = 'Too many attempts — request a new code.';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3,
// design.md §4.1 Response row + judgment lens-B advisory (a)) — the decoy is
// prefix-free (no more `otp:`, which was itself an existence oracle: its mere
// presence told an attacker "unknown user" without even checking the HMAC).
// Fixed layout: hmac(43) ‖ nonce(22) ‖ exp(13 digits) ‖ filler, base64url charset
// only, total length jittered uniformly in [1400, 1700] (a real Cognito session
// measured 1,543 chars on the 2026-09-11 spike).
const OTP_DECOY_HMAC_LEN = 43; // base64url(HMAC-SHA256), no padding
const OTP_DECOY_NONCE_LEN = 22; // base64url(16 random bytes), no padding
const OTP_DECOY_EXP_LEN = 13; // epoch ms, zero-padded — good until year 2286
const OTP_DECOY_FIXED_LEN =
  OTP_DECOY_HMAC_LEN + OTP_DECOY_NONCE_LEN + OTP_DECOY_EXP_LEN; // 78
const OTP_DECOY_MIN_TOTAL_LEN = 1400;
const OTP_DECOY_MAX_TOTAL_LEN = 1700;
const OTP_DECOY_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly _logger: Logger = new Logger(AuthService.name);
  private readonly pusher: Pusher;
  // @akili-spec changes/cognito-email-otp-login (OTP-T-4 review pointer 1)
  private _otpAllowedDomainsLastClearedAt = 0;
  // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3)
  // Read once at construction so the decoy HMAC key is never `''` — the review's
  // finding was that `env.JWT_SKEY ?? ''` makes the decoy forgeable when
  // JWT_SKEY is unset. Falling back to a per-process random key keeps the decoy
  // unforgeable even then (two decoys for the same email still differ only by
  // nonce/exp/filler, never by which process minted them being guessable).
  private readonly _otpDecoyKey: Buffer;

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _userService: UserService,
    private readonly _userRepository: UserRepository,
    private readonly _handlersError: HandlersError,
    private readonly _authMicroservice: AuthMicroserviceService,
    private readonly _globalParameterCacheService: GlobalParameterCacheService,
  ) {
    this.pusher = new Pusher({
      appId: `${env.PUSHER_APP_ID}`,
      key: `${env.PUSHER_API_KEY}`,
      secret: `${env.PUSHER_API_SECRET}`,
      cluster: `${env.PUSHER_APP_CLUSTER}`,
      useTLS: true,
    });
    this._otpDecoyKey = env.JWT_SKEY
      ? Buffer.from(env.JWT_SKEY)
      : randomBytes(32);
  }

  async pusherAuth(
    pusherAuthDot: PusherAuthDot,
    resultId: number,
    userId: number,
  ) {
    try {
      const uPusher = await this._userRepository.userDataPusher(
        userId,
        resultId,
      );

      const today = new Date();
      const roles = uPusher.aplication_role;
      const initiativeRoles = uPusher?.initiative_role ? '1' : null;
      const socketId = pusherAuthDot.socket_id;
      const channel = pusherAuthDot.channel_name;
      const name = `${uPusher.first_name} ${uPusher.last_name}`;

      const presenceData = {
        user_id: `${uPusher.user_id}`,
        user_info: { name, roles, initiativeRoles, today },
      };

      const auth = this.pusher.authenticate(socketId, channel, presenceData);

      return {
        auth,
      };
    } catch (error) {
      return error;
    }
  }

  /**
   * Sign In
   * @param userLogin
   * @returns JWT token and user information OR password challenge
   * @description This method handles the sign-in process for users with automatic user creation if needed.
   * Also handles NEW_PASSWORD_REQUIRED challenge for first-time logins.
   */
  async singIn(userLogin: UserLoginDto): Promise<any> {
    try {
      if (!(userLogin.email && userLogin.password)) {
        throw {
          message: 'Missing required fields: email or password.',
          response: {
            valid: false,
          },
          status: HttpStatus.BAD_REQUEST,
        };
      }

      userLogin.email = userLogin.email.trim().toLowerCase();

      try {
        const existingUser = await this._userRepository.findOne({
          where: {
            email: userLogin.email,
            active: true,
          },
          relations: ['obj_role_by_user'],
        });

        let userMetadata = null;
        if (existingUser) {
          userMetadata = {
            firstName: existingUser.first_name,
            lastName: existingUser.last_name,
            email: existingUser.email,
          };
          this._logger.log(
            `User found locally: ${userLogin.email}. Sending metadata to auth microservice.`,
          );
        } else if (existingUser.active === false) {
          this._logger.log(
            `User found locally but inactive: ${userLogin.email}. Cannot proceed.`,
          );
          return {
            message:
              'User found but inactive. Please contact the support team.',
            status: HttpStatus.FORBIDDEN,
            response: {
              valid: false,
            },
          };
        } else {
          this._logger.log(
            `User not found locally: ${userLogin.email}. Cannot proceed without local user record.`,
          );
          return {
            message:
              'User not found in local database. Please contact the support team.',
            status: HttpStatus.NOT_FOUND,
            response: {
              valid: false,
            },
          };
        }

        const authResponse =
          await this._authMicroservice.authenticateWithCustomCredentials(
            userLogin.email,
            userLogin.password,
            userMetadata,
          );

        if (authResponse?.challengeName === 'NEW_PASSWORD_REQUIRED') {
          this._logger.log(
            `User ${userLogin.email} needs to set a new password (first login)`,
          );

          return {
            message: 'Password change required. Please set a new password.',
            response: {
              valid: false,
              challengeRequired: true,
              challengeName: 'NEW_PASSWORD_REQUIRED',
              session: authResponse.session,
              userAttributes: authResponse.userAttributes,
              userId: authResponse.userId,

              localUser: {
                id: existingUser.id,
                email: existingUser.email,
                firstName: existingUser.first_name,
                lastName: existingUser.last_name,
              },
            },
            status: HttpStatus.ACCEPTED,
          };
        }

        if (!authResponse.tokens) {
          throw new Error(
            'Invalid authentication response from Auth Microservice',
          );
        }

        await this._userRepository.updateLastLoginUserByEmail(userLogin.email);
        this._logger.log(`Updated last login for user: ${userLogin.email}`);

        return this.createSuccessfulLoginResponse(
          existingUser,
          authResponse.tokens,
        );
      } catch (error) {
        this._logger.error(
          `Authentication error for ${userLogin.email}: ${error.message}`,
          error.stack,
        );

        if (error.response?.data?.challengeName === 'NEW_PASSWORD_REQUIRED') {
          return {
            message: 'Password change required',
            response: {
              valid: false,
              challengeRequired: true,
              challengeName: 'NEW_PASSWORD_REQUIRED',
              session: error.response.data.session,
              userAttributes: error.response.data.userAttributes,
            },
            status: HttpStatus.ACCEPTED,
          };
        }

        if (error.status === HttpStatus.UNAUTHORIZED) {
          return {
            response: {
              valid: false,
            },
            message: error.message ?? 'Invalid credentials',
            status: HttpStatus.UNAUTHORIZED,
          };
        }

        return {
          response: {
            valid: false,
          },
          message: error.message ?? 'Authentication failed',
          status: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }
    } catch (error) {
      this._logger.error(
        `Unexpected error in singIn: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Returns the set of allowed redirect URIs read from ALLOWED_REDIRECT_URIS
   * (comma-separated). An empty set means the feature is unconfigured — the
   * external auth microservice will use its own default redirect URI.
   */
  private getAllowedRedirectUris(): Set<string> {
    const raw = process.env.ALLOWED_REDIRECT_URIS ?? '';
    return new Set(
      raw
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
    );
  }

  /**
   * Validates redirectUri against the configured allowlist.
   * Throws 400 when the URI is present but not in the list.
   * No-ops when redirectUri is absent or the allowlist is empty.
   */
  private validateRedirectUri(redirectUri?: string): void {
    if (!redirectUri) return;

    const allowed = this.getAllowedRedirectUris();
    if (allowed.size === 0) return;

    if (!allowed.has(redirectUri)) {
      throw {
        message: `Redirect URI not allowed: ${redirectUri}`,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  /**
   * Get Auth URL
   * @param provider
   * @param redirectUri Optional redirect URI (must be in the ALLOWED_REDIRECT_URIS allowlist)
   * @returns Authentication URL for the specified provider
   * @description This method generates an authentication URL for the specified OAuth provider.
   */
  async getAuthURL(provider: string, redirectUri?: string): Promise<any> {
    try {
      this._logger.log(`Getting authentication URL for provider: ${provider}`);

      this.validateRedirectUri(redirectUri);

      const response = await this._authMicroservice.getAuthenticationUrl(
        provider,
        redirectUri,
      );

      return {
        message: 'Authentication URL generated successfully',
        response: response,
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(
        `Error getting authentication URL: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Center path (email OTP) allow-list
   * @description Reads `OTP_ALLOWED_EMAIL_DOMAINS` through the existing
   * `GlobalParameterCacheService.getParam()` — no bespoke cache. Splits on `,`,
   * trims, lower-cases, and drops empty entries and any leading `@` (OTP-R-9, OTP-DD-5).
   */
  async getOtpAllowedDomains(): Promise<string[]> {
    // OTP-T-4 review pointer 1: force a re-fetch when the last clear is
    // more than 60s old, so an admin's edit is picked up without a restart.
    const now = Date.now();
    if (now - this._otpAllowedDomainsLastClearedAt > OTP_DOMAINS_CACHE_TTL_MS) {
      this._globalParameterCacheService.clearCacheByKey(
        OTP_ALLOWED_EMAIL_DOMAINS_PARAM,
      );
      this._otpAllowedDomainsLastClearedAt = now;
    }

    const rawValue = await this._globalParameterCacheService.getParam(
      OTP_ALLOWED_EMAIL_DOMAINS_PARAM,
    );

    if (!rawValue) {
      return [];
    }

    const domains = String(rawValue)
      .split(',')
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
      // OTP-T-4 review pointer 2: an entry still carrying '@' after
      // stripping one leading '@' is malformed — drop it.
      .filter((domain) => domain.length > 0 && !domain.includes('@'));

    // OTP-T-4 review pointer 3: de-duplicate.
    return [...new Set(domains)];
  }

  /**
   * GET auth/login/otp/config
   * @description Public, read-only config for the Center (email OTP) login path;
   * the allow-list stays empty until an admin sets the global parameter (OTP-R-9).
   */
  async getOtpConfig(): Promise<returnFormatService> {
    try {
      const domains = await this.getOtpAllowedDomains();

      return {
        message: 'OTP allow-list retrieved successfully',
        response: { domains },
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(
        `Error getting OTP allow-list: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * POST auth/login/otp/start
   * @description Starts the Center (email OTP) sign-in challenge. Rate limiting is
   * enforced upstream by `OtpThrottlerGuard` (before this method ever runs), so
   * limits behave identically for known and unknown emails (OTP-R-3, OTP-R-6).
   * Never creates users; never logs the code, session or full email (OTP-R-11).
   */
  async startOtp(dto: OtpStartDto): Promise<returnFormatService> {
    const startedAt = Date.now();
    const email = normaliseOtpEmail(dto.email);
    const domain = extractOtpDomain(email);

    // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, lens-A advisory)
    // PRMS-side failures (allow-list read, findOne) log `internal_error`, never
    // `upstream_error` — the runbook must not blame the microservice for a local
    // DB/cache fault. The HTTP response stays the same neutral 503 either way.
    let allowedDomains: string[];
    try {
      allowedDomains = await this.getOtpAllowedDomains();
    } catch {
      logOtpEvent(this._logger, 'start', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    if (!allowedDomains.includes(domain)) {
      logOtpEvent(this._logger, 'start', domain, 'denied_domain', startedAt);
      return {
        response: { valid: false, code: 'OTP_DOMAIN_NOT_ALLOWED' },
        message: OTP_DOMAIN_NOT_ALLOWED_MESSAGE,
        status: HttpStatus.BAD_REQUEST,
      };
    }

    let existingUser: any;
    try {
      existingUser = await this._userRepository.findOne({
        where: { email, active: true },
        relations: ['obj_role_by_user'],
      });
    } catch {
      logOtpEvent(this._logger, 'start', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    if (!existingUser) {
      logOtpEvent(this._logger, 'start', domain, 'denied_user', startedAt);
      return {
        response: {
          sent: true,
          session: this.buildDecoySession(email),
          destination: this.maskDestination(email),
        },
        message: OTP_NEUTRAL_SENT_MESSAGE,
        status: HttpStatus.OK,
      };
    }

    try {
      const msResult = await this._authMicroservice.startEmailOtp(email);

      // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, lens-A advisory)
      // Mirrors the verify-side `!msResult?.tokens` guard — a reply without a
      // session is an upstream contract violation, not a 200.
      if (!msResult?.session) {
        throw new Error('Auth microservice start reply missing session');
      }

      logOtpEvent(this._logger, 'start', domain, 'sent', startedAt);
      return {
        response: {
          sent: true,
          session: msResult.session,
          destination: this.maskDestination(email),
        },
        message: OTP_NEUTRAL_SENT_MESSAGE,
        status: HttpStatus.OK,
      };
    } catch {
      logOtpEvent(this._logger, 'start', domain, 'upstream_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }
  }

  private otpUpstreamUnavailableResponse(): returnFormatService {
    return {
      response: { valid: false, code: 'OTP_UPSTREAM_UNAVAILABLE' },
      message: OTP_UPSTREAM_UNAVAILABLE_MESSAGE,
      status: HttpStatus.SERVICE_UNAVAILABLE,
    };
  }

  /**
   * POST auth/login/otp/verify
   * @description Verifies the Center (email OTP) challenge and, on success, reuses
   * `createSuccessfulLoginResponse` unchanged — the same method and arguments the
   * password path uses, including its `403 needsRoles` guard (OTP-R-5, OTP-DD-4).
   */
  async verifyOtp(dto: OtpVerifyDto): Promise<returnFormatService> {
    const startedAt = Date.now();
    const email = normaliseOtpEmail(dto.email);
    const domain = extractOtpDomain(email);
    const { code, session } = dto;

    // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, review FAIL B-3,
    // design.md §5.1/§4.1, OTP-DD-3) — decoy detection is now solely "does the
    // HMAC over email|nonce|exp recomputed from the fixed layout verify?" (no
    // more `otp:` prefix scan — that prefix was itself an existence oracle). A
    // verified-but-expired decoy is OTP_NOT_AUTHORIZED; a verified, unexpired
    // decoy answers exactly like a wrong code on a real session (OTP_CODE_MISMATCH).
    const decoy = this.verifyDecoySession(session, email);
    if (decoy.isDecoy) {
      if (decoy.expired) {
        logOtpEvent(
          this._logger,
          'verify',
          domain,
          'not_authorized',
          startedAt,
        );
        return this.otpNotAuthorizedResponse();
      }

      logOtpEvent(this._logger, 'verify', domain, 'mismatch', startedAt);
      // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2, design.md §18.1
      // row 10, requirements.md OTP-R-4, design.md OTP-DD-3 — corrected after the T-13
      // Reviewer FAIL, 2026-09-11) — a real mismatch now always carries a rotated
      // `session` (design.md §18.1 step 9), so a decoy mismatch without one was itself
      // an oracle. Mint a fresh decoy carrying the SAME `exp` as the original (a rotated
      // real Cognito session stays inside the start-time AuthSessionValidity window —
      // it never extends) so both paths answer with identical key sets and copy.
      return {
        response: {
          valid: false,
          code: 'OTP_CODE_MISMATCH',
          session: this.buildDecoySession(email, decoy.exp),
        },
        message: OTP_CODE_MISMATCH_MESSAGE,
        status: HttpStatus.UNAUTHORIZED,
      };
    }

    // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, lens-A advisory)
    // A findOne failure here is PRMS-side (DB/cache), not the microservice —
    // log `internal_error` so the runbook doesn't chase Cognito for it.
    let existingUser: any;
    try {
      existingUser = await this._userRepository.findOne({
        where: { email, active: true },
        relations: ['obj_role_by_user'],
      });
    } catch {
      logOtpEvent(this._logger, 'verify', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    if (!existingUser) {
      logOtpEvent(this._logger, 'verify', domain, 'not_authorized', startedAt);
      return this.otpNotAuthorizedResponse();
    }

    try {
      const msResult = await this._authMicroservice.verifyEmailOtp(
        email,
        code,
        session,
      );

      if (!msResult?.tokens) {
        logOtpEvent(
          this._logger,
          'verify',
          domain,
          'not_authorized',
          startedAt,
        );
        return this.otpNotAuthorizedResponse();
      }

      await this._userRepository.updateLastLoginUserByEmail(email);
      logOtpEvent(this._logger, 'verify', domain, 'ok', startedAt);

      return this.createSuccessfulLoginResponse(existingUser, msResult.tokens);
    } catch (error) {
      const mapped = this.mapOtpVerifyError(error);
      logOtpEvent(this._logger, 'verify', domain, mapped.outcome, startedAt);
      return {
        response: {
          valid: false,
          code: mapped.code,
          ...(mapped.session ? { session: mapped.session } : {}),
        },
        message: mapped.message,
        status: mapped.status,
      };
    }
  }

  private otpNotAuthorizedResponse(): returnFormatService {
    return {
      response: { valid: false, code: 'OTP_NOT_AUTHORIZED' },
      message: OTP_NOT_AUTHORIZED_MESSAGE,
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  private mapOtpVerifyError(error: any): {
    code: string;
    message: string;
    status: HttpStatus;
    outcome: string;
    session?: string;
  } {
    const msCode = error?.response?.code;
    switch (msCode) {
      case 'CODE_MISMATCH': {
        // @akili-spec changes/cognito-email-otp-login (OTP-T-13, design.md §18.1
        // steps 9-10, requirements.md §13 OTP-R-7/OTP-R-4 modified, OTP-AC-18) —
        // the microservice rotates the Cognito `session` on a wrong code so the
        // user can retry without requesting a new one; carry it through only
        // when the microservice actually sent one (real path). The decoy path
        // (`verifyDecoySession` above) never reaches this branch — it rotates
        // its own fresh decoy session inline instead (OTP-T-13 rework 2), so
        // both paths always answer OTP_CODE_MISMATCH with a `session`.
        const rotatedSession = error?.response?.session;
        return {
          code: 'OTP_CODE_MISMATCH',
          message: OTP_CODE_MISMATCH_MESSAGE,
          status: HttpStatus.UNAUTHORIZED,
          outcome: 'mismatch',
          ...(typeof rotatedSession === 'string' && rotatedSession
            ? { session: rotatedSession }
            : {}),
        };
      }
      case 'CODE_EXPIRED':
        return {
          code: 'OTP_CODE_EXPIRED',
          message: OTP_CODE_EXPIRED_MESSAGE,
          status: HttpStatus.UNAUTHORIZED,
          outcome: 'expired',
        };
      case 'ATTEMPTS_EXCEEDED':
        return {
          code: 'OTP_ATTEMPTS_EXCEEDED',
          message: OTP_ATTEMPTS_EXCEEDED_MESSAGE,
          status: HttpStatus.UNAUTHORIZED,
          outcome: 'attempts_exceeded',
        };
      case 'NOT_AUTHORIZED':
      case 'CHALLENGE_NOT_SUPPORTED':
        return {
          code: 'OTP_NOT_AUTHORIZED',
          message: OTP_NOT_AUTHORIZED_MESSAGE,
          status: HttpStatus.UNAUTHORIZED,
          outcome: 'not_authorized',
        };
      default:
        return {
          code: 'OTP_UPSTREAM_UNAVAILABLE',
          message: OTP_UPSTREAM_UNAVAILABLE_MESSAGE,
          status: HttpStatus.SERVICE_UNAVAILABLE,
          outcome: 'upstream_error',
        };
    }
  }

  /**
   * `j***@icrisat.org` — masked purely from the submitted email, never from
   * anything the microservice returns, so the shape is identical for known
   * and unknown users (OTP-DD-3).
   */
  private maskDestination(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local ? `${local[0]}***` : '***';
    return domain ? `${maskedLocal}@${domain}` : maskedLocal;
  }

  /**
   * HMAC-SHA256 over `email|nonce|exp`, base64url, keyed with the per-process
   * `_otpDecoyKey` (OTP-T-5 rework, review FAIL B-3 — never `env.JWT_SKEY ?? ''`).
   * `exp` MUST be passed as the same zero-padded 13-digit string on both build
   * and verify — the HMAC is computed over the exact bytes of the layout.
   */
  private computeOtpDecoyHmac(
    email: string,
    nonce: string,
    expStr: string,
  ): string {
    return createHmac('sha256', this._otpDecoyKey)
      .update(`${email}|${nonce}|${expStr}`)
      .digest('base64url');
  }

  /**
   * Prefix-free decoy session: `hmac(43) ‖ nonce(22) ‖ exp(13 digits) ‖ filler`,
   * base64url charset only, total length jittered uniformly in [1400, 1700]
   * (OTP-T-5 rework, review FAIL B-3, design.md §4.1 — a real Cognito session
   * measured 1,543 chars on the 2026-09-11 spike). No prefix means the string's
   * mere shape is never an existence oracle — only a failed/successful HMAC
   * recompute on verify tells decoy from real.
   *
   * @param exp Optional epoch-ms expiry to carry over verbatim (OTP-T-13 rework 2,
   * design.md §18.1 row 10). Used when *rotating* an existing decoy on mismatch —
   * a real rotated Cognito session never extends its `AuthSessionValidity` window,
   * so the rotated decoy must not either. Defaults to a fresh `now + TTL` for the
   * original `start`-time decoy.
   */
  private buildDecoySession(email: string, exp?: number): string {
    const nonce = randomBytes(16).toString('base64url'); // 22 chars
    const expStr = String(exp ?? Date.now() + OTP_DECOY_TTL_MS).padStart(
      OTP_DECOY_EXP_LEN,
      '0',
    );
    const hmac = this.computeOtpDecoyHmac(email, nonce, expStr); // 43 chars

    const totalLen = randomInt(
      OTP_DECOY_MIN_TOTAL_LEN,
      OTP_DECOY_MAX_TOTAL_LEN + 1,
    );
    const fillerLen = Math.max(0, totalLen - OTP_DECOY_FIXED_LEN);
    const filler = randomBytes(Math.ceil((fillerLen * 3) / 4) + 3)
      .toString('base64url')
      .slice(0, fillerLen);

    return `${hmac}${nonce}${expStr}${filler}`;
  }

  /** Splits a candidate session into its fixed-layout segments, or `null` if too short. */
  private parseDecoySession(
    session: string,
  ): { hmac: string; nonce: string; expStr: string; exp: number } | null {
    if (typeof session !== 'string' || session.length < OTP_DECOY_FIXED_LEN) {
      return null;
    }

    const hmac = session.slice(0, OTP_DECOY_HMAC_LEN);
    const nonce = session.slice(
      OTP_DECOY_HMAC_LEN,
      OTP_DECOY_HMAC_LEN + OTP_DECOY_NONCE_LEN,
    );
    const expStr = session.slice(
      OTP_DECOY_HMAC_LEN + OTP_DECOY_NONCE_LEN,
      OTP_DECOY_FIXED_LEN,
    );

    if (!/^\d{13}$/.test(expStr)) {
      return null;
    }

    return { hmac, nonce, expStr, exp: Number(expStr) };
  }

  /**
   * Detects a decoy solely by recomputing and `timingSafeEqual`-comparing the
   * HMAC over `email|nonce|exp` from the fixed layout (OTP-T-5 rework, review
   * FAIL B-3). A real Cognito session simply fails this check (wrong length
   * segments, or a mismatching HMAC) and is treated as real — it proceeds to
   * the microservice exactly as before.
   */
  private verifyDecoySession(
    session: string,
    email: string,
  ): { isDecoy: boolean; expired: boolean; exp?: number } {
    const parsed = this.parseDecoySession(session);
    if (!parsed) {
      return { isDecoy: false, expired: false };
    }

    const expected = this.computeOtpDecoyHmac(
      email,
      parsed.nonce,
      parsed.expStr,
    );
    const providedBuffer = Buffer.from(parsed.hmac);
    const expectedBuffer = Buffer.from(expected);
    const isDecoy =
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer);

    return {
      isDecoy,
      expired: isDecoy && Date.now() > parsed.exp,
      // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2) — surfaced so
      // the unexpired-mismatch branch can rotate a fresh decoy carrying the SAME `exp`
      // (never extending the decoy's lifetime past the original start-time window).
      ...(isDecoy ? { exp: parsed.exp } : {}),
    };
  }

  /**
   * Validate Code Auth
   * @param authCodeDto
   * @returns User information and JWT token
   * @description Validates the authorization code received from the OAuth provider and retrieves user information.
   */
  async validateAuthCode(authCodeDto: AuthCodeValidationDto): Promise<any> {
    try {
      this._logger.log('Validando código de autorización');

      this.validateRedirectUri(authCodeDto.redirectUri);

      const authResponse =
        await this._authMicroservice.validateAuthorizationCode(
          authCodeDto.code,
          authCodeDto.redirectUri,
        );

      const userInfo = authResponse.userInfo;

      if (!userInfo?.email) {
        throw {
          message: 'The user does not have an email address.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const user =
        await this._userService.createOrUpdateUserFromAuthProvider(userInfo);

      await this._userRepository.update(
        {
          id: user.id,
          email: user.email,
        },
        {
          last_login: new Date(),
        },
      );

      const authTokens = {
        accessToken: authResponse.accessToken,
        idToken: authResponse.idToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
      };

      return this.createSuccessfulLoginResponse(user, authTokens);
    } catch (error) {
      this._logger.error(`An error ocurred: ${error.message}`, error.stack);
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Complete Password Challenge
   * @param challengeDto Challenge completion data
   * @returns JWT token and user information after successful password set
   */
  async completePasswordChallenge(
    challengeDto: CompletePasswordChallengeDto,
  ): Promise<any> {
    try {
      this._logger.log(
        `Completing password challenge for user: ${challengeDto.username}`,
      );

      const existingUser = await this._userRepository.findOne({
        where: {
          email: challengeDto.username.trim().toLowerCase(),
          active: true,
        },
        relations: ['obj_role_by_user'],
      });

      if (!existingUser) {
        throw {
          message: 'User not found in local database',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const authResponse =
        await this._authMicroservice.completeNewPasswordChallenge({
          username: challengeDto.username,
          newPassword: challengeDto.newPassword,
          session: challengeDto.session,
        });

      if (!authResponse.tokens) {
        throw new Error(
          'Invalid response from Auth Microservice - no tokens received',
        );
      }

      await this._userRepository.updateLastLoginUserByEmail(
        challengeDto.username,
      );

      return this.createSuccessfulLoginResponse(
        existingUser,
        authResponse.tokens,
        'Password set successfully. Login completed.',
      );
    } catch (error) {
      this._logger.error(
        `Error completing password challenge: ${error.message}`,
        error.stack,
      );
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Creates JWT token and success response for authenticated user
   * @param user User entity
   * @param authTokens Authentication tokens from auth microservice
   * @param successMessage Custom success message
   * @returns Successful login response object
   */
  private createSuccessfulLoginResponse(
    user: any,
    authTokens: any,
    successMessage: string = 'Successful login',
  ) {
    if (!user.obj_role_by_user || user.obj_role_by_user.length === 0) {
      this._logger.warn(`User ${user.email} has no roles assigned`);
      return {
        message: `The user ${user.email} does not have any roles assigned. Please contact the administrator.`,
        response: {
          valid: false,
          needsRoles: true,
        },
        status: HttpStatus.FORBIDDEN,
      };
    }

    const jwtToken = this._jwtService.sign(
      {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      {
        secret: env.JWT_SKEY,
      },
    );

    return {
      message: successMessage,
      response: {
        valid: true,
        token: jwtToken,
        user: {
          id: user.id,
          user_name: `${user.first_name} ${user.last_name}`,
          user_acronym: user.first_name.charAt(0) + user.last_name.charAt(0),
          email: user.email,
        },
        auth_tokens: authTokens,
      },
      status: HttpStatus.OK,
    };
  }
}
