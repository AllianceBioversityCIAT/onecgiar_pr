import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADUser } from '../../../auth/services/active-directory.service';
import { ResultsInvestmentDiscontinuedOption } from '../results-investment-discontinued-options/entities/results-investment-discontinued-option.entity';
import { InnovationTransitionType } from '../result-innovation-merge-split/entities/result-innovation-merge-split.entity';

export class InstitutionDto {
  @ApiProperty({
    description: 'Identifier for the institution associated to the result.',
  })
  institutions_id: number;
}

export class InstitutionTypeDto {
  @ApiProperty({
    description: 'Identifier for the institution type linked to the result.',
  })
  institutions_type_id: number;
}

export class InnovationTransitionDto {
  @ApiProperty({
    description:
      'Identifier of the innovation this one merged into, or one of the innovations it split into.',
  })
  target_result_id: number;

  @ApiProperty({
    description:
      'Whether the innovation merged into the target or split into it.',
    enum: InnovationTransitionType,
  })
  transition_type: InnovationTransitionType;
}

export class CreateGeneralInformationResultDto {
  @ApiProperty({
    description: 'Result identifier to update with general information.',
  })
  public result_id: number;

  @ApiProperty({ description: 'Owning initiative identifier.' })
  public initiative_id: number;

  @ApiProperty({ description: 'Result type identifier.' })
  public result_type_id: number;

  @ApiProperty({ description: 'Result level identifier.' })
  public result_level_id: number;

  @ApiProperty({ description: 'Official name of the result.' })
  public result_name: string;

  @ApiProperty({ description: 'Narrative description of the result.' })
  public result_description: string;

  @ApiProperty({ description: 'Gender tag identifier linked to the result.' })
  public gender_tag_id: number;

  @ApiProperty({
    description:
      'Gender impact area component identifier linked to the result.',
    required: false,
  })
  public gender_impact_area_id?: number | number[];

  @ApiProperty({
    description: 'Climate change tag identifier linked to the result.',
    required: false,
  })
  public climate_change_tag_id?: number;

  @ApiProperty({
    description:
      'Climate change impact area component identifier linked to the result.',
    required: false,
  })
  public climate_impact_area_id?: number | number[];

  @ApiProperty({
    description: 'Nutrition tag identifier linked to the result.',
    required: false,
  })
  public nutrition_tag_level_id?: number;

  @ApiProperty({
    description:
      'Nutrition impact area component identifier linked to the result.',
    required: false,
  })
  public nutrition_impact_area_id?: number | number[];

  @ApiProperty({
    description:
      'Environmental biodiversity tag identifier linked to the result.',
  })
  public environmental_biodiversity_tag_level_id: number;

  @ApiProperty({
    description:
      'Environmental biodiversity impact area component identifier linked to the result.',
  })
  public environmental_biodiversity_impact_area_id: number | number[];

  @ApiProperty({ description: 'Poverty tag identifier linked to the result.' })
  public poverty_tag_level_id: number;

  @ApiProperty({
    description:
      'Poverty impact area component identifier linked to the result.',
  })
  public poverty_impact_area_id: number | number[];

  @ApiProperty({
    description: 'Institutions associated with the result.',
    type: () => [InstitutionDto],
  })
  public institutions: InstitutionDto[];

  @ApiProperty({
    description: 'Institution types associated with the result.',
    type: () => [InstitutionTypeDto],
  })
  public institutions_type: InstitutionTypeDto[];

  @ApiPropertyOptional({
    description: 'Optional URL linking to the result in KRS.',
  })
  public krs_url!: string;

  @ApiProperty({ description: 'Indicates if the result is registered in KRS.' })
  public is_krs!: boolean;

  @ApiProperty({ description: 'Full name of the lead contact person.' })
  public lead_contact_person!: string;

  @ApiPropertyOptional({
    description:
      'Active Directory data for the lead contact person when available.',
    type: Object,
  })
  public lead_contact_person_data?: ADUser;

  @ApiProperty({
    description: 'Flags whether the result has been discontinued.',
  })
  public is_discontinued!: boolean;

  @ApiPropertyOptional({
    description: 'Discontinued options selected for the result.',
    type: () => [ResultsInvestmentDiscontinuedOption],
  })
  public discontinued_options!: ResultsInvestmentDiscontinuedOption[];

  @ApiPropertyOptional({
    description:
      'P2-3292: where the discontinued innovation continued — the innovations it merged into ' +
      'or was split into. One entry per target, so a split into three carries three entries. ' +
      'Only read when `is_discontinued` is true and the result is an innovation.',
    type: () => [InnovationTransitionDto],
  })
  public merge_split_targets?: InnovationTransitionDto[];
}
