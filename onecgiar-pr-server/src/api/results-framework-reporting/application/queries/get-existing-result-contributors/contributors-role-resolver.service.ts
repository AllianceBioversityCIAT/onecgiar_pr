import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { RoleByUserRepository } from '../../../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import type { ContributorRoleInfo } from './existing-result-contributors.types';

export type ContributorsRoleContext = {
  rolesByResult: Map<number, ContributorRoleInfo>;
  userGeneralRole: number | null;
};

@Injectable()
export class ContributorsRoleResolverService {
  constructor(
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _resultRepository: ResultRepository,
  ) {}

  async resolve(
    user: TokenDto,
    uniqueResultIds: number[],
  ): Promise<ContributorsRoleContext> {
    const userId = Number(user?.id);
    const rolesByResult = new Map<number, ContributorRoleInfo>();
    let userGeneralRole: number | null = null;

    if (Number.isFinite(userId)) {
      userGeneralRole = await this._resolveGeneralApplicationRole(userId);
    }

    if (Number.isFinite(userId) && uniqueResultIds.length > 0) {
      await this._resolveResultRoles(userId, uniqueResultIds, rolesByResult);
    }

    return { rolesByResult, userGeneralRole };
  }

  private async _resolveGeneralApplicationRole(
    userId: number,
  ): Promise<number | null> {
    const generalRoles = await this._roleByUserRepository.find({
      where: {
        user: userId,
        active: true,
        initiative_id: IsNull(),
        action_area_id: IsNull(),
      },
      select: ['role'],
    });

    const appRole = generalRoles.find((r) => r.role === 1 || r.role === 2);
    return appRole?.role ?? null;
  }

  private async _resolveResultRoles(
    userId: number,
    uniqueResultIds: number[],
    rolesByResult: Map<number, ContributorRoleInfo>,
  ): Promise<void> {
    const roleResults = await this._resultRepository.getUserRolesForResults(
      userId,
      uniqueResultIds,
    );

    for (const row of roleResults ?? []) {
      const resultId = Number(row?.result_id);
      if (!Number.isFinite(resultId)) {
        continue;
      }

      rolesByResult.set(resultId, {
        role_id:
          row?.role_id !== null && row?.role_id !== undefined
            ? Number(row.role_id)
            : null,
        role_name:
          row?.role_name !== null && row?.role_name !== undefined
            ? String(row.role_name)
            : null,
      });
    }
  }
}
