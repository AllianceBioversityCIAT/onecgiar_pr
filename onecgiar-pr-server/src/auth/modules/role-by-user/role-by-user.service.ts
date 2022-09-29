import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { UpdateRoleByUserDto } from './dto/update-role-by-user.dto';
import { RoleByUserRepository } from './RoleByUser.repository';
import { RoleLevelRepository } from '../role-levels/RoleLevels.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleLevel } from '../role-levels/entities/role-level.entity';
import { RoleLevelsService } from '../role-levels/role-levels.service';
import { RoleByUser } from './entities/role-by-user.entity';
import { resultRolesDto } from './dto/resultRoles.dto';
import { retunrFormatRoleByUser } from './dto/returnFormatRoleByUser.dto';

@Injectable()
export class RoleByUserService {
constructor(
  private readonly _roleByUserRepository:RoleByUserRepository,
  private readonly _roleLevelsService:RoleLevelsService,
  public readonly _handlersError: HandlersError
  
){}

  create(createRoleByUserDto: CreateRoleByUserDto) {
    return 'This action adds a new roleByUser';
  }

  async allRolesByUser(userId: number): Promise<retunrFormatRoleByUser> {
    try {
      const {response, message, status} = await this._roleLevelsService.findAll();
      if(!response){
        throw {
          response, 
          message, 
          status
        }
      }

      const userRoles: any[] = await this._roleByUserRepository.getAllRolesByUser(userId);
      if(!userRoles.length){
        throw {
          response: {},
          message: `No roles found for this user`,
          status: HttpStatus.NOT_FOUND
        }
      }

      let resultRoles: resultRolesDto = {
        user_id: userId,
        application: userRoles.filter(ap => ap.role_level_name	== 'Application').length?
          userRoles.filter(ap => ap.role_level_name	== 'Application')[0]:
          null,
        initiative: userRoles.filter(ap => ap.role_level_name	== 'Initiative'),
        action_area: userRoles.filter(ap => ap.role_level_name	== 'Action Area')
      }

      resultRoles = this.cleanRoleData(resultRoles);
      return {
        response: resultRoles,
        message: 'Successful response',
        status: HttpStatus.OK
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({error});
    }
  }

  private cleanRoleData(role: any){
    delete role.application.action_area_id;
      delete role.application.initiative_id;

      role.initiative.map(el => {
        delete el.action_area_id;
      });

      role.action_area.map(el => {
        delete el.initiative_id;
      });

      return role;
  }

  getAllUsersAndRoles() {
    return `This action returns a #$} roleByUser`;
  }

  update(id: number, updateRoleByUserDto: UpdateRoleByUserDto) {
    return `This action updates a #${id} roleByUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleByUser`;
  }
}
