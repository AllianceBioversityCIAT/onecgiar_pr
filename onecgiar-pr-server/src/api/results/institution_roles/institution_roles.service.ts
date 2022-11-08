import { Injectable } from '@nestjs/common';
import { CreateInstitutionRoleDto } from './dto/create-institution_role.dto';
import { UpdateInstitutionRoleDto } from './dto/update-institution_role.dto';

@Injectable()
export class InstitutionRolesService {
  create(createInstitutionRoleDto: CreateInstitutionRoleDto) {
    return createInstitutionRoleDto;
  }

  findAll() {
    return `This action returns all institutionRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} institutionRole`;
  }

  update(id: number, updateInstitutionRoleDto: UpdateInstitutionRoleDto) {
    return `This action updates a #${id} institutionRole ${updateInstitutionRoleDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} institutionRole`;
  }
}
