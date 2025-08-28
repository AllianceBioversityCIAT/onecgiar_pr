import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateIf,
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
