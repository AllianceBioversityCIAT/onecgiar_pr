import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleByUserDto } from './create-role-by-user.dto';

export class UpdateRoleByUserDto extends PartialType(CreateRoleByUserDto) {}
