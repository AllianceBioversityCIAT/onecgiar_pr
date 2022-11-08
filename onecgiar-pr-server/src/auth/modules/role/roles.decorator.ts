import { SetMetadata } from '@nestjs/common';
import { RoleApp } from './role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleApp[]) => SetMetadata(ROLES_KEY, roles);
