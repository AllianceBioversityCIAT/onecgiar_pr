import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBilateralGeneralInfoDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Lead contact person name' })
  @IsOptional()
  @IsString()
  lead_contact_person?: string;

  @ApiPropertyOptional({
    description:
      'Gender tag level (0=Not Targeted, 1=Significant, 2=Principal)',
  })
  @IsOptional()
  @IsNumber()
  gender_tag_level_id?: number;

  @ApiPropertyOptional({
    description:
      'Climate tag level (0=Not Targeted, 1=Significant, 2=Principal)',
  })
  @IsOptional()
  @IsNumber()
  climate_change_tag_level_id?: number;

  @ApiPropertyOptional({
    description:
      'Nutrition tag level (0=Not Targeted, 1=Significant, 2=Principal)',
  })
  @IsOptional()
  @IsNumber()
  nutrition_tag_level_id?: number;

  @ApiPropertyOptional({
    description:
      'Environmental biodiversity tag level (0=Not Targeted, 1=Significant, 2=Principal)',
  })
  @IsOptional()
  @IsNumber()
  environmental_biodiversity_tag_level_id?: number;

  @ApiPropertyOptional({
    description:
      'Poverty tag level (0=Not Targeted, 1=Significant, 2=Principal)',
  })
  @IsOptional()
  @IsNumber()
  poverty_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'Gender impact area sub-score IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  gender_impact_area_ids?: number[];

  @ApiPropertyOptional({
    description: 'Climate impact area sub-score IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  climate_impact_area_ids?: number[];

  @ApiPropertyOptional({
    description: 'Nutrition impact area sub-score IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  nutrition_impact_area_ids?: number[];

  @ApiPropertyOptional({
    description: 'Environmental biodiversity impact area sub-score IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  environmental_biodiversity_impact_area_ids?: number[];

  @ApiPropertyOptional({
    description: 'Poverty impact area sub-score IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  poverty_impact_area_ids?: number[];
}
