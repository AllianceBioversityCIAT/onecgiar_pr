import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';

export class ChangeUserStatusDto {
  @IsBoolean()
  activate: boolean;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  role_entity?: number[];

  @IsOptional()
  @IsNumber()
  role_platform?: number;
}