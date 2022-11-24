import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleLevelDto } from './dto/create-role-level.dto';
import { UpdateRoleLevelDto } from './dto/update-role-level.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { RoleLevelRepository } from './RoleLevels.repository';
import { RoleLevel } from './entities/role-level.entity';
import { returnFormatRoleLevels } from './dto/update-role-level.dto copy';
import { RoleRepository } from '../role/Role.repository';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class RoleLevelsService {
  constructor(
    private readonly _roleLevelRepository: RoleLevelRepository,
    private readonly _handlersError: HandlersError,
    private readonly _roleRepository: RoleRepository,
  ) {}

  create(createRoleLevelDto: CreateRoleLevelDto) {
    return createRoleLevelDto;
  }

  async findAll(): Promise<returnFormatRoleLevels | returnErrorDto> {
    try {
      const rolesLevels: RoleLevel[] = await this._roleLevelRepository.find();
      if (!rolesLevels.length) {
        throw {
          response: {},
          message: 'Role Levels Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const roles: Role[] = await this._roleRepository.getAllRoles();
      if (!roles.length) {
        throw {
          response: {},
          message: 'Role Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      rolesLevels.map((rl) => {
        rl['roles'] = roles.filter((r) => r.role_level_id == rl.id);
      });

      return {
        response: rolesLevels,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} roleLevel`;
  }

  update(id: number, updateRoleLevelDto: UpdateRoleLevelDto) {
    return `This action updates a #${id} roleLevel ${updateRoleLevelDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleLevel`;
  }
}
