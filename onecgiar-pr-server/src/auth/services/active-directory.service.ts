import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Client } from 'ldapts';
import config from '../../config/const.config';

export interface ADUser {
  cn?: string;
  displayName?: string;
  mail?: string;
  sAMAccountName?: string;
  givenName?: string;
  sn?: string;
  userPrincipalName?: string;
  title?: string;
  department?: string;
  company?: string;
  manager?: string;
  employeeID?: string;
  employeeNumber?: string;
  employeeType?: string;
  description?: string;
}

@Injectable()
export class ActiveDirectoryService {
  private readonly logger = new Logger(ActiveDirectoryService.name);

  private createClient(): Client {
    return new Client({
      url: config.active_directory.url,
      timeout: 10000,
      connectTimeout: 10000,
    });
  }

  private async bindClient(
    client: Client,
    username?: string,
    password?: string,
  ): Promise<void> {
    try {
      const bindDN = username || config.active_directory.username;
      const bindPassword = password || config.active_directory.password;

      await client.bind(bindDN, bindPassword);
      this.logger.debug('LDAP bind successful');
    } catch (error) {
      this.logger.error(`LDAP bind error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search users by name, mail or sAMAccountName (partial match)
   * Optimized for real-time search
   */
  async searchUsers(query: string): Promise<ADUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const client = this.createClient();

    try {
      await this.bindClient(client);

      this.logger.debug(`Searching AD users: ${query}`);

      const words = query.trim().split(/\s+/);

      const fields = [
        'givenName',
        'displayName',
        'mail',
        'sAMAccountName',
        'sn',
      ];

      const filter =
        '(&' +
        words
          .map(
            (word) =>
              '(|' +
              fields.map((field) => `(${field}=*${word}*)`).join('') +
              ')',
          )
          .join('') +
        ')';

      const searchOptions = {
        filter: filter,
        scope: 'sub' as const,
        attributes: [
          'cn',
          'displayName',
          'mail',
          'sAMAccountName',
          'givenName',
          'sn',
          'userPrincipalName',
          'title',
          'department',
          'company',
          'manager',
          'employeeID',
          'employeeNumber',
          'employeeType',
          'description',
        ],
        sizeLimit: 10,
        timeLimit: 5,
      };

      const searchResult = await client.search(
        config.active_directory.baseDN,
        searchOptions,
      );

      const users: ADUser[] = searchResult.searchEntries.map((entry) => {
        const user: ADUser = {};

        [
          'cn',
          'displayName',
          'mail',
          'sAMAccountName',
          'givenName',
          'sn',
          'userPrincipalName',
          'title',
          'department',
          'company',
          'manager',
          'employeeID',
          'employeeNumber',
          'employeeType',
          'description',
        ].forEach((key) => {
          if (entry[key]) {
            const value = entry[key];
            if (Array.isArray(value) && value.length > 0) {
              user[key as keyof ADUser] = value[0] as string;
            } else if (typeof value === 'string') {
              user[key as keyof ADUser] = value;
            }
          }
        });

        return user;
      });

      this.logger.debug(`Found ${users.length} user(s) for query: ${query}`);
      return users;
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`);
      throw new HttpException(
        'Error searching users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      try {
        await client.unbind();
      } catch (error) {
        this.logger.warn(`Error unbinding client: ${error.message}`);
      }
    }
  }

  /**
   * Get user details by username
   */
  async getUserDetails(username: string): Promise<ADUser | null> {
    const client = this.createClient();

    try {
      await this.bindClient(client);

      const searchOptions = {
        filter: `(|(sAMAccountName=${username})(userPrincipalName=${username})(mail=${username}))`,
        scope: 'sub' as const,
        attributes: [
          'cn',
          'displayName',
          'mail',
          'sAMAccountName',
          'givenName',
          'sn',
          'userPrincipalName',
          'title',
          'department',
          'company',
          'manager',
          'employeeID',
          'employeeNumber',
          'employeeType',
          'description',
        ],
      };

      const searchResult = await client.search(
        config.active_directory.baseDN,
        searchOptions,
      );

      if (searchResult.searchEntries.length === 0) {
        this.logger.log(`User not found: ${username}`);
        return null;
      }

      const entry = searchResult.searchEntries[0];
      const user: ADUser = {};

      Object.keys(entry).forEach((key) => {
        if (
          key in user ||
          [
            'cn',
            'displayName',
            'mail',
            'sAMAccountName',
            'givenName',
            'sn',
            'userPrincipalName',
            'title',
            'department',
            'company',
            'manager',
            'employeeID',
            'employeeNumber',
            'employeeType',
            'description',
          ].includes(key)
        ) {
          const value = entry[key];
          if (Array.isArray(value) && value.length > 0) {
            user[key as keyof ADUser] = value[0] as string;
          } else if (typeof value === 'string') {
            user[key as keyof ADUser] = value;
          }
        }
      });

      this.logger.log(`User details retrieved for: ${username}`);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user details: ${error.message}`);
      throw new HttpException(
        'Error getting user details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      try {
        await client.unbind();
      } catch (error) {
        this.logger.warn(`Error unbinding client: ${error.message}`);
      }
    }
  }
}
