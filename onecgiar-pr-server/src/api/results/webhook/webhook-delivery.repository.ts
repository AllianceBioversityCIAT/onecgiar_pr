import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import {
  WebhookEndpoint,
  WebhookRecipientType,
} from './entities/webhook-endpoint.entity';

/**
 * Outbox access for P2-3166.
 *
 * Deliberately a repository and not a service: `ResultsService` needs to enqueue, and
 * `BilateralModule` already imports `ResultsModule`. Anything that pulled `BilateralService` in
 * here — which the payload builder needs — would close a cycle. Enqueuing does not need the payload,
 * so this layer has no service dependencies at all and the dispatcher lives in its own module.
 * See `docs/specs/bilateral/webhook-external-platforms/design.md` §2.3.
 */
@Injectable()
export class WebhookDeliveryRepository extends Repository<WebhookDelivery> {
  private readonly _logger = new Logger(WebhookDeliveryRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super(WebhookDelivery, dataSource.createEntityManager());
  }

  private get endpoints(): Repository<WebhookEndpoint> {
    return this.dataSource.getRepository(WebhookEndpoint);
  }

  /**
   * The active endpoint for a recipient, or null. A missing endpoint is a normal state, not a
   * fault — a centre creating a bilateral result by hand has no platform to notify.
   */
  async findActiveEndpoint(
    recipientType: WebhookRecipientType,
    recipientId: number,
  ): Promise<WebhookEndpoint | null> {
    return this.endpoints.findOne({
      where: {
        recipient_type: recipientType,
        recipient_id: recipientId,
        is_active: true,
      },
    });
  }

  async findEndpointById(endpointId: number): Promise<WebhookEndpoint | null> {
    return this.endpoints.findOne({ where: { id: endpointId } });
  }

  /**
   * Enqueue one delivery. `payload` stays null on purpose — it is filled by the dispatcher at send
   * time, which is what keeps this call free of any dependency on the payload builder.
   */
  async enqueue(
    resultId: number,
    endpointId: number,
    decision: string,
  ): Promise<WebhookDelivery> {
    return this.save(
      this.create({
        result_id: resultId,
        endpoint_id: endpointId,
        decision,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        // Due immediately; the next cron tick picks it up.
        next_attempt_at: new Date(),
      }),
    );
  }

  /**
   * Claim up to `limit` due deliveries by moving them into SENDING, then return them.
   *
   * The claim happens in a single UPDATE **before** anything is sent, which is what makes a second
   * overlapping cron run a no-op instead of a duplicate POST. Reading first and updating afterwards
   * would leave exactly that window open.
   */
  async claimDue(
    limit: number,
    now: Date = new Date(),
  ): Promise<WebhookDelivery[]> {
    const due = await this.find({
      where: {
        status: In([
          WebhookDeliveryStatus.PENDING,
          WebhookDeliveryStatus.FAILED,
        ]),
        next_attempt_at: LessThanOrEqual(now),
      },
      order: { next_attempt_at: 'ASC' },
      take: limit,
    });

    if (!due.length) {
      return [];
    }

    const ids = due.map((delivery) => delivery.id);

    // Guarded on the same statuses the read used, so a row another run already claimed is not
    // stolen: the UPDATE simply does not match it.
    const claimed = await this.createQueryBuilder()
      .update(WebhookDelivery)
      .set({ status: WebhookDeliveryStatus.SENDING })
      .where('id IN (:...ids)', { ids })
      .andWhere('status IN (:...statuses)', {
        statuses: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED],
      })
      .execute();

    if (!claimed.affected) {
      return [];
    }

    return this.find({
      where: { id: In(ids), status: WebhookDeliveryStatus.SENDING },
    });
  }

  /** Recover rows a crash left mid-flight, so a stuck SENDING row is retried rather than lost. */
  async releaseStale(olderThan: Date): Promise<number> {
    const released = await this.createQueryBuilder()
      .update(WebhookDelivery)
      .set({ status: WebhookDeliveryStatus.FAILED })
      .where('status = :status', { status: WebhookDeliveryStatus.SENDING })
      .andWhere('last_updated_date <= :olderThan', { olderThan })
      .execute();

    if (released.affected) {
      this._logger.warn(
        `Released ${released.affected} webhook delivery row(s) stuck in SENDING`,
      );
    }

    return released.affected ?? 0;
  }

  /** Stamp `alerted_at` only if it is still null, so the AC5 alert is sent exactly once. */
  async markAlerted(
    deliveryId: number,
    when: Date = new Date(),
  ): Promise<boolean> {
    const updated = await this.createQueryBuilder()
      .update(WebhookDelivery)
      .set({ alerted_at: when })
      .where('id = :deliveryId', { deliveryId })
      .andWhere('alerted_at IS NULL')
      .execute();

    return !!updated.affected;
  }
}
