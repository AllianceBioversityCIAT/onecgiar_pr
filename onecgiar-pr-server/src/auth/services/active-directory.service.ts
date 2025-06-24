import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import ActiveDirectory from 'activedirectory';
import config from '../../config/const.config';

export interface ADUser {
  cn?: string;
  displayName?: string;
  mail?: string;
  sAMAccountName?: string;
  givenName?: string;
  sn?: string;
  userPrincipalName?: string;
}

@Injectable()
export class ActiveDirectoryService {
  private readonly logger = new Logger(ActiveDirectoryService.name);

  /**
   * Search users by name or email - SUPER SIMPLE VERSION
   */
  async searchUsers(query: string): Promise<ADUser[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      this.logger.log(`Searching AD users: ${query}`);

      const ad = new ActiveDirectory(config.active_directory);

      const filter = `(|(cn=*${query}*)(mail=*${query}*))`;

      return new Promise((resolve, reject) => {
        ad.findUsers(
          {
            filter: filter,
            attributes: [
              'cn',
              'displayName',
              'mail',
              'sAMAccountName',
              'givenName',
              'sn',
              'userPrincipalName',
            ],
          },
          (err, users) => {
            if (err) {
              this.logger.error('AD search error:', err.message);
              reject(err);
              return;
            }

            if (!users) {
              resolve([]);
              return;
            }

            const userArray = Array.isArray(users) ? users : [users];
            resolve(userArray);
          },
        );
      });
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      throw new HttpException(
        'Error searching users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
