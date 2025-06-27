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
            this.logger.error(`Error searching user: ${err}`, err);
            if (err.errno == 'ENOTFOUND') {
              const notFound = {
                name: 'SERVER_NOT_FOUND',
                description: 'Domain Controller Server not found',
                httpCode: 500,
              };
              reject(notFound);
              return;
            } else {
              this.logger.error(`Error searching user: ${err}`, err.errno);
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
