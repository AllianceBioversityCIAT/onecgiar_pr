import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  force_swap?: boolean;

  @IsOptional()
  @IsNumber()
  role_platform?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  role_assignments: RoleAssignmentDto[];
}

class RoleAssignmentDto {
  @IsOptional()
  @IsBoolean()
  force_swap?: boolean;

  @IsNumber()
  rbu_id: number;

  @IsNumber()
  entity_id: number;

  @IsNumber()
  role_id: number;
}
