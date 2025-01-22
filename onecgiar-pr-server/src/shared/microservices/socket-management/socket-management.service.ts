import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { env } from 'process';
import { NotificationDto } from './dto/create-socket.dto';
import axios from 'axios';

@Injectable()
export class SocketManagementService implements OnModuleInit {
  private readonly _logger = new Logger(SocketManagementService.name);
  private readonly url = env.SOCKET_URL;

  async onModuleInit() {
    try {
      this._logger.log(
        `Successfully connected to Sockets Microservice ${this.url}`,
      );
    } catch (error) {
      this._logger.error(error);
    }
  }

  async getActiveUsers() {
    try {
      const response = await axios.get(
        `${this.url}/socket/users/${this.environmentCheck()}`,
      );
      const data = response.data;

      return {
        response: data.clients,
        message: 'Active users fetched successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async sendNotificationToUsers(
    userIds: string[],
    notification: NotificationDto,
  ) {
    try {
      if (!userIds) {
        this._logger.warn('No users online to send notification');
        return {
          response: null,
          message: 'No users online to send notification',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const response = await axios.post(`${this.url}/socket/notification`, {
        userIds,
        platform: this.environmentCheck(),
        notification,
      });
      const data = response.data;

      return {
        response: data,
        message: 'Notification sent successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message: 'An error occurred while sending notification',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  private environmentCheck() {
    if (process.env.IS_PRODUCTION === 'true') {
      return 'PRMS-PROD';
    } else {
      return 'PRMS-TEST';
    }
  }
}
