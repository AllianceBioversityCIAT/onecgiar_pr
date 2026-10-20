// @akili-spec changes/replicated-innovation-reminders
import { Injectable, Logger } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { env } from 'node:process';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { buildDigests, Digest, PendingRow } from './digest-builder';
import {
  ReplicatedInnovationReminderCampaign,
  ReplicatedReminderKind,
  ReplicatedReminderStatus,
} from './entities/replicated-innovation-reminder-campaign.entity';
import { PendingInnovationRepository } from './repositories/pending-innovation.repository';
import {
  isDuplicateEntryError,
  ReminderCampaignRepository,
} from './repositories/reminder-campaign.repository';

export interface DispatchOptions {
  dryRun?: boolean;
  /** Send now: a FAILED campaign may be re-claimed. The cron never sets it. */
  allowRetry?: boolean;
}

export type DispatchResultKind =
  | 'DONE'
  | 'DRY_RUN'
  | 'CLAIM_LOST'
  | 'NOT_FOUND'
  /** The run finished but its result could not be saved (the claim was lost meanwhile). */
  | 'NOT_SAVED';

/** What a dispatch did. Counts are of this run. `digests` / `unreachableRows` only on a dry run. */
export interface DispatchOutcome {
  result: DispatchResultKind;
  status: ReplicatedReminderStatus | null;
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
  last_error: string | null;
  digests?: Digest[];
  unreachableRows?: PendingRow[];
  /** Non-production only: the single address every send is redirected to. */
  redirectedTo?: string;
}

const DEFAULTS = { batchSize: 25, pauseMs: 2000, staleMinutes: 60 };
const RESULT_TYPE_NAMES: Record<number, string> = {
  2: 'Innovation use',
  7: 'Innovation development',
};
const LAST_ERROR_MAX = 500;
/** `last_error` of a non-prod run with nowhere to redirect to; the service maps it to 412. */
export const EMPTY_TEST_RECIPIENT_ERROR = 'test recipient not configured';
const TEMPLATE_BY_KIND: Record<ReplicatedReminderKind, EmailTemplate> = {
  [ReplicatedReminderKind.Q4_NOTICE]:
    EmailTemplate.REPLICATED_INNOVATION_Q4_NOTICE,
  [ReplicatedReminderKind.FINAL_REMINDER]:
    EmailTemplate.REPLICATED_INNOVATION_FINAL_REMINDER,
};

/**
 * `RIR-T-4` — the single code path behind the hourly cron and "Send now" (`RIR-R-7`, design §2.2,
 * `RIR-DD-1`/`DD-2`).
 *
 * Exactly-once is decided in MySQL: a status-guarded claim, then a UNIQUE send-log row INSERTed
 * BEFORE each emit (`ER_DUP_ENTRY` = someone else owns that recipient, so skip). Delivery is
 * therefore at-most-once per recipient: an emit that throws after its log row counts as `failed`
 * and is not retried automatically.
 *
 * Logs carry campaign ids and counts only. Errors are reduced to their class name / code before
 * being logged or stored, because a driver or SMTP message may contain an address (AC-9).
 */
@Injectable()
export class ReminderDispatcher {
  private readonly _logger = new Logger(ReminderDispatcher.name);

  constructor(
    private readonly _campaignRepository: ReminderCampaignRepository,
    private readonly _pendingRepository: PendingInnovationRepository,
    private readonly _templateRepository: TemplateRepository,
    private readonly _globalParameterRepository: GlobalParameterRepository,
    private readonly _emailService: EmailNotificationManagementService,
  ) {}

  /** Cron entry: release stale claims, then dispatch every due PENDING campaign, one at a time. */
  async dispatchDue(): Promise<DispatchOutcome[]> {
    const staleMinutes = await this.readPositiveInt(
      'rir_stale_sending_minutes',
      DEFAULTS.staleMinutes,
    );
    const now = Date.now();
    const released = await this._campaignRepository.releaseStale(
      new Date(now - staleMinutes * 60_000),
    );
    if (released) {
      this._logger.warn(`released ${released} stale SENDING campaign(s)`);
    }

    const ids = await this._campaignRepository.findDueIds(new Date(now));
    const outcomes: DispatchOutcome[] = [];
    for (const id of ids) {
      try {
        outcomes.push(
          await this.dispatch(id, { dryRun: false, allowRetry: false }),
        );
      } catch (error) {
        this._logger.error(
          `dispatch campaign=${id} crashed: ${this.safeReason(error)}`,
        );
      }
    }
    return outcomes;
  }

  async dispatch(
    campaignId: number,
    options: DispatchOptions = {},
  ): Promise<DispatchOutcome> {
    const dryRun = !!options.dryRun;
    const startedAt = Date.now();
    const isProd = env.IS_PRODUCTION === 'true';

    // MySQL `datetime` has whole-second precision: the claim stamp is floored so the same value
    // can be compared back in `finalize`.
    const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

    if (!dryRun) {
      const allowed = options.allowRetry
        ? [ReplicatedReminderStatus.PENDING, ReplicatedReminderStatus.FAILED]
        : [ReplicatedReminderStatus.PENDING];
      const claimed = await this._campaignRepository.claim(
        campaignId,
        claimedAt,
        allowed,
      );
      if (!claimed) {
        this._logger.debug(`claim lost campaign=${campaignId}`);
        return this.outcome('CLAIM_LOST', null);
      }
    }

    const campaign = await this._campaignRepository.findWithPhase(campaignId);
    if (!campaign) {
      if (!dryRun) {
        const saved = await this.finalize(
          campaignId,
          claimedAt,
          this.counts(),
          'campaign not found',
        );
        this._logger.log(
          `dispatch end campaign=${campaignId} status=${ReplicatedReminderStatus.FAILED} sent=0 skipped=0 failed=0 unreachable=0 saved=${saved} ms=${Date.now() - startedAt}`,
        );
      }
      return this.outcome(
        'NOT_FOUND',
        dryRun ? null : ReplicatedReminderStatus.FAILED,
      );
    }

    this._logger.log(
      `dispatch start campaign=${campaignId} kind=${campaign.kind} phase=${campaign.version_id}${dryRun ? ' dryRun=true' : ''}`,
    );

    const counts = this.counts();
    let lastError: string | null = null;
    try {
      const testEmail = isProd ? '' : await this.readTestRecipient();
      if (!isProd && !testEmail && !dryRun) {
        lastError = EMPTY_TEST_RECIPIENT_ERROR;
        return await this.end(
          campaign,
          claimedAt,
          counts,
          lastError,
          startedAt,
        );
      }

      const rows = await this._pendingRepository.findPending(
        campaign.version_id,
      );
      const initiativeIds = [...new Set(rows.map((r) => r.initiative_id))];
      const cc =
        await this._pendingRepository.findCcByInitiatives(initiativeIds);
      const { digests, unreachable } = buildDigests(rows, cc);
      counts.unreachable = unreachable.length;

      if (dryRun) {
        this._logger.log(
          `dispatch dry-run campaign=${campaignId} digests=${digests.length} unreachable=${unreachable.length}`,
        );
        return {
          ...this.outcome('DRY_RUN', null),
          unreachable: unreachable.length,
          digests,
          unreachableRows: unreachable,
          ...(isProd ? {} : { redirectedTo: testEmail || undefined }),
        };
      }

      const templateName = TEMPLATE_BY_KIND[campaign.kind];
      const templateRow = templateName
        ? await this._templateRepository.findOne({
            where: { name: templateName },
          })
        : null;
      if (!templateRow?.template) {
        lastError = `email template ${templateName ?? campaign.kind} not found`;
        return await this.end(
          campaign,
          claimedAt,
          counts,
          lastError,
          startedAt,
        );
      }
      const compiled = handlebars.compile(templateRow.template);
      const subject = this.buildSubject(campaign);

      const batchSize = await this.readPositiveInt(
        'rir_batch_size',
        DEFAULTS.batchSize,
      );
      const pauseMs = await this.readPositiveInt(
        'rir_batch_pause_ms',
        DEFAULTS.pauseMs,
      );

      for (let i = 0; i < digests.length; i += batchSize) {
        if (i > 0) await this.sleep(pauseMs);
        for (const digest of digests.slice(i, i + batchSize)) {
          await this.sendDigest(
            campaign,
            digest,
            compiled,
            subject,
            isProd ? null : testEmail,
            counts,
          );
        }
      }
    } catch (error) {
      lastError = `dispatch error: ${this.safeReason(error)}`;
      this._logger.error(
        `dispatch campaign=${campaignId} aborted: ${this.safeReason(error)}`,
      );
    }

    return this.end(campaign, claimedAt, counts, lastError, startedAt);
  }

  /** One digest: log INSERT first, then emit. Never throws; failures are counted. */
  private async sendDigest(
    campaign: ReplicatedInnovationReminderCampaign,
    digest: Digest,
    compiled: handlebars.TemplateDelegate,
    subject: string,
    redirectTo: string | null,
    counts: ReturnType<ReminderDispatcher['counts']>,
  ): Promise<void> {
    try {
      try {
        await this._campaignRepository.insertLog({
          campaign_id: Number(campaign.id),
          recipient_email: digest.to,
          result_ids: digest.results.map((r) => r.result_id).join(','),
          cc_count: digest.cc.length,
          redirected: redirectTo !== null,
        });
      } catch (error) {
        if (isDuplicateEntryError(error)) {
          counts.skipped += 1;
          return;
        }
        throw error;
      }

      const body = compiled({
        leadName: digest.lead_name?.trim() || 'colleague',
        phaseName: campaign.obj_version?.phase_name ?? '',
        resultCount: digest.results.length,
        results: digest.results.map((r) => ({
          resultCode: r.result_code,
          resultTitle: r.title,
          resultTypeName: RESULT_TYPE_NAMES[r.result_type_id] ?? '',
          spCode: r.initiative_code,
          spName: r.initiative_short_name ?? '',
          resultUrl: `${env.RESULTS_URL}${r.result_code}/general-information?phase=${r.version_id}`,
        })),
        ...(redirectTo !== null
          ? {
              intendedTo: digest.to,
              intendedCc: digest.cc.length ? digest.cc.join(', ') : undefined,
            }
          : {}),
      });

      this._emailService.sendEmail({
        from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
        emailBody: {
          subject,
          to: [redirectTo ?? digest.to],
          cc: redirectTo !== null ? [] : digest.cc,
          bcc: '',
          message: {
            text: `${digest.results.length} replicated innovation(s) are pending update.`,
            socketFile: body,
          },
        },
      });
      counts.sent += 1;
    } catch (error) {
      counts.failed += 1;
      this._logger.error(
        `digest failed campaign=${campaign.id}: ${this.safeReason(error)}`,
      );
    }
  }

  private async end(
    campaign: ReplicatedInnovationReminderCampaign,
    claimedAt: Date,
    counts: ReturnType<ReminderDispatcher['counts']>,
    lastError: string | null,
    startedAt: number,
  ): Promise<DispatchOutcome> {
    const failedRun = counts.failed > 0 || lastError !== null;
    if (lastError === null && counts.failed > 0) {
      lastError = `${counts.failed} digest(s) failed to send`;
    }
    const status = failedRun
      ? ReplicatedReminderStatus.FAILED
      : ReplicatedReminderStatus.SENT;
    const saved = await this.finalize(
      Number(campaign.id),
      claimedAt,
      counts,
      lastError,
      status,
    );
    if (!saved) {
      this._logger.warn(
        `dispatch end campaign=${campaign.id} result NOT saved (claim lost) sent=${counts.sent} skipped=${counts.skipped} failed=${counts.failed} ms=${Date.now() - startedAt}`,
      );
      return {
        ...this.outcome('NOT_SAVED', null),
        sent: counts.sent,
        skipped: counts.skipped,
        failed: counts.failed,
        unreachable: counts.unreachable,
        last_error: lastError,
      };
    }
    this._logger.log(
      `dispatch end campaign=${campaign.id} status=${status} sent=${counts.sent} skipped=${counts.skipped} failed=${counts.failed} unreachable=${counts.unreachable} ms=${Date.now() - startedAt}`,
    );
    return {
      ...this.outcome('DONE', status),
      sent: counts.sent,
      skipped: counts.skipped,
      failed: counts.failed,
      unreachable: counts.unreachable,
      last_error: lastError,
    };
  }

  private async finalize(
    id: number,
    claimedAt: Date,
    counts: ReturnType<ReminderDispatcher['counts']>,
    lastError: string | null,
    status:
      | ReplicatedReminderStatus.SENT
      | ReplicatedReminderStatus.FAILED = ReplicatedReminderStatus.FAILED,
  ): Promise<boolean> {
    return this._campaignRepository.finalize(id, claimedAt, {
      status,
      sent_count: counts.sent,
      skipped_count: counts.skipped,
      failed_count: counts.failed,
      unreachable_count: counts.unreachable,
      last_error: lastError ? lastError.slice(0, LAST_ERROR_MAX) : null,
      sent_at: new Date(),
    });
  }

  private buildSubject(campaign: ReplicatedInnovationReminderCampaign): string {
    const phase = campaign.obj_version?.phase_name ?? '';
    const kind =
      campaign.kind === ReplicatedReminderKind.FINAL_REMINDER
        ? 'Final reminder'
        : 'Reminder';
    return `${this._emailService.addLabel()} ${kind}: replicated innovations pending update - ${phase}`;
  }

  private counts() {
    return { sent: 0, skipped: 0, failed: 0, unreachable: 0 };
  }

  private outcome(
    result: DispatchResultKind,
    status: ReplicatedReminderStatus | null,
  ): DispatchOutcome {
    return {
      result,
      status,
      sent: 0,
      skipped: 0,
      failed: 0,
      unreachable: 0,
      last_error: null,
    };
  }

  private async readParam(name: string): Promise<string> {
    const record = await this._globalParameterRepository.findOne({
      where: { name },
      select: { value: true },
    });
    return (record?.value ?? '').trim();
  }

  private readTestRecipient(): Promise<string> {
    return this.readParam('rir_test_recipient_email');
  }

  private async readPositiveInt(
    name: string,
    fallback: number,
  ): Promise<number> {
    const parsed = Number.parseInt(await this.readParam(name), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /** Error class and code only: messages from the driver or SMTP layer may carry an address. */
  private safeReason(error: any): string {
    const name = error?.constructor?.name ?? 'Error';
    const code = error?.code ?? error?.driverError?.code;
    return code ? `${name} ${String(code)}` : String(name);
  }

  /** Injectable seam so specs do not wait. */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
