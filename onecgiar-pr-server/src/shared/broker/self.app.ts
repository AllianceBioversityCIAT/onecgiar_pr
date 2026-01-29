import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
@Injectable()
export class SelfApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(SelfApp.name);

  constructor() {
    super(env.RABBITMQ_QUEUE);
  }


}
