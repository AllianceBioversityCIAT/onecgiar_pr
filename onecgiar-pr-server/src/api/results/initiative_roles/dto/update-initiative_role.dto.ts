import { PartialType } from '@nestjs/mapped-types';
import { CreateInitiativeRoleDto } from './create-initiative_role.dto';

export class UpdateInitiativeRoleDto extends PartialType(CreateInitiativeRoleDto) {}
