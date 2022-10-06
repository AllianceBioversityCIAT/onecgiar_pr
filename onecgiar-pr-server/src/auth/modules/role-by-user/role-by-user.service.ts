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
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Injectable()
export class RoleByUserService {
constructor(
  private readonly _roleByUserRepository:RoleByUserRepository,
  private readonly _roleLevelsService:RoleLevelsService,
  public readonly _handlersError: HandlersError
  
){}

  async create(createRoleByUserDto: CreateRoleByUserDto, user: TokenDto):Promise<retunrFormatRoleByUser> {
    try {
      const targetsValues: any[] = Object.values(createRoleByUserDto.target);
      let validCount: boolean = false;
      if(targetsValues.length){
        validCount = targetsValues.reduce((sum, data) => data?++sum:sum) > 1?true:false;
      }
      if(validCount){
        throw {
          response:{error: createRoleByUserDto.target}, 
          message: 'There are two or more targets to assign in the role', 
          status: HttpStatus.BAD_REQUEST
        }
      }
      const existRole:RoleByUser = await this._roleByUserRepository.findOne({where:{
        role: createRoleByUserDto.role,
        user: user.id,
        ...createRoleByUserDto.target
      }});

      if(existRole){
        throw {
          response:{}, 
          message: 'The user already has this role assignment', 
          status: HttpStatus.CONFLICT
        }
      }
      createRoleByUserDto.last_updated_by = user.id;
      createRoleByUserDto.created_by = user.id;
      const roleByUser: RoleByUser = await this._roleByUserRepository.save({
        ...createRoleByUserDto,
        ...createRoleByUserDto.target
      });
      return {
        response: roleByUser,
        message: 'Correct role assignment',
        status: HttpStatus.CREATED
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error});
    }
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
