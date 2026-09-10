import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BilateralModule } from '../../bilateral/bilateral.module';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementModule } from '../../../shared/microservices/email-notification-management/email-notification-management.module';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultReviewHistoryRepository } from '../result-review-history/result-review-history.repository';
import { WebhookAlertService } from './webhook-alert.service';
import { WebhookDispatchCron } from './webhook-dispatch.cron';
import { WebhookDispatchService } from './webhook-dispatch.service';
import { WebhookOutboxModule } from './webhook-outbox.module';

/**
 * The read/send side of the P2-3166 outbox.
 *
 * **This module must stay a leaf.** It is registered directly in `app.module.ts` and nothing imports
 * it. That is deliberate: it depends on `BilateralModule` for the payload, and `BilateralModule`
 * already imports `ResultsModule`, so anything importing this one from inside that chain would close
 * a cycle. `ResultsModule` reaches the outbox through `WebhookOutboxModule` instead, which has no
 * service dependencies at all.
 *
 *   app.module → WebhookDispatchModule → BilateralModule → ResultsModule → WebhookOutboxModule
 *
 * `app.module.spec.ts` compiles the whole graph, so it is the regression test for that shape.
 *
 * The repositories below are provided locally rather than imported, following
 * `delete-recover-data.module.ts`, which does the same with `ResultReviewHistoryRepository`.
 */
@Module({
  imports: [
    WebhookOutboxModule,
    BilateralModule,
    EmailNotificationManagementModule,
    HttpModule,
  ],
  providers: [
    WebhookDispatchService,
    WebhookDispatchCron,
    WebhookAlertService,
    ResultReviewHistoryRepository,
    TemplateRepository,
    GlobalParameterRepository,
    HandlersError,
  ],
})
export class WebhookDispatchModule {}
