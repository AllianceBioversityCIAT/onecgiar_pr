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
  entityRoles?: EntityRoleDto[];

  @IsOptional()
  @IsNumber()
  role_platform?: number;
}

class EntityRoleDto {
  @IsNumber()
  id: number;

  @IsNumber()
  role_id: number;
}
