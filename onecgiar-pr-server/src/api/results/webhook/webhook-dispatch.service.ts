import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import { BilateralService } from '../../bilateral/bilateral.service';
import { ResultReviewHistoryRepository } from '../result-review-history/result-review-history.repository';
import {
  WEBHOOK_BACKOFF_BASE_MS,
  WEBHOOK_BATCH_SIZE,
  WEBHOOK_DELIVERY_ID_HEADER,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_REQUEST_TIMEOUT_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_STALE_SENDING_MS,
} from './webhook-dispatch.constants';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDeliveryRepository } from './webhook-delivery.repository';
import { WebhookAlertService } from './webhook-alert.service';

/**
 * P2-3166 AC2/AC4 — drains the outbox.
 *
 * Everything here runs outside the request that produced the decision, which is the whole point:
 * `ResultsService` only enqueued a row, so no third-party endpoint can affect the review response.
 *
 * Nothing in this file may log, store, or forward `endpoint.url` or `endpoint.secret` —
 * `docs/prd.md` AC-9 names webhooks explicitly and `.cursorrules` forbids even partial URLs in
 * output. Failures are reported by recipient acronym and delivery id.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly _logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly _deliveryRepository: WebhookDeliveryRepository,
    private readonly _bilateralService: BilateralService,
    private readonly _reviewHistoryRepository: ResultReviewHistoryRepository,
    private readonly _httpService: HttpService,
    private readonly _alertService: WebhookAlertService,
  ) {}

  /**
   * One pass over the outbox. Safe to run concurrently with itself: `claimDue` moves rows into
   * SENDING before anything is sent, so an overlapping pass finds nothing due rather than sending
   * twice.
   */
  async dispatchDue(now: Date = new Date()): Promise<void> {
    await this._deliveryRepository.releaseStale(
      new Date(now.getTime() - WEBHOOK_STALE_SENDING_MS),
    );

    const claimed = await this._deliveryRepository.claimDue(
      WEBHOOK_BATCH_SIZE,
      now,
    );

    if (!claimed.length) {
      return;
    }

    this._logger.log(`Dispatching ${claimed.length} webhook delivery(ies)`);

    for (const delivery of claimed) {
      await this.dispatchOne(delivery);
    }
  }

  private async dispatchOne(delivery: WebhookDelivery): Promise<void> {
    const endpoint = await this._deliveryRepository.findEndpointById(
      delivery.endpoint_id,
    );

    if (!endpoint || !endpoint.is_active) {
      // The endpoint was removed or disabled after the delivery was queued. Abandoning is the honest
      // outcome — there is nowhere to send it — but it must be recorded, not silently dropped.
      await this.settleExhausted(
        delivery,
        endpoint,
        'Endpoint missing or inactive at dispatch time',
        null,
      );
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = await this.buildPayload(delivery);
    } catch (error) {
      await this.settleFailure(
        delivery,
        endpoint,
        `Payload assembly failed: ${(error as Error).message}`,
        null,
      );
      return;
    }

    const body = JSON.stringify(payload);

    try {
      const response = await firstValueFrom(
        this._httpService.post(endpoint.url, body, {
          timeout: WEBHOOK_REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            [WEBHOOK_DELIVERY_ID_HEADER]: String(delivery.id),
            ...(endpoint.secret
              ? { [WEBHOOK_SIGNATURE_HEADER]: this.sign(body, endpoint.secret) }
              : {}),
          },
          // We settle every status code ourselves, so a 4xx must not throw before we can record it.
          validateStatus: () => true,
        }),
      );

      if (response.status >= 200 && response.status < 300) {
        await this._deliveryRepository.update(delivery.id, {
          status: WebhookDeliveryStatus.SENT,
          payload,
          attempts: delivery.attempts + 1,
          last_http_status: response.status,
          last_error: null,
          next_attempt_at: null,
        });

        this._logger.log(
          `Webhook delivery ${delivery.id} accepted by ${endpoint.recipient_acronym ?? endpoint.recipient_type} (HTTP ${response.status})`,
        );
        return;
      }

      await this.settleFailure(
        delivery,
        endpoint,
        `Recipient responded HTTP ${response.status}`,
        response.status,
        payload,
      );
    } catch (error) {
      // Timeouts and network errors land here. The message may embed the URL, so it is replaced
      // rather than stored (AC-9).
      await this.settleFailure(
        delivery,
        endpoint,
        this.sanitiseTransportError(error as Error),
        null,
        payload,
      );
    }
  }

  /**
   * AC2 — the body. No new serializer: `BilateralService.findOne` already produces the enriched
   * typed document that `GET /api/bilateral/results` hands to these same consumers, so a recipient
   * parses what it already knows. Only the decision and its justification are added on top.
   */
  private async buildPayload(
    delivery: WebhookDelivery,
  ): Promise<Record<string, unknown>> {
    const enriched = await this._bilateralService.findOne(delivery.result_id);
    const data = (enriched as { response?: unknown })?.response ?? null;

    const justification = await this.resolveJustification(delivery);

    return {
      result_id: Number(delivery.result_id),
      decision: delivery.decision,
      decided_at: new Date().toISOString(),
      // Omitted entirely when there is none — never an empty string. That is the contract P2-3157
      // fixed when it removed the hardcoded 'Approved' literal from the review history.
      ...(justification ? { justification } : {}),
      data,
    };
  }

  /**
   * AC2 requires the exact rejection justification. It lives in `result_review_history.comment`,
   * whose reader P2-3157 built; the most recent row for the result is the decision being reported.
   */
  private async resolveJustification(
    delivery: WebhookDelivery,
  ): Promise<string | null> {
    try {
      const history =
        await this._reviewHistoryRepository.getReviewHistoryByResultId(
          Number(delivery.result_id),
        );

      const comment = history?.[0]?.comment;
      const trimmed = typeof comment === 'string' ? comment.trim() : '';
      return trimmed.length ? trimmed : null;
    } catch (error) {
      this._logger.warn(
        `Could not resolve justification for delivery ${delivery.id}`,
        error as Error,
      );
      return null;
    }
  }

  private sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Axios puts the request URL in `message` and `config`. Since the URL must never be persisted or
   * logged, only the error's class and code survive.
   */
  private sanitiseTransportError(error: Error): string {
    const code = (error as { code?: string })?.code;
    return code ? `Transport error (${code})` : 'Transport error';
  }

  private async settleFailure(
    delivery: WebhookDelivery,
    endpoint: WebhookEndpoint,
    reason: string,
    httpStatus: number | null,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const attempts = delivery.attempts + 1;

    if (attempts >= WEBHOOK_MAX_ATTEMPTS) {
      await this.settleExhausted(
        delivery,
        endpoint,
        reason,
        httpStatus,
        payload,
      );
      return;
    }

    // Exponential: base, 2x, 4x … measured from now rather than from the previous schedule, so a
    // long outage does not produce a burst of immediately-due retries once it ends.
    const delayMs = WEBHOOK_BACKOFF_BASE_MS * 2 ** (attempts - 1);

    await this._deliveryRepository.update(delivery.id, {
      status: WebhookDeliveryStatus.FAILED,
      attempts,
      last_http_status: httpStatus,
      last_error: reason,
      next_attempt_at: new Date(Date.now() + delayMs),
      ...(payload ? { payload } : {}),
    });

    this._logger.warn(
      `Webhook delivery ${delivery.id} failed (attempt ${attempts}/${WEBHOOK_MAX_ATTEMPTS}): ${reason}. Retrying in ${Math.round(delayMs / 1000)}s`,
    );
  }

  private async settleExhausted(
    delivery: WebhookDelivery,
    endpoint: WebhookEndpoint | null,
    reason: string,
    httpStatus: number | null,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const attempts = delivery.attempts + 1;

    await this._deliveryRepository.update(delivery.id, {
      status: WebhookDeliveryStatus.EXHAUSTED,
      attempts,
      last_http_status: httpStatus,
      last_error: reason,
      next_attempt_at: null,
      ...(payload ? { payload } : {}),
    });

    this._logger.error(
      `Webhook delivery ${delivery.id} for result ${delivery.result_id} abandoned after ${attempts} attempt(s): ${reason}`,
    );

    // AC5. Guarded on `alerted_at` inside the repository, so re-running the cron over an already
    // abandoned row cannot send a second alert.
    const firstTime = await this._deliveryRepository.markAlerted(delivery.id);
    if (firstTime) {
      await this._alertService.alertDeliveryExhausted({
        deliveryId: Number(delivery.id),
        resultId: Number(delivery.result_id),
        recipientAcronym: endpoint?.recipient_acronym ?? null,
        httpStatus,
        reason,
        attempts,
      });
    }
  }
}
