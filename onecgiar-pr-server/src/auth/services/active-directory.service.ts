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
  department?: string;
  title?: string;
}

export interface SearchUsersResponse {
  users: ADUser[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class ActiveDirectoryService {
  private readonly logger = new Logger(ActiveDirectoryService.name);
  private readonly cache = new Map<
    string,
    { data: SearchUsersResponse; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private isInitialized = false;

  constructor() {
    this.initializeActiveDirectory();
  }

  private initializeActiveDirectory(): void {
    try {
      this.logger.log('Initializing Active Directory service...');

      if (!config.active_directory) {
        this.logger.error('Active Directory configuration object is missing');
        return;
      }

      const { url, baseDN, domain } = config.active_directory;

      this.logger.log(
        `AD Config - URL: ${url ? '***' : 'MISSING'}, BaseDN: ${baseDN ? '***' : 'MISSING'}, Domain: ${domain ? '***' : 'MISSING'}`,
      );

      if (!url || !baseDN) {
        this.logger.error(
          'Active Directory configuration is incomplete. Required: AD_URL, AD_BASEDN',
        );
        this.logger.error(
          `Current config: URL=${url}, BaseDN=${baseDN}, Domain=${domain}`,
        );
        return;
      }

      this.isInitialized = true;
      this.logger.log('Active Directory service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Active Directory service', error);
      this.isInitialized = false;
    }
  }
  /**
   * Search users in Active Directory
   * @param query Search term
   * @param limit Result limit (default: 20)
   * @param useCache Whether to use cache (default: true)
   * @returns List of found users
   */ async searchUsers(
    query: string,
    limit: number = 20,
    useCache: boolean = true,
  ): Promise<SearchUsersResponse> {
    try {
      // Ensure limit is a valid integer
      const parsedLimit = parseInt(String(limit), 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new HttpException(
          'Limit must be a positive integer',
          HttpStatus.BAD_REQUEST,
        );
      }
      limit = parsedLimit;

      if (!query || query.trim().length < 2) {
        throw new HttpException(
          'Query must be at least 2 characters long',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!this.isInitialized) {
        throw new HttpException(
          'Active Directory service not initialized. Please check AD configuration (AD_URL, AD_BASEDN, AD_DOMAIN)',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      const normalizedQuery = query.trim().toLowerCase();
      const cacheKey = `${normalizedQuery}_${limit}`;

      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
          this.logger.debug(`Cache hit for query: ${normalizedQuery}`);
          return cached.data;
        } else {
          this.cache.delete(cacheKey);
        }
      }
      this.logger.log(`Searching AD users with query: ${normalizedQuery}`);

      const filter = this.buildSearchFilter(normalizedQuery);

      const attributes = [
        'cn',
        'displayName',
        'mail',
        'sAMAccountName',
        'givenName',
        'sn',
        'userPrincipalName',
        'department',
        'title',
      ];
      const searchOptions = {
        filter,
        attributes,
        sizeLimit: parseInt(String(limit), 10) + 1,
        timeLimit: 10,
      };

      const users = await this.performSearch(searchOptions);

      const hasMore = users.length > limit;
      const resultUsers = hasMore ? users.slice(0, limit) : users;

      const response: SearchUsersResponse = {
        users: resultUsers,
        total: resultUsers.length,
        hasMore,
      };

      if (useCache) {
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });
      }

      this.logger.log(
        `Found ${resultUsers.length} users for query: ${normalizedQuery}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error while searching users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   * Builds LDAP filter for search
   * @param query Search term
   * @returns LDAP filter
   */
  private buildSearchFilter(query: string): string {
    const escapedQuery = this.escapeLdapFilter(query);

    return `(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(|(cn=*${escapedQuery}*)(displayName=*${escapedQuery}*)(mail=*${escapedQuery}*)(sAMAccountName=*${escapedQuery}*)(givenName=*${escapedQuery}*)(sn=*${escapedQuery}*)))`;
  }
  /**
   * Escapes special characters for LDAP filters
   * @param input String to escape
   * @returns Escaped string
   */
  private escapeLdapFilter(input: string): string {
    return input
      .replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\0/g, '\\00');
  }
  /**
   * Performs AD search using Promise
   * @param options Search options
   * @returns Promise with results
   */
  private performSearch(options: any): Promise<ADUser[]> {
    const ad = new ActiveDirectory(config.active_directory);
    return new Promise((resolve, reject) => {
      ad.findUsers(options, (err, users) => {
        if (err) {
          this.logger.error('AD search error:', err);
          reject(new Error(`Active Directory search failed: ${err.message}`));
          return;
        }
        if (!users) {
          resolve([]);
          return;
        }

        const filteredUsers = Array.isArray(users) ? users : [users];
        const mappedUsers = filteredUsers
          .filter((user) => user && (user.mail || user.userPrincipalName))
          .map((user) => ({
            cn: user.cn,
            displayName: user.displayName,
            mail: user.mail,
            sAMAccountName: user.sAMAccountName,
            givenName: user.givenName,
            sn: user.sn,
            userPrincipalName: user.userPrincipalName,
            department: user.department,
            title: user.title,
          }));

        resolve(mappedUsers);
      });
    });
  }
  /**
   * Clears cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Active Directory cache cleared');
  }
  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
  /**
   * Checks service status
   */
  getServiceStatus(): {
    initialized: boolean;
    hasConfig: boolean;
    configDetails: {
      hasUrl: boolean;
      hasBaseDN: boolean;
      hasDomain: boolean;
    };
    cacheStats: { size: number; keys: string[] };
  } {
    const hasConfig = !!config.active_directory;
    return {
      initialized: this.isInitialized,
      hasConfig,
      configDetails: {
        hasUrl: hasConfig && !!config.active_directory.url,
        hasBaseDN: hasConfig && !!config.active_directory.baseDN,
        hasDomain: hasConfig && !!config.active_directory.domain,
      },
      cacheStats: this.getCacheStats(),
    };
  }
  /**
   * Reinitializes Active Directory service
   */
  reinitialize(): void {
    this.logger.log('Reinitializing Active Directory service...');
    this.clearCache();
    this.initializeActiveDirectory();
  }
}
