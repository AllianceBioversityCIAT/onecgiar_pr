import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { env } from 'process';
import { ConfigMessageDto } from './dto/send-email.dto';
import { EmailTemplate } from './enum/email-notification.enum';
import { BuildEmailDataDto } from './dto/email-template.dto';
import { RabbitMQLazyService } from '../rabbitmq/rabbitmq-lazy.service';

@Injectable()
export class EmailNotificationManagementService implements OnModuleInit {
  private readonly _logger = new Logger(
    EmailNotificationManagementService.name,
  );
  private authHeaderMs1 = {
    username: env.MS_NOTIFICATION_USER,
    password: env.MS_NOTIFICATION_PASSWORD,
  };

  constructor(
    @Optional()
    @Inject('EMAIL_SERVICE')
    private readonly _client: ClientProxy | null,
    @Optional() private readonly _lazyService: RabbitMQLazyService | null,
  ) {}

  /**
   * Check if running in Lambda environment
   */
  private isLambda(): boolean {
    return !!env.AWS_LAMBDA_FUNCTION_NAME || !!env.LAMBDA_TASK_ROOT;
  }

  async onModuleInit() {
    // In Lambda, skip automatic connection - use lazy connection instead
    if (this.isLambda()) {
      this._logger.log(
        'Lambda environment detected - RabbitMQ connection will be lazy',
      );
      return;
    }

    // In non-Lambda environments, connect normally
    if (this._client) {
      try {
        await this._client.connect();
        this._logger.log(
          'Successfully connected to RabbitMQ Email MicroService',
        );
      } catch (error) {
        this._logger.error(
          'Failed to connect to RabbitMQ Email MicroService',
          error.message,
        );
      }
    }
  }

  /**
   * Send email via RabbitMQ
   * Handles failures gracefully - API continues to work even if RabbitMQ is down
   */
  async sendEmail(configMessageDto: ConfigMessageDto): Promise<boolean> {
    const payload = {
      auth: this.authHeaderMs1,
      data: configMessageDto,
    };

    try {
      // In Lambda or when lazy service is available, use lazy connection
      if (this.isLambda() && this._lazyService) {
        const sent = await this._lazyService.emitEmail('send', payload);
        if (!sent) {
          this._logger.warn('Email not sent - RabbitMQ unavailable (Lambda)');
        }
        return sent;
      }

      // Standard connection
      if (this._client) {
        this._client.emit('send', payload);
        return true;
      }

      this._logger.warn('No RabbitMQ client available for sending email');
      return false;
    } catch (error) {
      this._logger.error('Failed to send email via RabbitMQ', error.message);
      return false;
    }
  }

  public buildEmailData(emailTemplate: EmailTemplate, data: BuildEmailDataDto) {
    switch (emailTemplate) {
      case EmailTemplate.CONTRIBUTION:
        return {
          cc: this.addPcuEmailToCC(data.user.email, data.pcuEmail),
          subject: `${this.addLabel()} ${data.initOwner.official_code} requests ${data.initContributing.official_code} to contribute to Result ${data.result.result_code} - `,
          initContributingName: data.initContributing.short_name,
          requesterName: `${data.user.first_name} ${data.user.last_name}`,
          initContributing: `${data.initContributing.official_code} ${data.initContributing.short_name}`,
          initOwner: `${data.initOwner.official_code} ${data.initOwner.short_name}`,
          resultUrl: `${env.RESULTS_URL}${data.result.result_code}/general-information?phase=${data.result.version_id}`,
          result: `${data.result.result_code} - ${data.result.title}`,
          resultNotificationUrl: `${env.NOTIFICATION_MODULE_URL}requests/received?phase=${data.result.version_id}&init=${data.initContributing.id}&search=${data.user.first_name} ${data.user.last_name} from ${data.initOwner.official_code} has requested inclusion of ${data.initContributing.official_code} as a contributor to result ${data.result.result_code} - ${data.result.title}`,
          notificationSettingUrl: `${env.NOTIFICATION_MODULE_URL}settings?init=${data.initContributing.id}`,
        };

      case EmailTemplate.REQUEST_AS_CONTRIBUTION:
        return {
          cc: this.addPcuEmailToCC(data.user.email, data.pcuEmail),
          subject: `${this.addLabel()} ${data.initContributing.official_code} requests to be added as contributor for Result ${data.result.result_code} - `,
          initOwnerName: data.initOwner.short_name,
          user: `${data.user.first_name} ${data.user.last_name}`,
          initContributing: `${data.initContributing.official_code} ${data.initContributing.short_name}`,
          resultUrl: `${env.RESULTS_URL}${data.result.result_code}/general-information?phase=${data.result.version_id}`,
          result: `${data.result.result_code} - ${data.result.title}`,
          resultNotificationUrl: `${env.NOTIFICATION_MODULE_URL}requests/received?phase=${data.result.version_id}&init=${data.initOwner.id}&search=${data.user.first_name} ${data.user.last_name} from ${data.initContributing.official_code} has requested contribution to result ${data.result.result_code} - ${data.result.title} submitted by ${data.initOwner.official_code}`,
          notificationSettingUrl: `${env.NOTIFICATION_MODULE_URL}settings?init=${data.initContributing.id}`,
          initOwner: `${data.initOwner.official_code} ${data.initOwner.short_name}`,
        };

      case EmailTemplate.REMOVED_CONTRIBUTION:
        return {
          cc: env.IS_PRODUCTION === 'true' ? [data.pcuEmail] : [],
          userEmmiter: `${data.user.first_name} ${data.user.last_name}`,
          subject: `${this.addLabel()} ${data.initContributing.official_code} has been removed as contributor for Result ${data.result.result_code} - `,
          initContributingName: data.initContributing.short_name,
          initContributing: `${data.initContributing.official_code} ${data.initContributing.short_name}`,
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

  addPcuEmailToCC(userEmail: string, pcuEmail: string): string[] {
    const cc = [userEmail];
    if (env.IS_PRODUCTION === 'true' && pcuEmail) {
      cc.push(pcuEmail);
    }
    return cc;
  }

  addLabel() {
    if (env.IS_PRODUCTION === 'false') {
      return '[PRMS Testing]';
    } else {
      return '[PRMS]';
    }
  }
}
