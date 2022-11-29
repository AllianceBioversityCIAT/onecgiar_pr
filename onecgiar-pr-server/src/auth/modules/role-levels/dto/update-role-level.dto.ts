import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleLevelDto } from './create-role-level.dto';

export class UpdateRoleLevelDto extends PartialType(CreateRoleLevelDto) {}
