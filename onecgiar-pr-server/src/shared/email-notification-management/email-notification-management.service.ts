import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { env } from 'process';
import { ConfigMessageDto } from './dto/send-email.dto';
import { BuildEmailDataDto } from './dto/email-template.dto';
import { EmailTemplate } from './enum/email-notification.enum';

@Injectable()
export class EmailNotificationManagementService implements OnModuleInit {
  private readonly _logger = new Logger(
    EmailNotificationManagementService.name,
  );
  private authHeaderMs1 = {
    username: env.MS_NOTIFICATION_USER,
    password: env.MS_NOTIFICATION_PASSWORD,
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

  sendEmail(configMessageDto: ConfigMessageDto) {
    const payload = {
      auth: this.authHeaderMs1,
      data: configMessageDto,
    };
    this._client.emit('send', payload);
  }

  public buildEmailData(emailTemplate: EmailTemplate, data: BuildEmailDataDto) {
    switch (emailTemplate) {
      case EmailTemplate.CONTRIBUTION:
        return {
          subject: `[PRMS] Result Contributing: ${data.initOwner.official_code} confirmation required for contribution to Result ${data.result.result_code}`,
          initContributingName: data.initContributing.name,
          requesterName: `${data.user.first_name} ${data.user.last_name}`,
          initOwner: `${data.initOwner.official_code} ${data.initOwner.name}`,
          resultUrl: `${env.RESULTS_URL}${data.result.result_code}/general-information?phase=${data.result.version_id}`,
          result: `${data.result.result_code} - ${data.result.title}`,
          resultNotificationUrl: `${env.NOTIFICATION_MODULE_URL}requests/received?phase=${data.result.version_id}&init=${data.initContributing.id}&search=${data.result.result_code} - ${data.result.title}`,
          notificationSettingUrl: `${env.NOTIFICATION_MODULE_URL}settings?init=${data.initContributing.id}`,
        };

      case EmailTemplate.REQUEST_AS_CONTRIBUTION:
        return {
          subject: `[PRMS] Result Contribution: ${data.initContributing.official_code} requests to be added as contributor for Result ${data.result.result_code}`,
          initOwnerName: data.initOwner.name,
          user: `${data.user.first_name} ${data.user.last_name}`,
          initContributing: data.initContributing.name,
          resultUrl: `${env.RESULTS_URL}${data.result.result_code}/general-information?phase=${data.result.version_id}`,
          result: `${data.result.result_code} - ${data.result.title}`,
          resultNotificationUrl: `${env.NOTIFICATION_MODULE_URL}requests/received?phase=${data.result.version_id}&init=${data.initOwner.id}&search=${data.result.result_code} - ${data.result.title} - ${data.initContributing.official_code}`,
          notificationSettingUrl: `${env.NOTIFICATION_MODULE_URL}settings?init=${data.initContributing.id}`,
        };

      case EmailTemplate.REMOVED_CONTRIBUTION:
        return {
          subject: `[PRMS] Result Contribution: ${data.initContributing.official_code} has been removed as contributor for Result ${data.result.result_code}`,
          initContributingName: data.initContributing.name,
          initContributing: `${data.initContributing.official_code} ${data.initContributing.name}`,
          resultUrl: `${env.RESULTS_URL}${data.result.result_code}/general-information?phase=${data.result.version_id}`,
          result: `${data.result.result_code} - ${data.result.title}`,
          initOwner: `${data.initOwner.official_code} ${data.initOwner.name}`,
          notificationSettingUrl: `${env.NOTIFICATION_MODULE_URL}settings?init=${data.initContributing.id}`,
        };

      default:
        throw new Error(
          `No email data configuration found for template ${emailTemplate}`,
        );
    }
  }
}
