import { Global, Module } from '@nestjs/common';
import { RabbitMQLazyService } from './rabbitmq-lazy.service';

/**
 * Global RabbitMQ Lazy Module
 *
 * Provides lazy RabbitMQ connections that work well in Lambda.
 * Import this module once in AppModule to make RabbitMQLazyService
 * available everywhere.
 */
@Global()
@Module({
  providers: [RabbitMQLazyService],
  exports: [RabbitMQLazyService],
})
export class RabbitMQLazyModule {}
