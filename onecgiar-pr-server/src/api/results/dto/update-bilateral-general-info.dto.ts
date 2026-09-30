import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ADUser } from '../../../auth/services/active-directory.service';
import { ResultsInvestmentDiscontinuedOption } from '../results-investment-discontinued-options/entities/results-investment-discontinued-option.entity';
import { InnovationTransitionDto } from './create-general-information-result.dto';

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
      'Active Directory data for the lead contact person when matched from the directory search. Resolves/creates the lead_contact_person_id FK.',
    type: Object,
  })
  @IsOptional()
  lead_contact_person_data?: ADUser;

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

  @ApiPropertyOptional({
    description:
      'BIL-RAU-T-6: annual updating answer for a replicated innovation (type 7/2 only). Key presence, not truthiness, decides whether the answer is written — omit the key to leave the stored answer untouched.',
  })
  @IsOptional()
  @IsBoolean()
  is_discontinued?: boolean;

  @ApiPropertyOptional({
    description:
      'Ticked discontinuation reasons, with the "Other" description, when is_discontinued is true. Same shape W1/W2 sends: {investment_discontinued_option_id, is_active, description}.',
    type: () => [ResultsInvestmentDiscontinuedOption],
  })
  @IsOptional()
  @IsArray()
  discontinued_options?: ResultsInvestmentDiscontinuedOption[];

  @ApiPropertyOptional({
    description:
      'Where the discontinued innovation continued (merge/split targets). Empty when nothing was declared.',
    type: () => [InnovationTransitionDto],
  })
  @IsOptional()
  @IsArray()
  merge_split_targets?: InnovationTransitionDto[];
}
