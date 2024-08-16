import { Module } from '@nestjs/common';
import { EmailNotificationManagementService } from './email-notification-management.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from 'process';

@Module({
  providers: [EmailNotificationManagementService],
  imports: [
    ClientsModule.register([
      {
        name: 'EMAIL_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [env.RABBITMQ_URL],
          queue: 'cgiar_ms_test_mailer_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  exports: [EmailNotificationManagementService],
})
export class EmailNotificationManagementModule {}
