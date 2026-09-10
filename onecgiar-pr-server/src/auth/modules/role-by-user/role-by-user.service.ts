import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { RoleByUserRepository } from './RoleByUser.repository';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { RoleLevelsService } from '../role-levels/role-levels.service';
import { RoleByUser } from './entities/role-by-user.entity';
import { ResultRolesDto } from './dto/resultRoles.dto';
import { ReturnFormatRoleByUser } from './dto/returnFormatRoleByUser.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { User } from '../user/entities/user.entity';

@Injectable()
export class RoleByUserService {
  constructor(
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _roleLevelsService: RoleLevelsService,
    private readonly _handlersError: HandlersError,
    private readonly _userRepository: UserRepository,
  ) {}

  async create(
    createRoleByUserDto: CreateRoleByUserDto,
    userData: TokenDto,
  ): Promise<ReturnFormatRoleByUser | returnErrorDto> {
    try {
      const targetsValues: any[] = Object.values(createRoleByUserDto.target);
      let validCount = false;

      const user: User = await this._userRepository.findOne({
        where: {
          id: createRoleByUserDto.user,
        },
      });
      if (!user) {
        this.throwServiceError('User Not Found', HttpStatus.NOT_FOUND);
      }

      if (targetsValues.length) {
        validCount =
          targetsValues.reduce(
            (_sum, data, initial = 0) => (data ? ++initial : initial),
            0,
          ) > 1;
      }
      if (validCount) {
        this.throwServiceError(
          'There are two or more targets to assign in the role',
          HttpStatus.BAD_REQUEST,
          { error: createRoleByUserDto.target },
        );
      }

      const existRole: RoleByUser =
        await this._roleByUserRepository.getSpecificRole({
          role: createRoleByUserDto.role,
          user: user.id,
          ...createRoleByUserDto.target,
        });

      if (existRole) {
        this.throwServiceError(
          'The user already has this role assignment',
          HttpStatus.CONFLICT,
        );
      }
      createRoleByUserDto.last_updated_by = userData.id;
      createRoleByUserDto.created_by = userData.id;
      const roleByUser: RoleByUser = await this._roleByUserRepository.save({
        ...createRoleByUserDto,
        ...createRoleByUserDto.target,
      });
      return {
        response: roleByUser,
        message: 'Correct role assignment',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async allRolesByUser(
    userId: number,
  ): Promise<ReturnFormatRoleByUser | returnErrorDto> {
    try {
      const { response, message, status } =
        await this._roleLevelsService.findAll();
      if (!response) {
        this.throwServiceError(message, status, response);
      }

      const userRoles: any[] =
        await this._roleByUserRepository.getAllRolesByUser(userId);
      if (!userRoles.length) {
        this.throwServiceError(
          'No roles found for this user',
          HttpStatus.NOT_FOUND,
        );
      }

      const applicationRole = this.resolveApplicationRole(userRoles);

      let resultRoles: ResultRolesDto = {
        user_id: userId,
        application: applicationRole,
        initiative: userRoles.filter(
          (ap) => ap.role_level_name == 'Initiative',
        ),
        action_area: userRoles.filter(
          (ap) => ap.role_level_name == 'Action Area',
        ),
        center: userRoles
          .filter((ap) => ap.role_level_name == 'Center')
          .map((row) => ({
            center_id: row.center_id,
            center_name: row.center_name,
            center_acronym: row.center_acronym,
            role_id: row.role_id,
            role_name: row.description,
          })),
      };

      resultRoles = this.cleanRoleData(resultRoles);
      return {
        response: resultRoles,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private resolveApplicationRole(userRoles: any[]) {
    const byLevel = userRoles.find(
      (row) => `${row.role_level_name}`.trim() === 'Application',
    );
    if (byLevel) return byLevel;

    return (
      userRoles.find(
        (row) =>
          row.role_id == 1 &&
          (row.initiative_id == null || row.initiative_id === undefined) &&
          (row.action_area_id == null || row.action_area_id === undefined) &&
          (row.center_id == null || row.center_id === undefined),
      ) ?? null
    );
  }

  private throwServiceError(
    message: string,
    status: HttpStatus,
    response: unknown = {},
  ): never {
    throw Object.assign(new Error(message), { response, status });
  }

  private cleanRoleData(role: any) {
    if (role.application) {
      delete role.application.action_area_id;
      delete role.application.initiative_id;
      delete role.application.center_id;
    }

    role.initiative?.map((el) => {
      delete el.action_area_id;
      delete el.center_id;
      delete el.center_name;
      delete el.center_acronym;
    });

    role.action_area?.map((el) => {
      delete el.initiative_id;
      delete el.center_id;
      delete el.center_name;
      delete el.center_acronym;
    });

    return role;
  }
}
