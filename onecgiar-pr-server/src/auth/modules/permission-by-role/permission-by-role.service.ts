import { Injectable } from '@nestjs/common';
import { CreatePermissionByRoleDto } from './dto/create-permission-by-role.dto';
import { UpdatePermissionByRoleDto } from './dto/update-permission-by-role.dto';

@Injectable()
export class PermissionByRoleService {
  create(createPermissionByRoleDto: CreatePermissionByRoleDto) {
    return 'This action adds a new permissionByRole';
  }

  findAll() {
    return `This action returns all permissionByRole`;
  }

  findOne(id: number) {
    return `This action returns a #${id} permissionByRole`;
  }

  update(id: number, updatePermissionByRoleDto: UpdatePermissionByRoleDto) {
    return `This action updates a #${id} permissionByRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} permissionByRole`;
  }
}
