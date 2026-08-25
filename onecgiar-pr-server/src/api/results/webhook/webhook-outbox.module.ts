import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDeliveryRepository } from './webhook-delivery.repository';
import { WebhookEndpointRepository } from './webhook-endpoint.repository';

/**
 * The write side of the P2-3166 outbox, and nothing else.
 *
 * This module has no service dependencies by design. `ResultsModule` imports it to enqueue, and
 * `BilateralModule` already imports `ResultsModule` — so if the dispatcher (which needs
 * `BilateralService` for the payload) lived here, the graph would cycle. The dispatcher is a
 * separate module registered straight in `app.module.ts` and imported by nobody.
 *
 * Keep it that way: adding a service import here is what would break it.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery])],
  providers: [WebhookDeliveryRepository, WebhookEndpointRepository],
  exports: [WebhookDeliveryRepository, WebhookEndpointRepository],
})
export class WebhookOutboxModule {}
