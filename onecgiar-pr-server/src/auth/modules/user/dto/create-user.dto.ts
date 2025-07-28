import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
export class CreateUserDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  portfolio?: string;

  @IsOptional()
  role_assignments?: RoleAssignmentDto[];

  @IsOptional()
  @IsNumber()
  role_platform?: number;

  @IsNotEmpty()
  @IsBoolean()
  is_cgiar: boolean;

  @IsOptional()
  @IsNumber()
  created_by?: number;

  @IsOptional()
  @IsNumber()
  last_updated_by?: number;
}

export class RoleAssignmentDto {
  @IsOptional()
  @IsNumber()
  role_id: number;

  @IsOptional()
  @IsNumber()
  entity_id: number;
}
