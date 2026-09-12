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
// @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19) — PRMS now
// owns the whole code lifecycle; nothing on the Center path calls Cognito.
import {
  OTP_CHALLENGE_MAX_ATTEMPTS,
  OtpChallengeService,
} from './otp/otp-challenge.service';
import { OTP_EMAIL_SENDER_NAME, buildOtpEmail } from './otp/otp-email.template';
import { EmailNotificationManagementService } from '../shared/microservices/email-notification-management/email-notification-management.service';

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
// Fixed layout: hmac(43) ‖ nonce(22) ‖ exp(11 base64url chars) ‖ filler, base64url
// charset only, total length jittered uniformly in [1400, 1700] (a real Cognito
// session measured 1,543 chars on the 2026-09-11 spike).
//
// @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0), design.md §13
// item (a)) — `exp` used to be 13 zero-padded ASCII decimal digits at this fixed
// offset: a deterministic decoy-vs-real classifier from a single `start` response
// (no real Cognito session has 13 consecutive digits there). It is now the
// fixed-width base64url encoding of the epoch-ms value as an 8-byte big-endian
// integer, XOR-masked with an HMAC-derived keystream before encoding
// (`computeOtpExpMask`) — 11 base64url characters, no padding.
//
// @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0), Reviewer FAIL —
// "re-encoded, not removed") — encoding the raw epoch-ms integer was not enough:
// every epoch-ms value until ~2039 starts with 3 zero bytes and near-constant high
// bits (~6 leading constant base64url chars today, shrinking over the ~13-year
// window as the low bits roll), so the *unmasked* segment was still a decoder for
// "does this decode near now ± 5 min?" — a decoy classifier, just laundered through
// base64url. XORing the 8 bytes with an HMAC(key, nonce)-derived keystream before
// encoding makes the segment's bytes uniformly random regardless of how narrow the
// real timestamp range is; unmasking only happens in `verifyDecoySession`, after
// the HMAC has already confirmed the segment is a genuine decoy (never inside
// `parseDecoySession`, which only validates shape).
//
// @akili-spec changes/cognito-email-otp-login (design.md §13 item (l), runbook
// "Known pre-PROD fixes" #1) — masking removed the *value* signal but left a
// *shape* signal: a canonical base64url encoder zeroes the bits that fall off the
// end of a segment whose byte length is not a multiple of 3 (hmac 32 B → 2 unused
// bits, nonce 16 B → 4, exp 8 B → 2), so the chars at offsets 42/64/75 were
// confined to 16/4/16 alphabet values in every decoy — a 3-offset charset test a
// uniformly random real session passes with p ≈ 1/256. `encodeOtpSegment` now
// fills those unused bits with `randomInt`; Node's decoder drops them, so the
// authenticated bytes and the HMAC-over-the-exact-emitted-strings contract are
// untouched. The two derivations keyed by `_otpDecoyKey` also carry distinct
// domain-separation tags (below), so "no input of one is ever an input of the
// other" is structural rather than a property of the `|` separator.
const OTP_DECOY_AUTH_TAG = 'otp-decoy-auth\0';
const OTP_DECOY_MASK_TAG = 'otp-decoy-mask\0';
const OTP_BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const OTP_DECOY_HMAC_LEN = 43; // base64url(HMAC-SHA256), no padding
const OTP_DECOY_NONCE_LEN = 22; // base64url(16 random bytes), no padding
const OTP_DECOY_EXP_LEN = 11; // base64url(8-byte big-endian epoch ms), no padding
const OTP_DECOY_FIXED_LEN =
  OTP_DECOY_HMAC_LEN + OTP_DECOY_NONCE_LEN + OTP_DECOY_EXP_LEN; // 76
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
    private readonly _otpChallengeService: OtpChallengeService,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, design.md §18.5,
    // requirements.md §14 OTP-R-3 modified, OTP-R-36) — the lookup is no longer an
    // existence gate, only an *inactive* gate: a center user does not need a PRMS
    // record before the first login (the first successful verify creates it with
    // the guest role, exactly as the CGIAR provider path does). So the filter drops
    // `active: true` — an inactive row must be seen, not silently missed — and the
    // relations are gone with it: nothing here consumes `obj_role_by_user` any more
    // (the verify path now gets its user, with relations, from `UserService`).
    let existingUser: any;
    try {
      existingUser = await this._userRepository.findOne({ where: { email } });
    } catch {
      logOtpEvent(this._logger, 'start', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    // A deactivated account must never get a code (OTP-R-36): it keeps the decoy —
    // byte-indistinguishable from a real start — so no challenge row is written and
    // no email is ever sent for it. An email simply unknown to PRMS is treated like
    // an active one: it gets a real code, and the first successful verify provisions
    // the PRMS user (OTP-R-3, design.md §19.4 — the reply is identical either way,
    // so this is not an existence oracle).
    if (existingUser?.active === false) {
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

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) — PRMS
    // mints the code itself. A failed write is the only remaining way `start` can
    // fail, and it keeps the same neutral 503 the client already handles; the outcome
    // says `internal_error` because the fault is local (no microservice is involved).
    let challenge: { nonce: string; code: string; expiresAt: Date };
    try {
      challenge = await this._otpChallengeService.create(email);
    } catch {
      logOtpEvent(this._logger, 'start', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    // The SAME signed encoder the decoy uses, carrying the challenge's own nonce and
    // expiry: real and decoy sessions are byte-indistinguishable, and the server tells
    // them apart solely by whether a row exists for the nonce (design.md §19.1).
    const session = this.buildDecoySession(
      email,
      challenge.expiresAt.getTime(),
      challenge.nonce,
    );

    // OTP-R-35 — a mail pipeline that will not take the message must never leak that
    // fact to the caller: neutral 200 either way, `email_failed` for the runbook.
    let outcome = 'sent';
    try {
      await this.sendOtpCodeEmail(email, challenge.code);
    } catch {
      outcome = 'email_failed';
    }

    logOtpEvent(this._logger, 'start', domain, outcome, startedAt);
    return {
      response: {
        sent: true,
        session,
        destination: this.maskDestination(email),
      },
      message: OTP_NEUTRAL_SENT_MESSAGE,
      status: HttpStatus.OK,
    };
  }

  /**
   * @akili-spec changes/cognito-email-otp-login (OTP-T-16, requirements.md §13
   * OTP-R-32 modified)
   *
   * Sends the code through PRMS's own notification pipeline, with the sender,
   * branding and DTO shape every other PRMS email uses
   * (`auth/modules/user/user.service.ts:756-770`). The code lives only inside the
   * rendered bodies — it is never logged and never stored in plaintext (OTP-R-11).
   */
  private async sendOtpCodeEmail(email: string, code: string): Promise<void> {
    const { subject, html, text } = buildOtpEmail({ code });

    this._emailNotificationManagementService.sendEmail({
      from: {
        email: process.env.EMAIL_SENDER,
        name: OTP_EMAIL_SENDER_NAME,
      },
      emailBody: {
        subject,
        to: [email],
        cc: [],
        bcc: '',
        message: {
          text,
          socketFile: html,
        },
      },
    });
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
    // design.md §5.1/§4.1, OTP-DD-3; extended by OTP-T-16, design.md §19.1) — every
    // session PRMS issues, real or decoy, is minted by the same signed encoder, so
    // this check now means "did WE issue this string for this email?". A string that
    // fails it was never ours (forged, tampered, or from a previous deployment's key)
    // and gets the neutral OTP_NOT_AUTHORIZED; an expired one gets the same, whether
    // it backed a real challenge or a decoy.
    const decoy = this.verifyDecoySession(session, email);
    if (!decoy.isDecoy || decoy.expired) {
      logOtpEvent(this._logger, 'verify', domain, 'not_authorized', startedAt);
      return this.otpNotAuthorizedResponse();
    }

    // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) — the
    // ONE place a real session is told from a decoy: does a challenge row exist for
    // the nonce the session carries? A failure here is PRMS-side (DB), so the outcome
    // is `internal_error` — the runbook must not chase an upstream that is no longer
    // on this path at all.
    let challenge: any;
    try {
      challenge = await this._otpChallengeService.findActive(decoy.nonce);
    } catch {
      logOtpEvent(this._logger, 'verify', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    if (!challenge) {
      // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2, OTP-T-16,
      // requirements.md OTP-R-4, OTP-DD-3) — a decoy answers exactly like a wrong
      // code on a real challenge, rotated session included: the presence/absence of
      // `session` on a mismatch would otherwise be an existence oracle. The nonce is
      // carried over for the same reason a real rotation carries it — a decoy that
      // rolled a fresh nonce would let an attacker compare the nonce segment across
      // two rotations and classify the address from the client side.
      logOtpEvent(this._logger, 'verify', domain, 'mismatch', startedAt);
      return this.otpMismatchResponse(
        this.buildDecoySession(email, decoy.exp, decoy.nonce),
      );
    }

    if (challenge.consumed_at) {
      // A code is single-use (OTP-R-37). Telemetry says `consumed` (design.md §19.1)
      // while the body stays the same neutral one an unknown session gets.
      logOtpEvent(this._logger, 'verify', domain, 'consumed', startedAt);
      return this.otpNotAuthorizedResponse();
    }

    if (challenge.attempts >= OTP_CHALLENGE_MAX_ATTEMPTS) {
      logOtpEvent(
        this._logger,
        'verify',
        domain,
        'attempts_exceeded',
        startedAt,
      );
      return this.otpAttemptsExceededResponse();
    }

    // The envelope expiry check above (`decoy.expired`) already fires before a row
    // is ever looked up here — a real session and its row are minted from the same
    // instant (`startOtp`), so this row-level `expires_at` re-check is unreachable
    // in practice; the row's own TTL is defensive, kept only in case a future
    // caller ever hands this method a session whose envelope outlives its row
    // (`OTP-T-16` review — readability).

    if (!this._otpChallengeService.matchesCode(challenge, code)) {
      return this.handleOtpCodeMismatch(
        challenge,
        decoy,
        email,
        domain,
        startedAt,
      );
    }

    // @akili-spec changes/cognito-email-otp-login (OTP-T-15, design.md §18.5;
    // moved below the code check by OTP-T-16) — an *inactive* gate, not an existence
    // gate: an account that was already inactive at `start` never got a challenge
    // row, so the only case this catches is one deactivated inside the 5-minute
    // window. Its second job is telling `provisioned` from `ok` without a second
    // query. A failure here is PRMS-side (DB) — `internal_error`, neutral 503.
    let existingUser: any;
    try {
      // The code is right: spend it before anything else can go wrong, so a failure
      // downstream can never leave a reusable code behind (OTP-R-37). Conditioned
      // on `consumed_at IS NULL` (`OtpChallengeService.consume`), so a concurrent
      // verify that already spent this nonce cannot also mint a session — only the
      // UPDATE that wins the race sees `true` (reviewer advisory).
      const consumed = await this._otpChallengeService.consume(decoy.nonce);
      if (!consumed) {
        logOtpEvent(this._logger, 'verify', domain, 'consumed', startedAt);
        return this.otpNotAuthorizedResponse();
      }
      existingUser = await this._userRepository.findOne({ where: { email } });
    } catch {
      logOtpEvent(this._logger, 'verify', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    // OTP-R-36 / OTP-AC-21 — same body an unknown session gets.
    if (existingUser?.active === false) {
      logOtpEvent(this._logger, 'verify', domain, 'not_authorized', startedAt);
      return this.otpNotAuthorizedResponse();
    }

    try {
      // @akili-spec changes/cognito-email-otp-login (OTP-T-15, requirements.md §14
      // OTP-R-5 modified, OTP-AC-20) — first login provisions the PRMS user exactly
      // as `validateAuthCode` does: same `createOrUpdateUserFromAuthProvider` call
      // (which assigns the guest role and returns the user with `obj_role_by_user`
      // loaded), same `last_login` write, same `createSuccessfulLoginResponse`.
      // No name claims exist on this path any more — there is no ID token to read
      // (OTP-T-16); the email is the one that was normalised, domain-checked and
      // rate-limited.
      const user = await this._userService.createOrUpdateUserFromAuthProvider({
        email,
      });

      await this._userRepository.update(
        { id: user.id, email: user.email },
        { last_login: new Date() },
      );

      logOtpEvent(
        this._logger,
        'verify',
        domain,
        existingUser ? 'ok' : 'provisioned',
        startedAt,
      );

      // OTP-R-38 — the standard PRMS session, with no Cognito tokens: the API
      // validates only PRMS's own JWT, and nothing downstream reads `auth_tokens`.
      return this.createSuccessfulLoginResponse(user, null);
    } catch (error) {
      // An account deactivated between the gate above and this call still answers
      // neutrally — `createOrUpdateUserFromAuthProvider` rethrows the inactive case
      // as a plain Error, which the generic mapper would otherwise turn into a 503.
      if (String(error?.message ?? '').includes('User is inactive')) {
        logOtpEvent(
          this._logger,
          'verify',
          domain,
          'not_authorized',
          startedAt,
        );
        return this.otpNotAuthorizedResponse();
      }

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

  /**
   * @akili-spec changes/cognito-email-otp-login (Sonar S3776 cleanup — extracted
   * unmodified from `verifyOtp` to bring its cognitive complexity under the
   * threshold; behaviour, comments and log outcomes are unchanged).
   *
   * Handles a wrong-code submission against an active challenge: records the
   * attempt, decides between "attempts exceeded" and a rotated "mismatch"
   * response, and returns the neutral envelope for whichever outcome applies.
   */
  private async handleOtpCodeMismatch(
    challenge: any,
    decoy: any,
    email: string,
    domain: string,
    startedAt: number,
  ): Promise<returnFormatService> {
    // Captured BEFORE `registerAttempt` runs: an `increment(...)` UPDATE never
    // mutates the entity `findActive` returned, but a repository that DOES hand
    // back a live reference (a real TypeORM identity-map hit, or the in-memory
    // fixture these specs run against) would otherwise let this method observe
    // its own increment a line below.
    const attemptsBeforeThisTry = challenge.attempts;

    // OTP-R-37 concurrency (reviewer advisory): the increment is a conditional
    // atomic UPDATE (`attempts < OTP_CHALLENGE_MAX_ATTEMPTS`), so the row's
    // `attempts` can never be pushed past the ceiling no matter how many wrong
    // codes for this nonce land at once — only as many of them as there is room
    // for ever get to increment it.
    let affected: number;
    try {
      affected = await this._otpChallengeService.registerAttempt(decoy.nonce);
    } catch {
      logOtpEvent(this._logger, 'verify', domain, 'internal_error', startedAt);
      return this.otpUpstreamUnavailableResponse();
    }

    // OTP-AC-18 / OTP-AC-22 — "three wrong codes → Too many attempts": the third
    // miss is the one that says so, not a fourth submission that learns it.
    // Checked two ways so neither a sequential nor a concurrent wrong code can
    // slip past: `affected === 0` is this call losing the atomic increment
    // outright (the ceiling was already reached by another one before it ran);
    // `attemptsBeforeThisTry + 1 >= MAX` is this call being the one that just
    // reached it, decided from the read this method already holds rather than a
    // second query.
    if (
      affected === 0 ||
      attemptsBeforeThisTry + 1 >= OTP_CHALLENGE_MAX_ATTEMPTS
    ) {
      logOtpEvent(
        this._logger,
        'verify',
        domain,
        'attempts_exceeded',
        startedAt,
      );
      return this.otpAttemptsExceededResponse();
    }

    logOtpEvent(this._logger, 'verify', domain, 'mismatch', startedAt);
    return this.otpMismatchResponse(
      this.buildDecoySession(email, decoy.exp, decoy.nonce),
    );
  }

  private otpNotAuthorizedResponse(): returnFormatService {
    return {
      response: { valid: false, code: 'OTP_NOT_AUTHORIZED' },
      message: OTP_NOT_AUTHORIZED_MESSAGE,
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  /**
   * @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) — a
   * wrong code, whether against a real challenge or a decoy, rotates a fresh
   * session (same nonce, fresh tails) so the client can retry without asking for a
   * new code; the caller builds that rotated session (`buildDecoySession`) and
   * hands it here rather than this method minting its own, so a real mismatch and a
   * decoy mismatch go through the exact same rotation path (OTP-DD-3).
   */
  private otpMismatchResponse(session: string): returnFormatService {
    return {
      response: { valid: false, code: 'OTP_CODE_MISMATCH', session },
      message: OTP_CODE_MISMATCH_MESSAGE,
      status: HttpStatus.UNAUTHORIZED,
    };
  }

  /**
   * @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) —
   * three wrong codes exhaust a challenge; unlike a mismatch this does not rotate a
   * session — the client is expected to request a new code (OTP-AC-22).
   */
  private otpAttemptsExceededResponse(): returnFormatService {
    return {
      response: { valid: false, code: 'OTP_ATTEMPTS_EXCEEDED' },
      message: OTP_ATTEMPTS_EXCEEDED_MESSAGE,
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

        // @akili-spec changes/cognito-email-otp-login (OTP-T-14 step (0), design.md
        // §13 item (a)) — a CODE_MISMATCH reply with no session is a contract
        // violation, not a user path: every real mismatch rotates one (step 9
        // above), so its absence means the microservice itself is misbehaving.
        // Emitting a mismatch body without `session` here would also be a reverse
        // existence oracle (a decoy mismatch always mints one — OTP-T-13 rework 2),
        // so this maps to the same neutral upstream-unavailable response as a
        // downed microservice, never to a session-less mismatch.
        if (typeof rotatedSession !== 'string' || rotatedSession.length === 0) {
          return {
            code: 'OTP_UPSTREAM_UNAVAILABLE',
            message: OTP_UPSTREAM_UNAVAILABLE_MESSAGE,
            status: HttpStatus.SERVICE_UNAVAILABLE,
            outcome: 'upstream_error',
          };
        }

        return {
          code: 'OTP_CODE_MISMATCH',
          message: OTP_CODE_MISMATCH_MESSAGE,
          status: HttpStatus.UNAUTHORIZED,
          outcome: 'mismatch',
          session: rotatedSession,
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
   * base64url-encodes a segment and fills the bits the encoder would otherwise
   * zero — the `6 - (8 * len) % 6` trailing bits of the last character when the
   * byte length is not a multiple of 3 (design.md §13 item (l)). Node's decoder
   * ignores those bits, so `Buffer.from(encodeOtpSegment(b), 'base64url')`
   * returns `b` verbatim: the authenticated bytes are unchanged and only the
   * *shape* signal disappears (the trailing char becomes uniform over all 64
   * alphabet values instead of the 16/4-value subset canonical encoding leaves).
   */
  private encodeOtpSegment(bytes: Buffer): string {
    const encoded = bytes.toString('base64url');
    const remainder = bytes.length % 3;
    if (remainder === 0) {
      return encoded;
    }

    // 1 leftover byte → 2 chars, 4 unused bits; 2 leftover bytes → 3 chars, 2.
    const unusedBits = remainder === 1 ? 4 : 2;
    const unusedMask = (1 << unusedBits) - 1;
    const lastIndex = OTP_BASE64URL_ALPHABET.indexOf(
      encoded[encoded.length - 1],
    );
    const randomised = (lastIndex & ~unusedMask) | randomInt(0, unusedMask + 1);

    return encoded.slice(0, -1) + OTP_BASE64URL_ALPHABET[randomised];
  }

  /**
   * The raw 32-byte HMAC-SHA256 over `email|nonce|expEncoded`, keyed with the
   * per-process `_otpDecoyKey` (OTP-T-5 rework, review FAIL B-3 — never
   * `env.JWT_SKEY ?? ''`) and prefixed with `OTP_DECOY_AUTH_TAG` so this
   * derivation can never share an input with `computeOtpExpMask` under the same
   * key (design.md §13 item (l)). `expEncoded` MUST be passed as the same 11-char
   * emitted string on both build and verify (OTP-T-14 step (0)) — the HMAC is
   * computed over the exact bytes on the wire, trailing random bits included.
   * Returns the digest, not its base64url form: the emitted hmac segment carries
   * randomised trailing bits a recompute cannot reproduce, so verification
   * compares decoded bytes (see `verifyDecoySession`).
   */
  private computeOtpDecoyHmac(
    email: string,
    nonce: string,
    expEncoded: string,
  ): Buffer {
    return createHmac('sha256', this._otpDecoyKey)
      .update(`${OTP_DECOY_AUTH_TAG}${email}|${nonce}|${expEncoded}`)
      .digest();
  }

  /**
   * An 8-byte XOR keystream derived from the decoy's own `nonce` via HMAC-SHA256
   * under the per-process `_otpDecoyKey` (OTP-T-14 step (0), Reviewer FAIL —
   * "re-encoded, not removed"), domain-separated from the decoy-auth HMAC by
   * `OTP_DECOY_MASK_TAG` (design.md §13 item (l)). Masking the epoch-ms bytes
   * with this keystream before base64url-encoding them removes the near-constant
   * leading bytes every real epoch-ms timestamp has today, so the encoded segment
   * carries no decoy-vs-real signal on its own — only a full HMAC match (which
   * already consumes this same nonce) can recover it.
   */
  private computeOtpExpMask(nonce: string): Buffer {
    return createHmac('sha256', this._otpDecoyKey)
      .update(`${OTP_DECOY_MASK_TAG}${nonce}`)
      .digest()
      .subarray(0, 8);
  }

  /**
   * Encodes an epoch-ms timestamp as a fixed-width, 11-char base64url string —
   * an 8-byte big-endian unsigned integer, XOR-masked with `computeOtpExpMask`,
   * with no padding (OTP-T-14 step (0), design.md §13 item (a)). Replaces the
   * old 13-digit zero-padded decimal `exp`, which was a fixed-offset fingerprint
   * distinguishing every decoy from a real Cognito session — and the masking
   * step exists because the unmasked 8-byte integer alone was *also* such a
   * fingerprint (near-constant leading bytes for any real-world epoch-ms value).
   */
  private encodeOtpExp(exp: number, nonce: string): string {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(Math.max(0, Math.trunc(exp))));
    const mask = this.computeOtpExpMask(nonce);
    for (let i = 0; i < 8; i++) {
      buf[i] ^= mask[i];
    }
    return this.encodeOtpSegment(buf);
  }

  /**
   * Validates that a candidate `exp` segment is a well-formed base64url
   * encoding of exactly 8 bytes and returns those bytes **still masked** — or
   * `null` when the shape is wrong (wrong length, a character outside the
   * base64url alphabet, or a decode that doesn't yield 8 bytes), exactly like
   * the old regex guard's `null`. Deliberately does NOT unmask: unmasking
   * requires the same key/nonce input as the HMAC check, so doing it here
   * (before `verifyDecoySession` has confirmed the HMAC) would let a forged
   * segment's decode be computed before authenticity is established.
   */
  private decodeOtpExpSegment(expEncoded: string): Buffer | null {
    if (
      typeof expEncoded !== 'string' ||
      expEncoded.length !== OTP_DECOY_EXP_LEN ||
      !/^[A-Za-z0-9_-]+$/.test(expEncoded)
    ) {
      return null;
    }

    const buf = Buffer.from(expEncoded, 'base64url');
    return buf.length === 8 ? buf : null;
  }

  /**
   * Unmasks a validated, still-masked 8-byte `exp` segment into its epoch-ms
   * value using the same nonce-derived keystream `encodeOtpExp` applied, or
   * `null` when the result is not a finite, non-negative number. Called only
   * from `verifyDecoySession`, after the HMAC has already confirmed the
   * segment belongs to a genuine decoy (OTP-T-14 step (0)).
   */
  private unmaskOtpExp(maskedBuf: Buffer, nonce: string): number | null {
    const mask = this.computeOtpExpMask(nonce);
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      buf[i] = maskedBuf[i] ^ mask[i];
    }
    const exp = Number(buf.readBigUInt64BE());
    return Number.isFinite(exp) && exp >= 0 ? exp : null;
  }

  /**
   * Prefix-free decoy session: `hmac(43) ‖ nonce(22) ‖ exp(11 base64url chars,
   * mask-encoded) ‖ filler`, base64url charset only, total length jittered
   * uniformly in [1400, 1700] (OTP-T-5 rework, review FAIL B-3, design.md §4.1 —
   * a real Cognito session measured 1,543 chars on the 2026-09-11 spike). No
   * prefix means the string's mere shape is never an existence oracle — only a
   * failed/successful HMAC recompute on verify tells decoy from real, and the
   * `exp` segment itself carries no signal either (masked per `encodeOtpExp`,
   * OTP-T-14 step (0)). Every fixed segment is emitted through
   * `encodeOtpSegment`, which randomises the trailing bits base64url leaves
   * unused, so the trailing char of each segment is uniform over the alphabet
   * rather than the 16/4/16-value subset that made a 3-offset charset test a
   * p ≈ 1/256 decoy-vs-real classifier (design.md §13 item (l)).
   *
   * @param exp Optional epoch-ms expiry to carry over verbatim (OTP-T-13 rework 2,
   * design.md §18.1 row 10). Used when *rotating* an existing decoy on mismatch —
   * a real rotated Cognito session never extends its `AuthSessionValidity` window,
   * so the rotated decoy must not either. Defaults to a fresh `now + TTL` for the
   * original `start`-time decoy.
   * @param nonce Optional nonce to carry over verbatim (OTP-T-16, design.md §19.1) —
   * a REAL challenge's session must embed the `otp_challenges.nonce` the row was
   * created with (so `verifyOtp` can look the row up), and a rotated decoy mismatch
   * must keep answering with the SAME nonce it was minted with (same reason `exp`
   * is carried over: a nonce that changed on rotation would itself be a signal).
   * Defaults to a fresh random nonce for the original `start`-time decoy.
   */
  private buildDecoySession(
    email: string,
    exp?: number,
    nonce?: string,
  ): string {
    const usedNonce = nonce ?? this.encodeOtpSegment(randomBytes(16)); // 22 chars
    const expStr = this.encodeOtpExp(
      exp ?? Date.now() + OTP_DECOY_TTL_MS,
      usedNonce,
    ); // 11 chars, masked
    // The HMAC covers the nonce and exp segments exactly as emitted (trailing
    // random bits included), so verify recomputes over the bytes on the wire.
    const hmac = this.encodeOtpSegment(
      this.computeOtpDecoyHmac(email, usedNonce, expStr),
    ); // 43 chars

    const totalLen = randomInt(
      OTP_DECOY_MIN_TOTAL_LEN,
      OTP_DECOY_MAX_TOTAL_LEN + 1,
    );
    const fillerLen = Math.max(0, totalLen - OTP_DECOY_FIXED_LEN);
    const filler = randomBytes(Math.ceil((fillerLen * 3) / 4) + 3)
      .toString('base64url')
      .slice(0, fillerLen);

    return `${hmac}${usedNonce}${expStr}${filler}`;
  }

  /**
   * Splits a candidate session into its fixed-layout segments, or `null` if
   * too short or the `exp` segment isn't shaped like a valid encoding. Returns
   * the `exp` segment's bytes **still masked** (OTP-T-14 step (0)) — unmasking
   * happens only in `verifyDecoySession`, after the HMAC confirms authenticity.
   */
  private parseDecoySession(
    session: string,
  ): { hmac: string; nonce: string; expStr: string; expBuf: Buffer } | null {
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

    const expBuf = this.decodeOtpExpSegment(expStr);
    if (!expBuf) {
      return null;
    }

    return { hmac, nonce, expStr, expBuf };
  }

  /**
   * Detects a decoy solely by recomputing and `timingSafeEqual`-comparing the
   * HMAC over `email|nonce|exp` from the fixed layout (OTP-T-5 rework, review
   * FAIL B-3). A real Cognito session simply fails this check (wrong length
   * segments, or a mismatching HMAC) and is treated as real — it proceeds to
   * the microservice exactly as before. The `exp` segment is only unmasked
   * (via `unmaskOtpExp`) once the HMAC has confirmed the session is a genuine
   * decoy (OTP-T-14 step (0)) — never before.
   */
  private verifyDecoySession(
    session: string,
    email: string,
  ): { isDecoy: boolean; expired: boolean; exp?: number; nonce?: string } {
    const parsed = this.parseDecoySession(session);
    if (!parsed) {
      return { isDecoy: false, expired: false };
    }

    // Compare the DECODED 32 bytes, not the 43-char strings: the emitted hmac
    // segment's trailing bits are random (design.md §13 item (l)) and a recompute
    // cannot reproduce them — the decoder drops them, so the authenticated digest
    // is what gets compared, still in constant time.
    const expectedBuffer = this.computeOtpDecoyHmac(
      email,
      parsed.nonce,
      parsed.expStr,
    );
    const providedBuffer = Buffer.from(parsed.hmac, 'base64url');
    const isDecoy =
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isDecoy) {
      return { isDecoy: false, expired: false };
    }

    const exp = this.unmaskOtpExp(parsed.expBuf, parsed.nonce);
    if (exp === null) {
      // Would require an HMAC collision alongside a bad unmask — effectively
      // unreachable — but fail safe rather than trust an unusable `exp`.
      return { isDecoy: false, expired: false };
    }

    return {
      isDecoy: true,
      expired: Date.now() > exp,
      // @akili-spec changes/cognito-email-otp-login (OTP-T-13 rework 2) — surfaced so
      // the unexpired-mismatch branch can rotate a fresh decoy carrying the SAME `exp`
      // (never extending the decoy's lifetime past the original start-time window).
      exp,
      // @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) —
      // surfaced so `verifyOtp` can look up the `otp_challenges` row this session's
      // nonce points at (the ONE place a real session is told from a decoy) and so a
      // rotated decoy mismatch can carry the SAME nonce forward.
      nonce: parsed.nonce,
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
        // @akili-spec changes/cognito-email-otp-login (OTP-T-16, requirements.md
        // §15 OTP-R-38) — a center (email-code) session has no Cognito tokens at
        // all: `verifyOtp` calls this with `authTokens: null`, and the key must be
        // ABSENT (not merely `null`) so nothing downstream is tempted to branch on
        // its presence. Every other caller still passes real tokens, so the key
        // stays exactly as before for the password/provider paths.
        ...(authTokens != null ? { auth_tokens: authTokens } : {}),
      },
      status: HttpStatus.OK,
    };
  }
}
