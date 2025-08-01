import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateIf,
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

export class RoleAssignmentDto {
  @IsOptional()
  @IsNumber()
  rbu_id?: number;

  @IsOptional()
  @IsBoolean()
  force_swap?: boolean;

  @ValidateIf((o) => o !== undefined)
  @IsNumber({ allowNaN: false }, { message: 'role_id must be a number' })
  role_id: number;

  @ValidateIf((o) => o !== undefined)
  @IsNumber({ allowNaN: false }, { message: 'entity_id must be a number' })
  entity_id: number;
}

