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
  @IsString()
  entity?: string;

  @IsOptional()
  @IsNumber()
  role_entity?: number;

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
