import { Injectable } from '@nestjs/common';
import { CreateInstitutionRoleDto } from './dto/create-institution_role.dto';
import { UpdateInstitutionRoleDto } from './dto/update-institution_role.dto';

@Injectable()
export class InstitutionRolesService {
  create(createInstitutionRoleDto: CreateInstitutionRoleDto) {
    return 'This action adds a new institutionRole';
  }

  findAll() {
    return `This action returns all institutionRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} institutionRole`;
  }

  update(id: number, updateInstitutionRoleDto: UpdateInstitutionRoleDto) {
    return `This action updates a #${id} institutionRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} institutionRole`;
  }
}
