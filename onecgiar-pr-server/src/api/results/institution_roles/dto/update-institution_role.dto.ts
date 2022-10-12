import { PartialType } from '@nestjs/mapped-types';
import { CreateInstitutionRoleDto } from './create-institution_role.dto';

export class UpdateInstitutionRoleDto extends PartialType(
  CreateInstitutionRoleDto,
) {}
