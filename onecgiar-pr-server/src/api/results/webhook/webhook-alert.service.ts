import { Injectable, Logger, Optional } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { env } from 'node:process';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';

export interface WebhookExhaustedAlert {
  deliveryId: number;
  resultId: number;
  recipientAcronym: string | null;
  httpStatus: number | null;
  reason: string;
  attempts: number;
}

/**
 * P2-3166 AC5 — tells the PRMS technical team when a delivery has been permanently abandoned.
 *
 * Follows the established email path exactly: look the body up in the `template` table, render it
 * with handlebars, and hand the rendered HTML to `sendEmail` as `socketFile`. Same as
 * `UserService.sendUserStatusChangedEmail` and the four other flows that mail the technical team.
 * Recipients come from the `technical_team_email` global parameter, which already exists and is
 * already used by five flows — no new configuration surface.
 *
 * **Declared deviation.** AC5 asks for "Result ID, Destination URL, Error Code". The URL is
 * deliberately absent: `docs/prd.md` AC-9 names webhooks among the things that "MUST NEVER be
 * logged, printed, or echoed", and `.cursorrules` forbids webhook URLs "completas o parciales" in
 * output. The alert carries the recipient acronym and the `webhook_delivery.id`, which is enough to
 * find the row — and through it the URL — in `webhook_endpoint`. AC5's purpose is served without
 * breaking the rule. See `docs/specs/bilateral/webhook-external-platforms/requirements.md` §5.
 *
 * One honest limit: `sendEmail` is `emit` — fire-and-forget over RMQ — so the mail is best-effort.
 * The durable half of AC5 is the EXHAUSTED row, which is queryable and replayable. That is why the
 * feature was built on an outbox rather than a queue.
 */
@Injectable()
export class WebhookAlertService {
  private readonly _logger = new Logger(WebhookAlertService.name);

  constructor(
    private readonly _templateRepository: TemplateRepository,
    private readonly _globalParameterRepository: GlobalParameterRepository,
    @Optional()
    private readonly _emailService?: EmailNotificationManagementService,
  ) {}

  async alertDeliveryExhausted(alert: WebhookExhaustedAlert): Promise<void> {
    // Logged unconditionally, so an abandonment is visible even if the mail cannot be produced.
    this._logger.error(
      `Webhook delivery ${alert.deliveryId} (result ${alert.resultId}, recipient ${
        alert.recipientAcronym ?? 'unknown'
      }) exhausted after ${alert.attempts} attempt(s): ${alert.reason}`,
    );

    if (!this._emailService) {
      this._logger.warn(
        `Email service unavailable; webhook failure for delivery ${alert.deliveryId} recorded in webhook_delivery only`,
      );
      return;
    }

    try {
      const templateRow = await this._templateRepository.findOne({
        where: { name: EmailTemplate.WEBHOOK_DELIVERY_FAILED },
      });

      if (!templateRow) {
        // Same posture as `UserService`: a missing template skips the mail rather than throwing.
        this._logger.warn(
          `Email template ${EmailTemplate.WEBHOOK_DELIVERY_FAILED} not found; skipping webhook failure alert for delivery ${alert.deliveryId}`,
        );
        return;
      }

      const recipients = await this.resolveTechnicalTeamRecipients();
      if (!recipients.length) {
        this._logger.warn(
          `No technical_team_email configured; skipping webhook failure alert for delivery ${alert.deliveryId}`,
        );
        return;
      }

      const compiled = handlebars.compile(templateRow.template);

      // Every field here is safe to render. `errorCode` falls back to the sanitised transport
      // reason, which the dispatcher already stripped of any URL.
      const body = compiled({
        result_id: alert.resultId,
        delivery_id: alert.deliveryId,
        recipient: alert.recipientAcronym ?? 'unknown',
        error_code: alert.httpStatus ? String(alert.httpStatus) : alert.reason,
        attempts: alert.attempts,
      });

      this._emailService.sendEmail({
        from: {
          email: env.EMAIL_SENDER,
          name: 'PRMS Reporting Tool -',
        },
        emailBody: {
          subject: `${this.label()} Webhook delivery failed for result ${alert.resultId}`,
          to: recipients,
          cc: [],
          bcc: '',
          message: {
            text: `Webhook delivery ${alert.deliveryId} for result ${alert.resultId} was abandoned after ${alert.attempts} attempts.`,
            socketFile: body,
          },
        },
      });
    } catch (error) {
      // An alert that cannot be sent must not become a second failure — the row already records it.
      this._logger.error(
        `Failed to dispatch webhook failure alert for delivery ${alert.deliveryId}`,
        error as Error,
      );
    }
  }

  private async resolveTechnicalTeamRecipients(): Promise<string[]> {
    const record = await this._globalParameterRepository.findOne({
      where: { name: 'technical_team_email' },
      select: { value: true },
    });

    return (record?.value ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter((address) => address.length > 0);
  }

  /** Mirrors `EmailNotificationManagementService.addLabel` so alerts are recognisable per env. */
  private label(): string {
    return env.IS_PRODUCTION === 'true' ? '[PRMS]' : '[PRMS Testing]';
  }
}
