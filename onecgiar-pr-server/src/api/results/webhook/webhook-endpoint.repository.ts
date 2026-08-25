import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  WebhookEndpoint,
  WebhookRecipientType,
} from './entities/webhook-endpoint.entity';

/**
 * Read/write access to the webhook destinations.
 *
 * Split from `WebhookDeliveryRepository`, which reaches this table through a private getter. That
 * was fine while endpoints were only ever read; now that they have a write surface of their own
 * (the registration endpoint), they get their own repository.
 *
 * Like its sibling, this has no service dependencies — that is what keeps `WebhookOutboxModule`
 * importable from anywhere without closing a cycle.
 */
@Injectable()
export class WebhookEndpointRepository extends Repository<WebhookEndpoint> {
  constructor(private readonly dataSource: DataSource) {
    super(WebhookEndpoint, dataSource.createEntityManager());
  }

  /** The recipient's endpoint whether or not it is active — registration needs to see a disabled row. */
  async findForRecipient(
    recipientType: WebhookRecipientType,
    recipientId: number,
  ): Promise<WebhookEndpoint | null> {
    return this.findOne({
      where: { recipient_type: recipientType, recipient_id: recipientId },
    });
  }

  /**
   * One destination per recipient — the table's `UNIQUE (recipient_type, recipient_id)` makes that
   * a schema guarantee rather than a convention, so this is an update-or-insert on that pair.
   *
   * Re-registering an endpoint that was disabled reactivates it: a platform sending us a URL again
   * is asking to receive callbacks, and leaving it inactive would silently ignore that.
   *
   * `secret` is deliberately untouched. It is unused today (the dispatcher signs only when one
   * exists) and a future signing feature must not have its key silently reset by a URL change.
   */
  async upsertForRecipient(params: {
    recipientType: WebhookRecipientType;
    recipientId: number;
    recipientAcronym: string | null;
    url: string;
  }): Promise<WebhookEndpoint> {
    const existing = await this.findForRecipient(
      params.recipientType,
      params.recipientId,
    );

    if (existing) {
      await this.update(existing.id, {
        url: params.url,
        recipient_acronym: params.recipientAcronym,
        is_active: true,
      });

      return this.findOneOrFail({ where: { id: existing.id } });
    }

    return this.save(
      this.create({
        recipient_type: params.recipientType,
        recipient_id: params.recipientId,
        recipient_acronym: params.recipientAcronym,
        url: params.url,
        is_active: true,
      }),
    );
  }
}
