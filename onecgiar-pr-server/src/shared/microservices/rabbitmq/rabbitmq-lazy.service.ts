import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { env } from 'process';

/**
 * Lazy RabbitMQ Service
 *
 * This service provides lazy/on-demand connections to RabbitMQ.
 * In Lambda environments, it doesn't connect during bootstrap.
 * Connection only happens when a method actually needs RabbitMQ.
 *
 * If RabbitMQ is unavailable, methods fail gracefully without
 * affecting the rest of the API.
 */
@Injectable()
export class RabbitMQLazyService implements OnModuleDestroy {
  private readonly _logger = new Logger(RabbitMQLazyService.name);
  private _emailClient: ClientProxy | null = null;
  private _reportClient: ClientProxy | null = null;
  private _emailConnected = false;
  private _reportConnected = false;

  /**
   * Check if running in Lambda environment
   */
  private isLambda(): boolean {
    return !!env.AWS_LAMBDA_FUNCTION_NAME || !!env.LAMBDA_TASK_ROOT;
  }

  /**
   * Get or create Email Client (lazy)
   */
  private async getEmailClient(): Promise<ClientProxy | null> {
    if (!this._emailClient) {
      try {
        this._emailClient = ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [env.RABBITMQ_URL],
            queue: env.EMAIL_QUEUE,
            queueOptions: {
              durable: true,
            },
          },
        });
      } catch (error) {
        this._logger.error('Failed to create Email RabbitMQ client', error);
        return null;
      }
    }

    if (!this._emailConnected) {
      try {
        await this._emailClient.connect();
        this._emailConnected = true;
        this._logger.log('Connected to RabbitMQ Email Service (lazy)');
      } catch (error) {
        this._logger.error(
          'Failed to connect to RabbitMQ Email Service',
          error.message,
        );
        return null;
      }
    }

    return this._emailClient;
  }

  /**
   * Get or create Report Client (lazy)
   */
  private async getReportClient(): Promise<ClientProxy | null> {
    if (!this._reportClient) {
      try {
        this._reportClient = ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [env.RABBITMQ_URL],
            queue: env.REPORT_QUEUE,
            queueOptions: {
              durable: true,
            },
          },
        });
      } catch (error) {
        this._logger.error('Failed to create Report RabbitMQ client', error);
        return null;
      }
    }

    if (!this._reportConnected) {
      try {
        await this._reportClient.connect();
        this._reportConnected = true;
        this._logger.log('Connected to RabbitMQ Report Service (lazy)');
      } catch (error) {
        this._logger.error(
          'Failed to connect to RabbitMQ Report Service',
          error.message,
        );
        return null;
      }
    }

    return this._reportClient;
  }

  /**
   * Emit message to Email queue
   * Returns true if sent successfully, false otherwise
   */
  async emitEmail(pattern: string, data: any): Promise<boolean> {
    try {
      const client = await this.getEmailClient();
      if (!client) {
        this._logger.warn(
          `RabbitMQ Email unavailable, skipping emit: ${pattern}`,
        );
        return false;
      }
      client.emit(pattern, data);
      return true;
    } catch (error) {
      this._logger.error(`Failed to emit to Email queue: ${pattern}`, error);
      return false;
    }
  }

  /**
   * Emit message to Report queue
   * Returns true if sent successfully, false otherwise
   */
  async emitReport(pattern: string, data: any): Promise<boolean> {
    try {
      const client = await this.getReportClient();
      if (!client) {
        this._logger.warn(
          `RabbitMQ Report unavailable, skipping emit: ${pattern}`,
        );
        return false;
      }
      client.emit(pattern, data);
      return true;
    } catch (error) {
      this._logger.error(`Failed to emit to Report queue: ${pattern}`, error);
      return false;
    }
  }

  /**
   * Check if Email service is available
   */
  async isEmailAvailable(): Promise<boolean> {
    try {
      const client = await this.getEmailClient();
      return client !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if Report service is available
   */
  async isReportAvailable(): Promise<boolean> {
    try {
      const client = await this.getReportClient();
      return client !== null;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    try {
      if (this._emailClient) {
        await this._emailClient.close();
      }
      if (this._reportClient) {
        await this._reportClient.close();
      }
    } catch (error) {
      this._logger.error('Error closing RabbitMQ connections', error);
    }
  }
}
