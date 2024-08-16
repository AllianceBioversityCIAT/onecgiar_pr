import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { env } from 'process';
import { ConfigMessageDto } from './dto/send-email.dto';

@Injectable()
export class EmailNotificationManagementService implements OnModuleInit {
  private readonly _logger = new Logger(
    EmailNotificationManagementService.name,
  );
  private authHeaderMs1 = {
    username: env.CLA_MICROSERVICE1_USER,
    password: env.CLA_MICROSERVICE1_PASSWORD,
  };

  constructor(@Inject('EMAIL_SERVICE') private readonly _client: ClientProxy) {}

  async onModuleInit() {
    try {
      await this._client.connect();
      this._logger.log('Successfully connected to RabbitMQ Email MicroService');
    } catch (error) {
      this._logger.error(
        'Failed to connect to RabbitMQ Email MicroService',
        error,
      );
    }
  }

  async sendEmail(configMessageDto: ConfigMessageDto) {
    const payload = {
      auth: this.authHeaderMs1,
      data: configMessageDto,
    };
    this._client.emit('send', payload);
  }
}
