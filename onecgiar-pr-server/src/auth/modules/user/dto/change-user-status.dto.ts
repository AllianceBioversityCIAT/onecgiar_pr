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
}

class EntityRoleDto {
  @IsNumber()
  role_id: number;

  @IsNumber()
  entity_id: number;
}
