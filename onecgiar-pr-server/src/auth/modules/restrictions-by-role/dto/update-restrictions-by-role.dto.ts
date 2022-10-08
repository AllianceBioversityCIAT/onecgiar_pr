import { PartialType } from '@nestjs/mapped-types';
import { CreateRestrictionsByRoleDto } from './create-restrictions-by-role.dto';

export class UpdateRestrictionsByRoleDto extends PartialType(CreateRestrictionsByRoleDto) {}
