import { ApiProperty } from '@nestjs/swagger';
import { ShareResultRequest } from '../entities/share-result-request.entity';

export class CreateShareResultRequestDto {
  @ApiProperty({
    description: 'Status ID of the share result request',
    example: 1,
  })
  request_status_id: number;

  @ApiProperty({
    type: ShareResultRequest,
    description: 'Details of the share result request',
  })
  result_request: ShareResultRequest;

  @ApiProperty({
    description: 'Mapping of the result to the Theory of Change (ToC)',
    example: {
      planned_result: true,
      result_toc_results: [
        {
          result_toc_result_id: 123,
          toc_result_id: 456,
          action_area_outcome_id: 789,
          results_id: 1011,
          planned_result: true,
          initiative_id: 12,
          indicators: [],
          impactAreasTargets: [],
          sdgTargest: [],
          actionAreaOutcome: [],
          targetsIndicators: [],
          is_sdg_action_impact: false,
          toc_progressive_narrative: 'Some narrative',
          toc_level_id: 2,
        },
      ],
    },
  })
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: ResultToResultInterfaceToc[];
  };

  @ApiProperty({
    description: 'Primary initiative ID if changing',
    required: false,
    example: 10,
  })
  changePrimaryInit?: number;
}

export class ResultToResultInterfaceToc {
  @ApiProperty({
    description: 'ID of the ToC result',
    example: 123,
    required: false,
  })
  result_toc_result_id?: number;

  @ApiProperty({
    description: 'ID of the ToC outcome',
    example: 456,
    required: false,
  })
  toc_result_id?: number;

  @ApiProperty({
    description: 'ID of the action area outcome',
    example: 789,
    required: false,
  })
  action_area_outcome_id?: number;

  @ApiProperty({
    description: 'ID of the result',
    example: 1011,
  })
  results_id: number;

  @ApiProperty({
    description: 'Indicates if this is a planned result',
    example: true,
    required: false,
  })
  planned_result?: boolean;

  @ApiProperty({
    description: 'ID of the associated initiative',
    example: 12,
  })
  initiative_id: number;

  @ApiProperty({
    description: 'List of indicators associated with this result',
    example: [],
    required: false,
  })
  indicators?: any[];

  @ApiProperty({
    description: 'List of impact areas targets associated with this result',
    example: [],
    required: false,
  })
  impactAreasTargets?: any[];

  @ApiProperty({
    description: 'List of SDG targets associated with this result',
    example: [],
    required: false,
  })
  sdgTargest?: any[];

  @ApiProperty({
    description: 'List of action area outcomes associated with this result',
    example: [],
    required: false,
  })
  actionAreaOutcome?: any[];

  @ApiProperty({
    description: 'List of targets indicators associated with this result',
    example: [],
    required: false,
  })
  targetsIndicators?: any[];

  @ApiProperty({
    description: 'Indicates if this result impacts SDGs or action areas',
    example: false,
  })
  is_sdg_action_impact: boolean;

  @ApiProperty({
    description: 'Narrative of the ToC progressive achievement',
    example: 'Some narrative',
  })
  toc_progressive_narrative: string;

  @ApiProperty({
    description: 'ID of the ToC level',
    example: 2,
  })
  toc_level_id: number;
}
