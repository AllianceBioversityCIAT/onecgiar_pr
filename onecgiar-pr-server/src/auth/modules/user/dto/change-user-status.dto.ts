import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEmail,
  ValidateIf,
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

export class EntityRoleDto {
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
