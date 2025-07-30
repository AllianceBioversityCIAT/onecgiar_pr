import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEmail,
} from 'class-validator';

export class ChangeUserStatusDto {
  @IsEmail()
  email: string;

  @IsBoolean()
  activate: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntityRoleDto)
  role_assignments?: EntityRoleDto[];

  @IsOptional()
  @IsNumber()
  role_platform?: number;

  @IsOptional()
  @IsBoolean()
  is_cgiar?: boolean;

  @IsOptional()
  @IsNumber()
  created_by?: number;

  @IsOptional()
  @IsNumber()
  last_updated_by?: number;
}

class EntityRoleDto {
  @IsOptional()
  @IsNumber()
  id_role_by_entity?: number;

  @IsOptional()
  @IsBoolean()
  force_swap?: boolean;

  @IsNumber()
  role_id: number;

  @IsNumber()
  entity_id: number;
}
