import { Injectable } from '@nestjs/common';
import { CreateInitiativeRoleDto } from './dto/create-initiative_role.dto';
import { UpdateInitiativeRoleDto } from './dto/update-initiative_role.dto';

@Injectable()
export class InitiativeRolesService {
  create(createInitiativeRoleDto: CreateInitiativeRoleDto) {
    return 'This action adds a new initiativeRole';
  }

  findAll() {
    return `This action returns all initiativeRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} initiativeRole`;
  }

  update(id: number, updateInitiativeRoleDto: UpdateInitiativeRoleDto) {
    return `This action updates a #${id} initiativeRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} initiativeRole`;
  }
}
