import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstitutionDto {
  @ApiPropertyOptional({ description: 'Institution ID', example: 501 })
  @IsNumber()
  @IsOptional()
  institution_id?: number;

  @ApiPropertyOptional({ description: 'Institution acronym', example: 'CIAT' })
  @IsString()
  @IsOptional()
  acronym?: string;

  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Alliance Bioversity - CIAT',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class BilateralProjectDto {
  @ApiProperty({ description: 'Project ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  project_id: number;

  @ApiPropertyOptional({
    description: 'Is lead project (1/0 or true/false)',
    example: 1,
  })
  @IsOptional()
  is_lead?: number | boolean;

  @ApiPropertyOptional({ description: 'Budget in USD', example: 15000 })
  @IsNumber()
  @IsOptional()
  usd_budget?: number;

  @ApiPropertyOptional({
    description: 'Budget to be determined',
    example: false,
  })
  @IsOptional()
  is_determined?: boolean;
}

export class SaveBilateralContributorsDto {
  @ApiPropertyOptional({
    description: 'List of contributing CGIAR centers',
    type: [InstitutionDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  contributing_center?: InstitutionDto[];

  @ApiPropertyOptional({
    description: 'List of contributing bilateral projects',
    type: [BilateralProjectDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BilateralProjectDto)
  contributing_bilateral_projects?: BilateralProjectDto[];
}
