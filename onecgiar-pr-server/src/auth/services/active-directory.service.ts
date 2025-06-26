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
   * Search users by name or email - TESTING WITH findUser FIRST
   */
  async searchUsers(query: string): Promise<ADUser[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      this.logger.log(`Searching AD users: ${query}`);

      this.logger.debug('AD Config check:', {
        hasConfig: !!config.active_directory,
        hasUrl: !!config.active_directory?.url,
        hasBaseDN: !!config.active_directory?.baseDN,
        url: config.active_directory?.url ? 'SET' : 'MISSING',
      });

      const ad = new ActiveDirectory(config.active_directory);

      return new Promise((resolve, reject) => {
        ad.findUser(query, (err, user) => {
          if (err) {
            if (err.errno == 'ENOTFOUND') {
              const notFound = {
                name: 'SERVER_NOT_FOUND',
                description: 'Domain Controller Server not found',
                httpCode: 500,
              };
              reject(notFound);
              return;
            } else {
              const e = {
                name: 'SERVER_ERROR',
                description: err.lde_message,
                httpcode: 500,
              };
              reject(e);
              return;
            }
          }

          if (!user) {
            this.logger.debug(`User '${query}' not found`);
            resolve([]);
            return;
          }

          this.logger.log(`Found user: ${user.displayName || user.cn}`);
          resolve([user]);
        });
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
