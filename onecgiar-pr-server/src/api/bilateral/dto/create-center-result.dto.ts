import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

export class LeadCenterDto {
  @ApiPropertyOptional({ description: 'Institution ID', example: 49 })
  @IsNumber()
  @IsOptional()
  institution_id?: number;

  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Alliance Bioversity - CIAT',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Institution acronym', example: 'CIAT' })
  @IsString()
  @IsOptional()
  acronym?: string;
}

export class CreateCenterResultDto {
  @ApiProperty({
    description: 'Result level ID (e.g. 1=Outcome, 2=Output)',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  result_level_id: number;

  @ApiProperty({
    description: 'Result type ID (e.g. 1=Policy Change, 6=Knowledge Product)',
    example: 6,
  })
  @IsNumber()
  @IsNotEmpty()
  result_type_id: number;

  @ApiPropertyOptional({
    description:
      'Science Program code (official_code from clarisa_initiatives)',
    example: 'SP01',
  })
  @IsString()
  @IsOptional()
  program_code?: string;

  @ApiPropertyOptional({
    description: 'Lead center information',
    type: LeadCenterDto,
  })
  @ValidateNested({ each: true })
  @Type(() => LeadCenterDto)
  @IsOptional()
  lead_center?: LeadCenterDto;

  @ApiPropertyOptional({
    description: 'Primary project ID from clarisa_projects',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  project_id?: number;

  @ApiPropertyOptional({
    description:
      'CGSpace handle. Required when result_type_id is Knowledge Product — ' +
      'the result is created and its metadata auto-populated from CGSpace.',
    example: '10568/175322',
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT)
  @IsString()
  @IsNotEmpty()
  handle?: string;
}
