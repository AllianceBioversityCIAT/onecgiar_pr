import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionByRoleDto } from './create-permission-by-role.dto';

export class UpdatePermissionByRoleDto extends PartialType(CreatePermissionByRoleDto) {}
