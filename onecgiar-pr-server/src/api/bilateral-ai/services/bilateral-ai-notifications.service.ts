import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { env } from 'node:process';
import * as handlebars from 'handlebars';
import { Repository } from 'typeorm';
import { BilateralAiJob } from '../entities/bilateral-ai-job.entity';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { NotificationService } from '../../notification/notification.service';

/** The three shapes `notifyTerminal` renders (`design.md` §6.4). `results_ready` covers both the
 * on-time and the `late` ("arrived after all") variant of `APF-R-4`'s COMPLETED/result_count>0
 * row. */
export type BilateralAiTerminalOutcome =
  | 'results_ready'
  | 'no_candidates'
  | 'failed';

export interface NotifyTerminalOptions {
  /** Overrides `job.result_count` — the count as of the write this notification follows, in
   * case the caller has a fresher value than the row it read before writing (`processJob`'s
   * COMPLETED branch always does). */
  resultCount?: number;
  /** `true` when the row was `FAILED`/`TIMED_OUT` immediately before this terminal write —
   * the mining response arrived after the sweeper already gave up on the job (`APF-R-2` A). */
  late?: boolean;
}
// Removed (timezone-skew fix): `terminalDate?: Date`. Callers used to pass the JS instant they had
// just written into `completed_date`; that instant lived in the Node process's zone while
// `queue_entry_date` lives in the DB's, so `terminalDate − queue_entry_date` could be off by the
// whole offset. The duration is now read back from the row with `TIMESTAMPDIFF` instead.

/**
 * `APF-T-3` — one notification per terminal bilateral AI job state (`design.md` §5 "Terminal
 * notifications", §6.4). Split out of `BilateralAiService` on purpose (per the Leader's brief)
 * so that already-large file does not grow further; this service owns the outcome copy, the
 * mail-eligibility rule and the mail dispatch, while the in-app row write itself is delegated to
 * `NotificationService.emitBilateralAiJobNotification` — the design's "not through
 * `emitResultNotification`" seam (`design.md` §6.4 "Write path").
 *
 * Never throws: every public entry point is wrapped so a notification failure cannot fail the
 * job it is reporting on (`APF-R-4` "AND IT MUST never fail the job because a notification
 * failed").
 */
@Injectable()
export class BilateralAiNotificationsService {
  private readonly logger = new Logger(BilateralAiNotificationsService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
    private readonly clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly templateRepository: TemplateRepository,
    // Only ever read here, and only to let MySQL compute the queue duration (`queueElapsedSeconds`)
    // — this service writes no job row. `BilateralAiJob` is already in `BilateralModule`'s
    // `TypeOrmModule.forFeature`, so no module change is needed.
    @InjectRepository(BilateralAiJob)
    private readonly jobRepository: Repository<BilateralAiJob>,
    @Optional()
    private readonly emailService?: EmailNotificationManagementService,
  ) {}

  /**
   * Writes the in-app row (always) and dispatches the matching mail iff the job ran at least two
   * minutes from `queue_entry_date` to its terminal instant (`APF-R-4`, `design.md` §5 "Terminal
   * notifications"). Called from `processJob`'s COMPLETED and final-FAILED branches and from
   * `BilateralAiSweeperCron`'s TIMED_OUT/QUEUE_STALLED flips — every call site passes the exact
   * `job_id`/`user_id`/`center_id`/source-key the row was flipped with, since the log-only
   * failure contract here means a bad read is silent, not thrown.
   *
   * The duration is measured by MySQL from the persisted row (`queueElapsedSeconds`), never from
   * the calling process's clock — see that method for the timezone-skew this fixes.
   */
  async notifyTerminal(
    job: BilateralAiJob,
    outcome: BilateralAiTerminalOutcome,
    options: NotifyTerminalOptions = {},
  ): Promise<void> {
    try {
      // Was: `elapsedMs = (options.terminalDate ?? new Date()).getTime() -
      // new Date(job.queue_entry_date ?? job.created_date).getTime()`.
      const elapsedSeconds = await this.queueElapsedSeconds(job.job_id);
      const durationMinutes =
        elapsedSeconds == null
          ? 0
          : Math.max(0, Math.round(elapsedSeconds / 60));
      const institution = await this.clarisaInstitutionsRepository.findOne({
        where: { id: job.center_id },
      });
      const centerAcronym = institution?.acronym ?? 'your centre';
      const link = this.buildDeepLink(job, outcome, institution?.acronym);
      const mix = this.describeSourceMix(job);
      const resultCount = options.resultCount ?? job.result_count ?? 0;
      const late = options.late ?? false;

      const copy = this.buildOutcomeCopy(outcome, {
        centerAcronym,
        mix,
        durationMinutes,
        resultCount,
        late,
        errorCode: job.error_code,
      });
      // `design.md` §6.4 "Write path": the row is `text` = the outcome copy, plus the deep link.
      await this.notificationService.emitBilateralAiJobNotification(
        job.user_id,
        `${copy} ${link}`,
      );

      // AIN-R-3 / AIN-DD-1: Bilateral AI outbound emails are suppressed per client mandate.
      // In-app notifications via emitBilateralAiJobNotification above are the sole notification channel.
      // sendTerminalMail invocation is bypassed to ensure zero outbound emails while preserving helper dependencies.
      if (false as boolean) {
        await this.sendTerminalMail(job, outcome, {
          centerAcronym,
          link,
          durationMinutes,
          resultCount,
          late,
          mix,
        });
      }
    } catch (error) {
      // AC-9 / `design.md` §5 "Logging": jobId, outcome, error_code and the failure's name/code
      // only — never `error.message`, which can carry mail bodies, template text or other payload
      // content (Reviewer finding, attempt 2).
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn(
        `Bilateral AI terminal notification failed (jobId=${job.job_id}, outcome=${outcome}, error_code=${job.error_code ?? 'none'}, error_name=${errorName}).`,
      );
    }
  }

  /**
   * Whole seconds from `queue_entry_date` to the job's terminal instant, computed **by MySQL**:
   * `TIMESTAMPDIFF(SECOND, queue_entry_date, COALESCE(completed_date, NOW()))`.
   *
   * Timezone-skew fix (post-archive bug on `bilateral/ai-processing-feedback`): `queue_entry_date`
   * is a STORED generated column MySQL fills in its own session zone, while the `terminalDate`
   * this method used to receive was a JS `Date` serialized by mysql2 in the **Node process's**
   * zone (there is no `timezone` option in `src/config/orm.config.ts`). Subtracting one from the
   * other on a Bogota laptop against a UTC database was off by 5 h — enough to flip the 2-minute
   * mail rule in both directions and to print a nonsense "· N min" in the in-app row copy. Both
   * operands and `NOW()` now live in the same (database) zone, so the difference is correct
   * whatever zone the API, the consumer or the cron happens to run in.
   *
   * `COALESCE(…, NOW())` covers the one caller that notifies without a terminal write of its own;
   * every caller in this module writes `completed_date` immediately before notifying.
   *
   * Returns `null` when the duration cannot be read — a missing row, a NULL clock or a failed
   * query. Callers fail open on `null` (mail rather than drop), exactly as the previous
   * `Number.POSITIVE_INFINITY` branch did. The local try/catch is deliberate: this extra read must
   * never be the reason the in-app notification row is skipped (`APF-R-4` "never fail the job
   * because a notification failed").
   */
  private async queueElapsedSeconds(jobId: string): Promise<number | null> {
    try {
      const row = await this.jobRepository
        .createQueryBuilder('job')
        .select(
          'TIMESTAMPDIFF(SECOND, job.queue_entry_date, COALESCE(job.completed_date, NOW()))',
          'seconds',
        )
        .where('job.job_id = :jobId', { jobId })
        .getRawOne<{ seconds: number | string | null }>();
      if (row?.seconds == null) return null;
      const seconds = Number(row.seconds);
      return Number.isFinite(seconds) ? seconds : null;
    } catch {
      return null;
    }
  }

  private buildDeepLink(
    job: BilateralAiJob,
    outcome: BilateralAiTerminalOutcome,
    acronym: string | null | undefined,
  ): string {
    const frontendBase = this.resolveFrontendBase();
    const acronymSegment = acronym ? this.encodeAcronymForUrl(acronym) : null;
    if (outcome === 'failed') {
      return acronymSegment
        ? `${frontendBase}/bilateral/${acronymSegment}/create?job=${job.job_id}`
        : frontendBase;
    }
    return acronymSegment
      ? `${frontendBase}/bilateral/${acronymSegment}/drafts`
      : frontendBase;
  }

  /**
   * Same derivation `sendResultsReadyEmail` used before this task (kept verbatim): the PDF
   * endpoint env var, with its `/reports/result-details` suffix stripped, is the frontend origin.
   */
  private resolveFrontendBase(): string {
    const pdfBase = (
      env.FRONT_END_PDF_ENDPOINT ??
      'https://reporting.cgiar.org/reports/result-details/'
    ).replace(/\/+$/, '');
    return (
      pdfBase.replace(/\/reports\/result-details$/, '') ||
      'https://reporting.cgiar.org'
    );
  }

  /**
   * A centre acronym is a URL path segment and MUST be encoded: `encodeURIComponent` leaves `(`
   * and `)` alone and some mail clients still cut the link at those, so they are hex-encoded by
   * hand (2026-09-07 incident, preserved from `sendResultsReadyEmail`).
   */
  private encodeAcronymForUrl(acronym: string): string {
    return encodeURIComponent(acronym).replace(
      /[()]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  private describeSourceMix(
    job: Pick<BilateralAiJob, 'document_keys' | 'audio_keys'>,
  ): string {
    const docs = job.document_keys?.length ?? 0;
    const audio = job.audio_keys?.length ?? 0;
    const parts: string[] = [];
    if (docs > 0) parts.push(`${docs} document${docs === 1 ? '' : 's'}`);
    if (audio > 0) parts.push(`${audio} audio file${audio === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' · ') : 'no sources';
  }

  private describeFailureCause(errorCode: string | null): string {
    switch (errorCode) {
      case 'TIMED_OUT':
        return 'the AI service did not respond in time';
      case 'QUEUE_STALLED':
        return 'no AI worker picked up the job in time';
      case 'QUEUE_NOT_AVAILABLE':
        return 'the AI processing queue was unavailable';
      case 'PROCESSING_ERROR':
        return 'the AI service reported a processing error';
      default:
        return errorCode
          ? `the AI service reported an error (${errorCode})`
          : 'the AI service reported an error';
    }
  }

  private buildOutcomeCopy(
    outcome: BilateralAiTerminalOutcome,
    ctx: {
      centerAcronym: string;
      mix: string;
      durationMinutes: number;
      resultCount: number;
      late: boolean;
      errorCode: string | null;
    },
  ): string {
    const tail = `${ctx.mix} · ${ctx.durationMinutes} min`;
    switch (outcome) {
      case 'results_ready': {
        const plural = ctx.resultCount === 1 ? '' : 's';
        return ctx.late
          ? `AI-assisted processing finished — ${ctx.resultCount} draft${plural} arrived after all for ${ctx.centerAcronym} · ${tail}`
          : `AI-assisted processing finished — ${ctx.resultCount} draft${plural} ready for ${ctx.centerAcronym} · ${tail}`;
      }
      case 'no_candidates':
        return `AI-assisted processing finished — found no results for ${ctx.centerAcronym} · ${tail}`;
      case 'failed':
        return `AI-assisted processing finished — failed for ${ctx.centerAcronym}: ${this.describeFailureCause(ctx.errorCode)} · ${tail}`;
    }
  }

  /**
   * @deprecated Suppressed under AIN-R-3 / AIN-DD-1 per client mandate. Bilateral AI terminal
   * notifications are now delivered exclusively in-platform. Retained for reference or future opt-in.
   */
  private async sendTerminalMail(
    job: BilateralAiJob,
    outcome: BilateralAiTerminalOutcome,
    ctx: {
      centerAcronym: string;
      link: string;
      durationMinutes: number;
      resultCount: number;
      late: boolean;
      mix: string;
    },
  ): Promise<void> {
    if (!this.emailService) {
      this.logger.warn(
        `Email service unavailable; AI terminal mail skipped (jobId=${job.job_id}).`,
      );
      return;
    }
    const user = await this.userRepository.findOne({
      where: { id: job.user_id },
      select: { email: true, first_name: true },
    });
    if (!user?.email) {
      this.logger.warn(
        `User email unresolved; AI terminal mail skipped (jobId=${job.job_id}).`,
      );
      return;
    }

    const templateKey = this.templateForOutcome(outcome);
    const templateRow = await this.templateRepository.findOne({
      where: { name: templateKey },
    });
    if (!templateRow?.template) {
      this.logger.warn(
        `Email template ${templateKey} not found; AI terminal mail skipped (jobId=${job.job_id}).`,
      );
      return;
    }

    const compiled = handlebars.compile(templateRow.template);
    const sourceCount =
      (job.document_keys?.length ?? 0) + (job.audio_keys?.length ?? 0);
    const userName = user.first_name || 'there';

    let variables: Record<string, unknown>;
    let subject: string;
    switch (outcome) {
      case 'results_ready':
        variables = {
          user_name: userName,
          center_acronym: ctx.centerAcronym,
          result_count: ctx.resultCount,
          result_plural: ctx.resultCount === 1 ? '' : 's',
          drafts_url: ctx.link,
          late: ctx.late,
        };
        subject = `[PRMS] Your AI-identified result${ctx.resultCount === 1 ? ' is' : 's are'} ready for review`;
        break;
      case 'no_candidates':
        variables = {
          user_name: userName,
          center_acronym: ctx.centerAcronym,
          source_plural: sourceCount === 1 ? '' : 's',
          source_mix: ctx.mix,
          duration_minutes: ctx.durationMinutes,
          create_url: ctx.link,
        };
        subject = '[PRMS] Your AI-assisted processing found no results';
        break;
      case 'failed':
        variables = {
          user_name: userName,
          center_acronym: ctx.centerAcronym,
          error_cause: this.describeFailureCause(job.error_code),
          retry_url: ctx.link,
        };
        subject = '[PRMS] Your AI-assisted processing failed';
        break;
    }

    const body = compiled(variables);
    this.emailService.sendEmail({
      from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
      emailBody: {
        subject,
        to: [user.email],
        cc: [],
        bcc: '',
        message: {
          text: subject,
          socketFile: body,
        },
      },
    });
  }

  private templateForOutcome(
    outcome: BilateralAiTerminalOutcome,
  ): EmailTemplate {
    switch (outcome) {
      case 'results_ready':
        return EmailTemplate.BILATERAL_AI_RESULTS_READY;
      case 'no_candidates':
        return EmailTemplate.BILATERAL_AI_NO_CANDIDATES;
      case 'failed':
        return EmailTemplate.BILATERAL_AI_FAILED;
    }
  }
}
