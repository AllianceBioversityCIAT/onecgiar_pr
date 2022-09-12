import { PartialType } from '@nestjs/mapped-types';
import { CreateRolesUserByAplicationDto } from './create-roles-user-by-aplication.dto';

export class UpdateRolesUserByAplicationDto extends PartialType(
  CreateRolesUserByAplicationDto,
) {}
