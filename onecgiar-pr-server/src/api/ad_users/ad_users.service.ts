import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ActiveDirectoryService } from '../../auth/services/active-directory.service';
import { AdUserRepository } from './repository/ad-users.repository';
import { AdUser } from './entity/ad-user.entity';
import { returnFormatService } from '../../shared/extendsGlobalDTO/returnServices.dto';

export interface SearchUsersResponse {
  users: AdUser[];
  fromCache: boolean;
  totalFound: number;
}

@Injectable()
export class AdUserService {
  private readonly logger = new Logger(AdUserService.name);

  constructor(
    private readonly adUserRepository: AdUserRepository,
    private readonly activeDirectoryService: ActiveDirectoryService,
  ) {}

  /**
   * Search users with cache-first approach
   */
  async searchUsers(query: string): Promise<returnFormatService> {
    if (!query || query.trim().length < 2) {
      return {
        response: [],
        message: 'Query must be at least 2 characters long',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    this.logger.log(`Searching users for query: ${query}`);

    const localUsers = await this.adUserRepository.searchLocalUsers(query);

    if (localUsers.length > 0) {
      this.logger.log(`Found ${localUsers.length} users in local cache`);
      return {
        response: localUsers,
        message: 'Users found in local cache',
        status: HttpStatus.OK,
      };
    }

    this.logger.log(`No local results found, searching in Active Directory`);

    try {
      const adUsers = await this.activeDirectoryService.searchUsers(query);

      if (adUsers.length === 0) {
        this.logger.log(
          `No users found in Active Directory for query: ${query}`,
        );
        return {
          response: [],
          message: 'No users found in Active Directory',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const savedUsers: AdUser[] = [];
      for (const adUser of adUsers) {
        if (adUser.mail) {
          try {
            const savedUser =
              await this.adUserRepository.saveFromADUser(adUser);
            savedUsers.push(savedUser);
          } catch (error) {
            this.logger.warn(
              `Failed to save user ${adUser.mail}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log(
        `Saved ${savedUsers.length} users from AD to local database`,
      );

      return {
        response: savedUsers,
        message: 'Users found in Active Directory',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this.logger.error(
        `Error searching in Active Directory: ${error.message}`,
      );

      return {
        response: [],
        message: 'Error searching in Active Directory',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * Get user by identifier (email, username, etc.)
   */
  async getUserByIdentifier(identifier: string): Promise<AdUser | null> {
    if (!identifier) {
      return null;
    }

    let user = await this.adUserRepository.findByIdentifier(identifier);

    if (user) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (!user.last_synced_at || user.last_synced_at < sevenDaysAgo) {
        this.logger.log(`User ${identifier} data is stale, refreshing from AD`);
        await this.refreshUserFromAD(user);
      }

      return user;
    }

    try {
      const adUser =
        await this.activeDirectoryService.getUserDetails(identifier);

      if (adUser && adUser.mail) {
        user = await this.adUserRepository.saveFromADUser(adUser);
        this.logger.log(`User ${identifier} not found locally, saved from AD`);
        return user;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get user ${identifier} from AD: ${error.message}`,
      );
    }

    return null;
  }

  /**
   * Refresh user data from Active Directory
   */
  private async refreshUserFromAD(user: AdUser): Promise<void> {
    try {
      const adUser = await this.activeDirectoryService.getUserDetails(
        user.mail,
      );

      if (adUser) {
        await this.adUserRepository.saveFromADUser(adUser);
        this.logger.log(`Refreshed user data for ${user.mail}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to refresh user ${user.mail} from AD: ${error.message}`,
      );
    }
  }

  /**
   * Validate lead contact person
   */
  async validateLeadContactPerson(email: string): Promise<{
    isValid: boolean;
    user?: AdUser;
    error?: string;
  }> {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }

    try {
      const user = await this.getUserByIdentifier(email);

      if (!user) {
        return { isValid: false, error: 'User not found in Active Directory' };
      }

      return { isValid: true, user };
    } catch (error) {
      this.logger.error(
        `Error validating lead contact person ${email}: ${error.message}`,
      );
      return { isValid: false, error: 'Error validating user' };
    }
  }
}
