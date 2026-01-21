import { Module } from '@nestjs/common';
import { EmailNotificationManagementService } from './email-notification-management.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from 'process';
import { RabbitMQLazyModule } from '../rabbitmq/rabbitmq-lazy.module';

/**
 * Check if running in Lambda environment
 */
const isLambda = (): boolean => {
  return !!env.AWS_LAMBDA_FUNCTION_NAME || !!env.LAMBDA_TASK_ROOT;
};

@Module({
  providers: [EmailNotificationManagementService],
  imports: [
    // Import lazy module for Lambda support
    RabbitMQLazyModule,
    // Only register ClientsModule if not in Lambda
    // This prevents automatic connection during bootstrap
    ...(isLambda()
      ? []
      : [
          ClientsModule.register([
            {
              name: 'EMAIL_SERVICE',
              transport: Transport.RMQ,
              options: {
                urls: [env.RABBITMQ_URL],
                queue: env.EMAIL_QUEUE,
                queueOptions: {
                  durable: true,
                },
              },
            },
          ]),
        ]),
  ],
  exports: [EmailNotificationManagementService],
})
export class EmailNotificationManagementModule {}
