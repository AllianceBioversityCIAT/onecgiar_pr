// @akili-spec changes/replicated-innovation-reminders
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as handlebars from 'handlebars';
import { env } from 'node:process';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../shared/microservices/email-notification-management/enum/email-notification.enum';
import {
  build,
  BuildResult,
  MailRecipient,
  PendingInnovationRowV2,
  ReminderMessage,
  ReminderMessageType,
  UnreachableItem,
} from './digest-builder';
import { parseDevelopers } from './developer-parser';
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
  /** Sent counts of this run, per message type (the campaign table only persists totals). */
  sentByType: Record<ReminderMessageType, number>;
  /** Dry run only: the messages that would be sent (same build path as a real dispatch). */
  messages?: ReminderMessage[];
  /** Dry run only. */
  unreachableRows?: UnreachableItem[];
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
/** Lookup-only template rows of the MELIA summary and the center email (created by the T-10 migration). */
const MELIA_SUMMARY_TEMPLATE =
  'email_template_replicated_innovation_melia_summary';
const CENTER_TEMPLATE = 'email_template_replicated_innovation_center';
const KIND_LABEL: Record<ReplicatedReminderKind, string> = {
  [ReplicatedReminderKind.Q4_NOTICE]: 'Q4 notice',
  [ReplicatedReminderKind.FINAL_REMINDER]: 'Final reminder',
};
const INNOVATION_DEVELOPMENT = 7;
const BILATERAL_SOURCE = 'API';

/** Pending rows plus everything `build` produced from them (design §15.2). */
export interface DispatchPlan extends BuildResult {
  rows: PendingInnovationRowV2[];
}

type Counts = {
  sent: number;
  skipped: number;
  failed: number;
  unreachable: number;
  sentByType: Record<ReminderMessageType, number>;
};

/**
 * `RIR-T-4` — the single code path behind the hourly cron and "Send now" (`RIR-R-7`, design §2.2,
 * `RIR-DD-1`/`DD-2`).
 *
 * Exactly-once is decided in MySQL: a status-guarded claim, then a UNIQUE send-log row INSERTed
 * BEFORE each emit, keyed per message (`message_key`: DEVELOPER:<email> | MELIA_SUMMARY:<sp id> |
 * CENTER:<center code>; `ER_DUP_ENTRY` = someone else owns that message, so skip). Delivery is
 * therefore at-most-once per message: an emit that throws after its log row counts as `failed`
 * and is not retried automatically. An address may receive more than one message type.
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

  /**
   * Revision 2 build path (design §15.2), shared by dispatch, the dry-run preview and the GET
   * counts: pending rows -> developer emails -> active PRMS users, SP MELIA and center MEL maps ->
   * `build`. Read-only.
   */
  async plan(versionId: number): Promise<DispatchPlan> {
    const rows = await this._pendingRepository.findPending(versionId);

    // RIR-R-16/17: only type-7 W1/W2 rows have a developer field to parse (W3 never routes to developers).
    const developerEmails = new Set<string>();
    for (const row of rows) {
      if (
        row.source === BILATERAL_SOURCE ||
        row.result_type_id !== INNOVATION_DEVELOPMENT
      ) {
        continue;
      }
      for (const dev of parseDevelopers(row.developer_text)) {
        if (dev.email) developerEmails.add(dev.email);
      }
    }
    const activeRows = await this._pendingRepository.findActiveUserEmails([
      ...developerEmails,
    ]);
    const activeUsers = new Map<string, { name: string }>(
      activeRows.map((u) => [u.email.toLowerCase(), { name: u.name }]),
    );

    const initiativeIds = [
      ...new Set(
        rows
          .filter((r) => r.source !== BILATERAL_SOURCE)
          .map((r) => r.initiative_id),
      ),
    ];
    const meliaByInitiative = new Map<number, MailRecipient[]>();
    for (const m of await this._pendingRepository.findMeliaByInitiatives(
      initiativeIds,
    )) {
      const list = meliaByInitiative.get(m.initiative_id);
      const entry = { name: m.name, email: m.email };
      if (list) list.push(entry);
      else meliaByInitiative.set(m.initiative_id, [entry]);
    }

    const centerCodes = [
      ...new Set(
        rows
          .filter((r) => r.source === BILATERAL_SOURCE && r.lead_center_code)
          .map((r) => r.lead_center_code as string),
      ),
    ];
    const centerMelByCenter = new Map<string, MailRecipient[]>();
    for (const m of await this._pendingRepository.findCenterMel(centerCodes)) {
      const list = centerMelByCenter.get(m.center_code);
      const entry = { name: m.name, email: m.email };
      if (list) list.push(entry);
      else centerMelByCenter.set(m.center_code, [entry]);
    }

    return {
      rows,
      ...build({ rows, activeUsers, meliaByInitiative, centerMelByCenter }),
    };
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

      const { messages, unreachable } = await this.plan(campaign.version_id);
      counts.unreachable = unreachable.length;

      if (dryRun) {
        this._logger.log(
          `dispatch dry-run campaign=${campaignId} messages=${messages.length} unreachable=${unreachable.length}`,
        );
        return {
          ...this.outcome('DRY_RUN', null),
          unreachable: unreachable.length,
          messages,
          unreachableRows: unreachable,
          ...(isProd ? {} : { redirectedTo: testEmail || undefined }),
        };
      }

      // Every template this run needs is fetched and compiled ONCE, before the first send, so a
      // missing row fails the whole run cleanly instead of half-sending.
      const compiled = new Map<string, handlebars.TemplateDelegate>();
      for (const name of new Set(
        messages.map((m) => this.templateNameFor(m.type, campaign.kind)),
      )) {
        const row = await this._templateRepository.findOne({
          where: { name },
        });
        if (!row?.template) {
          lastError = `email template ${name} not found`;
          return await this.end(
            campaign,
            claimedAt,
            counts,
            lastError,
            startedAt,
          );
        }
        compiled.set(name, handlebars.compile(row.template));
      }
      const subject = this.buildSubject(campaign, isProd);

      const batchSize = await this.readPositiveInt(
        'rir_batch_size',
        DEFAULTS.batchSize,
      );
      const pauseMs = await this.readPositiveInt(
        'rir_batch_pause_ms',
        DEFAULTS.pauseMs,
      );

      for (let i = 0; i < messages.length; i += batchSize) {
        if (i > 0) await this.sleep(pauseMs);
        for (const message of messages.slice(i, i + batchSize)) {
          await this.sendMessage(
            campaign,
            message,
            compiled.get(this.templateNameFor(message.type, campaign.kind)),
            subject,
            isProd ? null : testEmail,
            counts,
          );
        }
      }
    } catch (error) {
      this._logger.error(
        `dispatch campaign=${campaignId} aborted: ${this.safeReason(error)}`,
      );
      // RIR-R-9: a dry run never claims, logs or finalizes. Surface the failure (global handler -> 5xx)
      // instead of returning an empty preview.
      if (dryRun) {
        // Not the raw error: a driver error may carry bound addresses (AC-9).
        throw new InternalServerErrorException(
          `preview failed: ${this.safeReason(error)}`,
        );
      }
      lastError = `dispatch error: ${this.safeReason(error)}`;
    }

    return this.end(campaign, claimedAt, counts, lastError, startedAt);
  }

  /** One message: log INSERT first, then emit. Never throws; failures are counted. */
  private async sendMessage(
    campaign: ReplicatedInnovationReminderCampaign,
    message: ReminderMessage,
    compiled: handlebars.TemplateDelegate,
    subject: string,
    redirectTo: string | null,
    counts: Counts,
  ): Promise<void> {
    try {
      try {
        await this._campaignRepository.insertLog({
          campaign_id: Number(campaign.id),
          message_key: message.messageKey,
          // The INTENDED first To address (audit), never the non-prod redirect address.
          recipient_email: (message.to[0] ?? '').trim().toLowerCase(),
          result_ids: message.results.map((r) => r.result_id).join(','),
          cc_count: message.cc.length,
          redirected: redirectTo !== null,
        });
      } catch (error) {
        if (isDuplicateEntryError(error)) {
          counts.skipped += 1;
          return;
        }
        throw error;
      }

      const phaseYear = Number(campaign.obj_version?.phase_year);
      const body = compiled({
        kindLabel: KIND_LABEL[campaign.kind],
        leadName: message.greetingName,
        phaseYear,
        nextYear: phaseYear + 1,
        resultCount: message.results.length,
        spCode: message.spCode,
        spName: message.spName ?? '',
        centerName: message.centerName || message.centerCode,
        results: message.results.map((r) => ({
          resultCode: r.result_code,
          resultTitle: r.title,
          resultTypeName: RESULT_TYPE_NAMES[r.result_type_id] ?? '',
          spCode: r.initiative_code,
          spName: r.initiative_short_name ?? '',
          resultUrl: `${env.RESULTS_URL}${r.result_code}/general-information?phase=${r.version_id}`,
          developerText: r.developerText ?? '',
        })),
        ...(redirectTo !== null
          ? {
              intendedTo: message.to.join(', '),
              intendedCc: message.cc.length ? message.cc.join(', ') : undefined,
            }
          : {}),
      });

      this._emailService.sendEmail({
        from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
        emailBody: {
          subject,
          // One email to every To address of the message (the DTO takes a list).
          to: redirectTo !== null ? [redirectTo] : message.to,
          cc: redirectTo !== null ? [] : message.cc,
          bcc: '',
          message: {
            text: `${message.results.length} replicated innovation(s) are pending update.`,
            socketFile: body,
          },
        },
      });
      counts.sent += 1;
      counts.sentByType[message.type] += 1;
    } catch (error) {
      counts.failed += 1;
      this._logger.error(
        `message failed campaign=${campaign.id} type=${message.type}: ${this.safeReason(error)}`,
      );
    }
  }

  private templateNameFor(
    type: ReminderMessageType,
    kind: ReplicatedReminderKind,
  ): string {
    if (type === 'MELIA_SUMMARY') return MELIA_SUMMARY_TEMPLATE;
    if (type === 'CENTER') return CENTER_TEMPLATE;
    return TEMPLATE_BY_KIND[kind];
  }

  private async end(
    campaign: ReplicatedInnovationReminderCampaign,
    claimedAt: Date,
    counts: Counts,
    lastError: string | null,
    startedAt: number,
  ): Promise<DispatchOutcome> {
    const failedRun = counts.failed > 0 || lastError !== null;
    if (lastError === null && counts.failed > 0) {
      lastError = `${counts.failed} message(s) failed to send`;
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
        sentByType: counts.sentByType,
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
      sentByType: counts.sentByType,
      last_error: lastError,
    };
  }

  private async finalize(
    id: number,
    claimedAt: Date,
    counts: Counts,
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

  private buildSubject(
    campaign: ReplicatedInnovationReminderCampaign,
    isProd: boolean,
  ): string {
    const phase = campaign.obj_version?.phase_name ?? '';
    const year = campaign.obj_version?.phase_year ?? '';
    // RIR-R-11 / RIR-OQ-6; the en dash is part of Nicoleta's copy.
    const lead =
      campaign.kind === ReplicatedReminderKind.FINAL_REMINDER
        ? 'Final reminder:'
        : 'Reminder:';
    // Own isProd (not addLabel()): an unset IS_PRODUCTION must still say Testing, as RIR-R-12 treats it as non-prod.
    const label = isProd ? '[PRMS]' : '[PRMS Testing]';
    return `${label} ${lead} innovations pending a ${year} update \u2013 ${phase}`;
  }

  private counts(): Counts {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      unreachable: 0,
      sentByType: this.zeroByType(),
    };
  }

  private zeroByType(): Record<ReminderMessageType, number> {
    return { DEVELOPER: 0, MELIA_SUMMARY: 0, CENTER: 0 };
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
      sentByType: this.zeroByType(),
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
