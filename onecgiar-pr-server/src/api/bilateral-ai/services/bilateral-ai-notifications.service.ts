import { Injectable, Logger, Optional } from '@nestjs/common';
import { env } from 'node:process';
import * as handlebars from 'handlebars';
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
  /** The exact `completed_date` this terminal state was written with. Defaults to `new Date()`
   * so a caller that just wrote the row a moment ago doesn't have to thread it through, but the
   * sweeper and `processJob` both pass the value they wrote, to keep the duration this method
   * computes in sync with the persisted row. */
  terminalDate?: Date;
}

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
    @Optional()
    private readonly emailService?: EmailNotificationManagementService,
  ) {}

  /**
   * Writes the in-app row (always) and dispatches the matching mail iff the job ran at least two
   * minutes from `queue_entry_date` to `terminalDate` (`APF-R-4`, `design.md` §5 "Terminal
   * notifications"). Called from `processJob`'s COMPLETED and final-FAILED branches and from
   * `BilateralAiSweeperCron`'s TIMED_OUT/QUEUE_STALLED flips — every call site passes the exact
   * `job_id`/`user_id`/`center_id`/source-key/`queue_entry_date` the row was flipped with, since
   * the log-only failure contract here means a bad read is silent, not thrown.
   */
  async notifyTerminal(
    job: BilateralAiJob,
    outcome: BilateralAiTerminalOutcome,
    options: NotifyTerminalOptions = {},
  ): Promise<void> {
    try {
      const terminalDate = options.terminalDate ?? new Date();
      const queueEntryDate = job.queue_entry_date ?? job.created_date;
      const elapsedMs = queueEntryDate
        ? terminalDate.getTime() - new Date(queueEntryDate).getTime()
        : Number.POSITIVE_INFINITY;
      const durationMinutes = Number.isFinite(elapsedMs)
        ? Math.max(0, Math.round(elapsedMs / 60_000))
        : 0;
      // Fail-open on a missing clock (never observed in practice — every job carries either
      // `retried_date` or `created_date`): mail rather than silently dropping the mail entirely.
      const mailEligible =
        !Number.isFinite(elapsedMs) || elapsedMs >= 2 * 60_000;

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

      if (mailEligible) {
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
