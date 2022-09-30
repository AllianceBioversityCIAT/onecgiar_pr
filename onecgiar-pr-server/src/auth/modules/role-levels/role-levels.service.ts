import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleLevelDto } from './dto/create-role-level.dto';
import { UpdateRoleLevelDto } from './dto/update-role-level.dto';
import { HandlersError, returnErrorDto } from '../../../shared/handlers/error.utils';
import { RoleLevelRepository } from './RoleLevels.repository';
import { RoleLevel } from './entities/role-level.entity';
import { retunrFormatRoleLevels } from './dto/update-role-level.dto copy';

@Injectable()
export class RoleLevelsService {

  constructor(
    private readonly _roleLevelRepository:RoleLevelRepository,
    private readonly _handlersError: HandlersError
  ){}

  create(createRoleLevelDto: CreateRoleLevelDto) {
    return 'This action adds a new roleLevel';
  }

  async findAll(): Promise<retunrFormatRoleLevels | returnErrorDto> {
    try {
      const rolesLevels: RoleLevel[] = await this._roleLevelRepository.find();
      if(!rolesLevels.length){
        throw {
          response: {},
          message: 'Role Levels Not fount',
          status: HttpStatus.NOT_FOUND
        }
      }
      
      return {
        response: rolesLevels,
        message: 'Successful response',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} roleLevel`;
  }

  update(id: number, updateRoleLevelDto: UpdateRoleLevelDto) {
    return `This action updates a #${id} roleLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleLevel`;
  }
}
