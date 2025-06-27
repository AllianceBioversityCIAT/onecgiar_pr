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
   * Search users by name, mail or sAMAccountName (partial match)
   */
  async searchUsers(query: string): Promise<ADUser[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      this.logger.log(`Searching AD users: ${query}`);
      this.logger.debug('AD Config check:', {
        hasConfig: !!config.active_directory,
        url: config.active_directory?.url,
        baseDN: config.active_directory?.baseDN,
        username: config.active_directory?.username,
      });

      const ad = new ActiveDirectory(config.active_directory);
      const filter = `(|(displayName=*${query}*)(mail=*${query}*)(sAMAccountName=*${query}*))`;
      return new Promise((resolve, reject) => {
        ad.findUsers(filter, true, (err, users) => {
          if (err) {
            this.logger.error(`Error searching user: ${err}`, err);
            reject({
              name: 'SERVER_ERROR',
              description: err.lde_message || err.message,
              httpCode: 500,
            });
            return;
          }
          if (!users || users.length === 0) {
            this.logger.debug(`No users found for '${query}'`);
            resolve([]);
            return;
          }
          this.logger.log(`Found ${users.length} user(s)`);
          resolve(users);
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
  /**
   * Authenticate user with Active Directory credentials
   */
  async authenticate(username: string, password: string): Promise<boolean> {
    try {
      if (!username || !password) {
        throw new HttpException(
          'Username and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.log(`Authenticating AD user: ${username}`);
      const ad = new ActiveDirectory(config.active_directory);
      return new Promise((resolve, reject) => {
        ad.authenticate(username, password, (err, auth) => {
          if (err) {
            this.logger.error(`AD authentication error: ${err}`);
            reject(
              new HttpException(
                'Authentication failed',
                HttpStatus.UNAUTHORIZED,
              ),
            );
            return;
          }
          if (auth) {
            this.logger.log(`User ${username} authenticated successfully`);
            resolve(true);
          } else {
            this.logger.warn(`Authentication failed for user: ${username}`);
            reject(
              new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
            );
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error authenticating user: ${error.message}`);
      throw new HttpException(
        'Error authenticating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
