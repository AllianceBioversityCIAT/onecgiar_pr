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
export class CreateInnovationUseDto {
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
    description: 'ID of the innovation readiness level',
    example: 3,
  })
  innovation_readiness_level_id: number;

  @ApiProperty({
    description: 'Explanation for the selected readiness level',
    example: 'The innovation has been tested at pilot scale',
  })
  readiness_level_explanation: string;

  @ApiProperty({
    description: 'Groups related to the current innovation use',
    type: InnovUseGroupsDto,
  })
  innovation_use: InnovUseGroupsDto;

  @ApiProperty({
    description: 'Groups related to the innovation use by end of 2030',
    type: InnovUseGroupsDto,
  })
  innovation_use_2030: InnovUseGroupsDto;

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
}
