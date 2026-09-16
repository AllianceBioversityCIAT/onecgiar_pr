// @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-4)
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { VersioningService } from '../../versioning/versioning.service';
import type { AuthMethod } from '../../../auth/auth.service';
import { BilateralHandoffCode } from '../entities/bilateral-handoff-code.entity';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';

/**
 * `BilateralHandoffService` — mint (`start`) and redeem (`exchange`) a PRMS sign-in
 * handoff code for the Bulk Results Uploader (`design.md` §5 S1–S7, S5′, E1–E3).
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-4, requirements.md §6
 * R-2, R-3, R-4, R-5, R-7, R-8, R-9, R-11, R-20, R-21, R-30)
 */

/** R-3: fixed 120 s lifetime. The code itself is 32 bytes CSPRNG → base64url(43 chars, no padding). */
const HANDOFF_CODE_TTL_SECONDS = 120;

/** S6 / R-20: opportunistic purge retention window. */
const HANDOFF_PURGE_RETENTION_SQL = 'INTERVAL 1 DAY';

/** S4: the invalidation UPDATE stamps this acronym — never a real platform's. */
const HANDOFF_SUPERSEDED_ACRONYM = 'superseded';

/**
 * R-2 "user of another centre" scenario: generic on purpose — it must NOT reveal
 * whether the requested centre exists, name it, or say anything about role state.
 */
const HANDOFF_FORBIDDEN_MESSAGE =
  'You do not have permission to request a handoff for this centre.';

/** R-30: unknown/unconfigured audience. */
const HANDOFF_BAD_AUDIENCE_MESSAGE = 'Unsupported audience.';

/**
 * R-8: the ONE body every exchange miss answers with — unknown, expired, consumed
 * and wrong-audience codes are indistinguishable to the caller. Never enrich this
 * message per-case; the reason is derived separately, for the audit log only (E2).
 */
const HANDOFF_INVALID_CODE_MESSAGE = 'Invalid or expired code';

/** Missing server configuration (assumption — see Implementer report). */
const HANDOFF_UNAVAILABLE_MESSAGE =
  'The Bulk Results Uploader handoff is not configured for this environment.';

export interface HandoffSessionUser {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  /** `req.user.auth_method` — absent on a legacy session (R-9 legacy scenario). */
  auth_method?: AuthMethod | null;
}

export interface HandoffStartInput {
  center_code: string;
  audience?: string;
}

export interface HandoffExchangeInput {
  code: string;
  audience: string;
}

export interface HandoffStartResult {
  code: string;
  expires_in: number;
  redirect_url: string;
}

/** Partner contract v0.3 §4 claim shape — mirrored by the checked-in fixture. */
export interface HandoffClaims {
  iss: string;
  aud: string;
  iat: number;
  issued_for_env: string;
  user: {
    user_id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    auth_method: AuthMethod | null;
  };
  center: {
    clarisa_code: string;
    acronym: string | null;
    name: string | null;
    institution_id: number | null;
  };
  role: {
    role_id: number | null;
    description: string | null;
    is_admin: boolean;
  };
  reporting_phase: {
    phase_id: number | null;
    name: string | null;
    status: string | null;
  };
}

@Injectable()
export class BilateralHandoffService {
  private readonly logger = new Logger(BilateralHandoffService.name);

  constructor(
    @InjectRepository(BilateralHandoffCode)
    private readonly handoffCodeRepository: Repository<BilateralHandoffCode>,
    private readonly roleByUserRepository: RoleByUserRepository,
    private readonly clarisaCentersRepository: ClarisaCentersRepository,
    private readonly clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly userRepository: UserRepository,
    private readonly versioningService: VersioningService,
  ) {}

  /**
   * `start` — mint a code for a verified, authorised session (`design.md` §5 S2–S7, S5′).
   */
  async start(
    user: HandoffSessionUser,
    dto: HandoffStartInput,
  ): Promise<HandoffStartResult> {
    const callbackUrl = this.getCallbackUrl();
    const configuredAudiences = this.getConfiguredAudiences();
    const envLabel = this.getEnvLabel();

    // Same class of misconfiguration as the other two: an `env=` with no value would
    // send the partner a redirect it cannot route (Leader decision, 2026-09-15).
    if (!callbackUrl || configuredAudiences.length === 0 || !envLabel) {
      throw new ServiceUnavailableException(HANDOFF_UNAVAILABLE_MESSAGE);
    }

    // S2 — admin first (cheaper; admins have no centre row), then centre role.
    const isAdmin = await this.roleByUserRepository.isUserAdmin(user.id);
    if (!isAdmin) {
      const hasCenterRole =
        await this.roleByUserRepository.validationCenterPermissions(
          user.id,
          dto.center_code,
        );
      if (hasCenterRole !== 1) {
        this.logStart(user.id, dto.center_code, dto.audience, 'forbidden');
        throw new ForbiddenException(HANDOFF_FORBIDDEN_MESSAGE);
      }
    }

    // S3 — audience: requested value or the configured default; must be allowed.
    // R-30 rejection: log `bad_audience` (the audience as submitted; not secret)
    // before the throw, mirroring the `forbidden` outcome logged just above.
    let audience: string;
    try {
      audience = this.resolveAudience(dto.audience, configuredAudiences);
    } catch (error) {
      this.logStart(user.id, dto.center_code, dto.audience, 'bad_audience');
      throw error;
    }

    // S4 — invalidate this user's other live codes (any audience) — at most one
    // redeemable code per user at any moment (R-4).
    await this.invalidateLiveCodes(user.id);

    // S5 — mint. Exactly one call to randomBytes with 32 bytes in this file (DoD grep).
    const code = randomBytes(32).toString('base64url');
    const codeHash = this.hashCode(code);

    // 🛑 All expiry arithmetic happens on the MySQL clock — the driver serialises
    // JS Dates in the Node process's local time, which differs from the DB
    // session tz (verified live 2026-09-15: UTC session vs. Bogotá UTC-5 process
    // clock skewed `expires_at` 5h into the past); see execution.md 2026-09-15 HITL.
    await this.handoffCodeRepository
      .createQueryBuilder()
      .insert()
      .into(BilateralHandoffCode)
      .values({
        code_hash: codeHash,
        user_id: user.id,
        center_code: dto.center_code,
        audience,
        expires_at: () =>
          `DATE_ADD(NOW(), INTERVAL ${HANDOFF_CODE_TTL_SECONDS} SECOND)`,
        // S5' / DD-4: copied so `exchange` can answer without re-reading the session.
        auth_method: user.auth_method ?? null,
      })
      .execute();

    // S6 / R-20 — opportunistic, best-effort purge; never fails the mint.
    await this.purgeExpired().catch((error: unknown) =>
      this.logger.warn(
        JSON.stringify({
          event: 'handoff.purge_failed',
          error: (error as { name?: string })?.name,
        }),
      ),
    );

    this.logStart(user.id, dto.center_code, audience, 'minted');

    return {
      code,
      expires_in: HANDOFF_CODE_TTL_SECONDS,
      redirect_url: this.buildRedirectUrl(callbackUrl, code, envLabel),
    };
  }

  /**
   * `exchange` — single, atomic redemption (E1) then claims assembly (E3).
   *
   * 🛑 No `SELECT`/`findOne`/`find` of the code row before this UPDATE (R-7, DoD).
   * The one read below happens AFTER a successful consume, which the DoD explicitly
   * allows — it is not the read-then-write the requirement forbids.
   */
  async exchange(
    dto: HandoffExchangeInput,
    platform?: ClarisaApiKeyValidationMis,
  ): Promise<HandoffClaims> {
    const codeHash = this.hashCode(dto.code);

    // @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-4, R-7, DD-2) — the
    // single compare-and-set UPDATE that makes redemption atomic and single-use.
    const updateResult = await this.handoffCodeRepository
      .createQueryBuilder()
      .update(BilateralHandoffCode)
      .set({
        consumed_at: () => 'NOW()',
        consumed_by_platform_id: platform?.id ?? null,
        consumed_by_platform_acronym: platform?.acronym ?? null,
      })
      .where('code_hash = :codeHash', { codeHash })
      .andWhere('audience = :audience', { audience: dto.audience })
      .andWhere('consumed_at IS NULL')
      .andWhere('expires_at > NOW()')
      .execute();

    if (updateResult.affected !== 1) {
      const reason = await this.classifyRejection(codeHash, dto.audience);
      this.logExchange(platform, `rejected:${reason}`);
      throw new BadRequestException(HANDOFF_INVALID_CODE_MESSAGE);
    }

    // One read, AFTER the successful consume, to assemble claims (allowed by DoD).
    const row = await this.handoffCodeRepository.findOne({
      where: { code_hash: codeHash },
    });

    const claims = await this.buildClaims(row, dto.audience);

    this.logExchange(
      platform,
      'redeemed',
      row.user_id,
      row.center_code,
      row.audience,
    );

    return claims;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async invalidateLiveCodes(userId: number): Promise<void> {
    await this.handoffCodeRepository
      .createQueryBuilder()
      .update(BilateralHandoffCode)
      .set({
        consumed_at: () => 'NOW()',
        consumed_by_platform_acronym: HANDOFF_SUPERSEDED_ACRONYM,
      })
      .where('user_id = :userId', { userId })
      .andWhere('consumed_at IS NULL')
      .andWhere('expires_at > NOW()')
      .execute();
  }

  /** S6: outside any transaction, best-effort, bounded batch. */
  private async purgeExpired(): Promise<void> {
    await this.handoffCodeRepository.query(
      `DELETE FROM bilateral_handoff_codes WHERE expires_at < (NOW() - ${HANDOFF_PURGE_RETENTION_SQL}) LIMIT 500`,
    );
  }

  /**
   * E2: derives the rejection reason ONLY for the audit log, from a read AFTER the
   * failed UPDATE. Best-effort — never throws, never changes the caller-visible
   * response, and the reason string is never logged alongside the code or its hash.
   */
  private async classifyRejection(
    codeHash: string,
    audience: string,
  ): Promise<string> {
    try {
      // Same invariant as `start`: the reason is derived on the MySQL clock, never
      // by comparing `expires_at` to `Date.now()` in JS.
      const row = await this.handoffCodeRepository
        .createQueryBuilder()
        .select('consumed_at IS NOT NULL', 'consumed')
        .addSelect('expires_at <= NOW()', 'expired')
        .addSelect('audience', 'audience')
        .where('code_hash = :codeHash', { codeHash })
        .getRawOne<{
          consumed: number | boolean;
          expired: number | boolean;
          audience: string | null;
        }>();

      if (!row) return 'unknown';
      if (Number(row.consumed)) return 'consumed';
      if (Number(row.expired)) return 'expired';
      if (row.audience !== audience) return 'audience';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /** E3: claims assembled at exchange time, never from the row (beyond `auth_method`). */
  private async buildClaims(
    row: BilateralHandoffCode,
    audience: string,
  ): Promise<HandoffClaims> {
    const [user, center, phase, isAdmin, roleRow] = await Promise.all([
      this.userRepository.getUserById(row.user_id),
      this.clarisaCentersRepository.findOne({
        where: { code: row.center_code },
      }),
      this.versioningService.$_findActivePhase(AppModuleIdEnum.REPORTING),
      this.roleByUserRepository.isUserAdmin(row.user_id),
      this.roleByUserRepository.findOne({
        where: { user: row.user_id, center_id: row.center_code, active: true },
        relations: ['obj_role'],
      }),
    ]);

    const institution = center?.institutionId
      ? await this.clarisaInstitutionsRepository.findOne({
          where: { id: center.institutionId },
        })
      : null;

    return {
      iss: this.deriveFrontBaseUrl(),
      aud: audience,
      // R-21: `iat` at redemption time, not mint time.
      iat: Math.floor(Date.now() / 1000),
      issued_for_env: this.getEnvLabel(),
      user: {
        user_id: row.user_id,
        email: user?.email ?? null,
        first_name: user?.first_name ?? null,
        last_name: user?.last_name ?? null,
        // R-9 legacy scenario: a session issued before this claim existed → null.
        auth_method: (row.auth_method as AuthMethod | null) ?? null,
      },
      center: {
        clarisa_code: row.center_code,
        acronym: institution?.acronym ?? null,
        name: institution?.name ?? null,
        institution_id: center?.institutionId ?? null,
      },
      role: {
        role_id: roleRow?.role ?? null,
        description: roleRow?.obj_role?.description ?? null,
        // R-9: `RoleByUserRepository.isUserAdmin` is typed `Promise<boolean>` but
        // returns `null` when no role_by_user row matches (e.g. a Center User,
        // whose row carries a non-null center_id) — coerce at this boundary so a
        // Center User's claims never serialise `is_admin` as anything but `false`.
        is_admin: isAdmin === true,
      },
      reporting_phase: {
        phase_id: phase?.id ?? null,
        name: phase?.phase_name ?? null,
        status: phase ? 'open' : null,
      },
    };
  }

  private resolveAudience(
    requested: string | undefined,
    configured: string[],
  ): string {
    if (!requested) {
      return configured[0];
    }
    if (!configured.includes(requested)) {
      throw new BadRequestException(HANDOFF_BAD_AUDIENCE_MESSAGE);
    }
    return requested;
  }

  private buildRedirectUrl(
    callbackUrl: string,
    code: string,
    env: string,
  ): string {
    const url = new URL(callbackUrl);
    if (!url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname}/`;
    }
    url.searchParams.set('code', code);
    url.searchParams.set('env', env);
    return url.toString();
  }

  /**
   * Same derivation `bilateral.service.ts#attachResultLinks` uses for `prms_link`,
   * reimplemented here rather than imported (`design.md` §5 E3 note) — a tiny,
   * independent helper so this module never depends on `BilateralService`.
   */
  private deriveFrontBaseUrl(): string {
    const pdfBase = (
      process.env.FRONT_END_PDF_ENDPOINT ??
      'https://reporting.cgiar.org/reports/result-details/'
    ).replace(/\/+$/, '');
    return (
      pdfBase.replace(/\/reports\/result-details$/, '') ||
      'https://reporting.cgiar.org'
    );
  }

  /** First = default (R-30). Read at call time so tests can set/unset per case. */
  private getConfiguredAudiences(): string[] {
    return (process.env.BULK_HANDOFF_AUDIENCES ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }

  private getCallbackUrl(): string | undefined {
    return process.env.BULK_HANDOFF_CALLBACK_URL?.trim() || undefined;
  }

  private getEnvLabel(): string {
    return process.env.BULK_HANDOFF_ENV?.trim() || '';
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  // ---------------------------------------------------------------------------
  // Observability (§9) — explicit field allow-lists only; DTOs/rows never spread.
  // ---------------------------------------------------------------------------

  private logStart(
    userId: number,
    centerCode: string,
    audience: string | undefined,
    outcome: 'minted' | 'forbidden' | 'unauthorized' | 'bad_audience',
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'handoff.start',
        userId,
        centerCode,
        audience,
        outcome,
      }),
    );
  }

  private logExchange(
    platform: ClarisaApiKeyValidationMis | undefined,
    outcome: string,
    userId?: number,
    centerCode?: string,
    audience?: string,
  ): void {
    const payload: Record<string, unknown> = {
      event: 'handoff.exchange',
      platformId: platform?.id ?? null,
      platformAcronym: platform?.acronym ?? null,
      outcome,
    };
    if (userId !== undefined) payload.userId = userId;
    if (centerCode !== undefined) payload.centerCode = centerCode;
    // R-11: the audience is a mandatory field of the exchange audit record and is
    // not secret — it is already logged on `handoff.start`.
    if (audience !== undefined) payload.audience = audience;

    this.logger.log(JSON.stringify(payload));
  }
}
