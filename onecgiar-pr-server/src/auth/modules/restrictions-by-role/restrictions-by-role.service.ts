import { Injectable } from '@nestjs/common';
import { CreateRestrictionsByRoleDto } from './dto/create-restrictions-by-role.dto';
import { UpdateRestrictionsByRoleDto } from './dto/update-restrictions-by-role.dto';

@Injectable()
export class RestrictionsByRoleService {
  create(createRestrictionsByRoleDto: CreateRestrictionsByRoleDto) {
    return createRestrictionsByRoleDto;
  }

  findAll() {
    return `This action returns all restrictionsByRole`;
  }

  findOne(id: number) {
    return `This action returns a #${id} restrictionsByRole`;
  }

  update(id: number, updateRestrictionsByRoleDto: UpdateRestrictionsByRoleDto) {
    return `This action updates a #${id} restrictionsByRole ${updateRestrictionsByRoleDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} restrictionsByRole`;
  }
}
