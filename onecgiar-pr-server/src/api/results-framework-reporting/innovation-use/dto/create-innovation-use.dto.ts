import { ApiProperty } from '@nestjs/swagger';
import { ResultIpMeasure } from '../../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../../../results/results_by_institution_types/entities/results_by_institution_type.entity';

export class InnovUseGroupsDto {
  @ApiProperty({
    description: 'List of actors related to the result',
    type: [ResultActor],
  })
  actors: ResultActor[];

  @ApiProperty({
    description: 'Organizations involved, classified by institution type',
    type: [ResultsByInstitutionType],
  })
  organization: ResultsByInstitutionType[];

  @ApiProperty({
    description: 'Measures associated with the result',
    type: [ResultIpMeasure],
  })
  measures: ResultIpMeasure[];
}

export class InvesmentDto {
  @ApiProperty({
    description: 'Entity providing the investment',
    example: '15',
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Total value of the investment',
    example: '1000000',
    type: String,
  })
  kind_cash: string;

  @ApiProperty({
    description: 'Indicates whether the investment is determined',
    example: true,
    type: Boolean,
  })
  is_determined: boolean;
}
export class CreateInnovationUseDto {
  innovation_use: InnovUseGroupsDto;

  @ApiProperty({
    description: 'Indicates whether the result is linked to an innovation',
    example: true,
  })
  has_innovation_link: boolean;

  @ApiProperty({
    description: 'IDs of the linked results',
    example: [1023, 1056],
    type: [Number],
  })
  linked_results: number[];

  @ApiProperty({
    description: 'ID of the innovation use level',
    example: 3,
  })
  innovation_use_level_id: number;

  @ApiProperty({
    description: 'Explanation for the selected readiness level',
    example: 'The innovation has been tested at pilot scale',
  })
  readiness_level_explanation: string;

  @ApiProperty({
    description: 'Indicates whether the innovation use is to be determined',
    example: true,
  })
  innov_use_to_be_determined: boolean;

  @ApiProperty({
    description: 'List of actors related to the result',
    type: [ResultActor],
  })
  actors: ResultActor[];

  @ApiProperty({
    description: 'Organizations involved, classified by institution type',
    type: [ResultsByInstitutionType],
  })
  organization: ResultsByInstitutionType[];

  @ApiProperty({
    description: 'Measures associated with the result',
    type: [ResultIpMeasure],
  })
  measures: ResultIpMeasure[];

  @ApiProperty({
    description: 'Groups related to the innovation use by end of 2030',
    type: InnovUseGroupsDto,
  })
  innovation_use_2030: InnovUseGroupsDto;

  @ApiProperty({
    description:
      'Indicates whether the innovation use by end of 2030 is to be determined',
    example: true,
  })
  innov_use_2030_to_be_determined: boolean;

  @ApiProperty({
    description: 'Indicates whether there are associated scaling studies',
    example: true,
  })
  has_scaling_studies: boolean;

  @ApiProperty({
    description: 'URLs of the associated scaling studies',
    example: [
      'https://scalingstudy.org/abc123',
      'https://scalingstudy.org/xyz456',
    ],
    type: [String],
  })
  scaling_studies_urls: string[];

  @ApiProperty({
    description: 'Investment programs related to the innovation use',
    type: [InvesmentDto],
  })
  investment_programs: InvesmentDto[];

  @ApiProperty({
    description: 'Investment partners related to the innovation use',
    type: [InvesmentDto],
  })
  investment_partners: InvesmentDto[];

  @ApiProperty({
    description: 'Investment projects related to the innovation use',
    type: [InvesmentDto],
  })
  investment_bilateral: InvesmentDto[];
}
