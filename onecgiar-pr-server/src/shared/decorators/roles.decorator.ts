import { SetMetadata } from '@nestjs/common';
import { RoleEnum, RoleTypeEnum } from '../constants/role-type.enum';

export const Roles = (roles: RoleEnum, type: RoleTypeEnum) =>
  SetMetadata('role', { roles, type });
