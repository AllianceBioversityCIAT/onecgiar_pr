import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { NotificationDto } from './dto/create-socket.dto';

@Injectable()
export class SocketManagementService {
  private readonly _logger = new Logger(SocketManagementService.name);
  private readonly url = env.SOCKET_URL;

  async getActiveUsers() {
    try {
      const response = await fetch(`${this.url}/socket/users`);
      const data = await response.json();

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

  async sendNotificationToUsers(userIds: number[], notification: NotificationDto) {
    try {
      const response = await fetch(`${this.url}/socket/notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds,
          platformPrefix: 'PRMS',
          notification,
        }),
      });
      const data = await response.json();

      return {
        response: data,
        message: 'Notification sent successfully',
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
}
