import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Like } from 'typeorm';
import { AdUser } from '../entity/ad-user.entity';

@Injectable()
export class AdUserRepository extends Repository<AdUser> {
  constructor(private dataSource: DataSource) {
    super(AdUser, dataSource.createEntityManager());
  }

  /**
   * Search users in local database by query (similar to AD search)
   */
  async searchLocalUsers(query: string): Promise<AdUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchQuery = `%${query.trim()}%`;

    return this.find({
      where: [
        { display_name: Like(searchQuery), is_active: true },
        { mail: Like(searchQuery), is_active: true },
        { sam_account_name: Like(searchQuery), is_active: true },
        { given_name: Like(searchQuery), is_active: true },
        { sn: Like(searchQuery), is_active: true },
        { title: Like(searchQuery), is_active: true },
        { department: Like(searchQuery), is_active: true },
        { company: Like(searchQuery), is_active: true },
      ],
      order: {
        display_name: 'ASC',
      },
      take: 100,
    });
  }

  /**
   * Find user by email (exact match)
   */
  async findByEmail(email: string): Promise<AdUser | null> {
    return this.findOne({
      where: {
        mail: email,
        is_active: true,
      },
    });
  }

  /**
   * Find user by any identifier (email, sam_account_name, user_principal_name)
   */
  async findByIdentifier(identifier: string): Promise<AdUser | null> {
    return this.findOne({
      where: [
        { mail: identifier, is_active: true },
        { sam_account_name: identifier, is_active: true },
        { user_principal_name: identifier, is_active: true },
      ],
    });
  }

  /**
   * Save or update user from AD data
   */
  async saveFromADUser(adUserData: any): Promise<AdUser> {
    const existingUser = await this.findByEmail(adUserData.mail);

    const userData = {
      cn: adUserData.cn,
      display_name: adUserData.displayName,
      mail: adUserData.mail,
      sam_account_name: adUserData.sAMAccountName,
      given_name: adUserData.givenName,
      sn: adUserData.sn,
      user_principal_name: adUserData.userPrincipalName,
      title: adUserData.title,
      department: adUserData.department,
      company: adUserData.company,
      manager: adUserData.manager,
      employee_id: adUserData.employeeID,
      employee_number: adUserData.employeeNumber,
      employee_type: adUserData.employeeType,
      description: adUserData.description,
      last_synced_at: new Date(),
      is_active: true,
    };

    if (existingUser) {
      await this.update(existingUser.id, userData);
      return this.findOne({ where: { id: existingUser.id } });
    } else {
      return this.save(userData);
    }
  }

  /**
   * Get users that need sync (older than X days)
   */
  async getUsersNeedingSync(daysOld: number = 30): Promise<AdUser[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.createQueryBuilder('user')
      .where(
        'user.last_synced_at < :cutoffDate OR user.last_synced_at IS NULL',
        {
          cutoffDate,
        },
      )
      .andWhere('user.is_active = :isActive', { isActive: true })
      .getMany();
  }
}
