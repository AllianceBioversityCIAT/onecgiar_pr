import { ApiProperty } from '@nestjs/swagger';
import { ShareResultRequest } from '../entities/share-result-request.entity';

export class CreateShareResultRequestDto {
  @ApiProperty()
  request_status_id: number;

  @ApiProperty({ type: () => [ShareResultRequest] })
  result_request: ShareResultRequest;

  @ApiProperty()
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: resultToResultInterfaceToc[];
  };

  @ApiProperty({ required: false })
  changePrimaryInit: number;
}

class resultToResultInterfaceToc {
  @ApiProperty()
  result_toc_result_id?: number;

  @ApiProperty()
  toc_result_id?: number;

  @ApiProperty()
  action_area_outcome_id?: number;

  @ApiProperty()
  results_id: number;

  @ApiProperty()
  planned_result?: boolean;

  @ApiProperty()
  initiative_id: number;

  @ApiProperty()
  indicators?: any[];

  @ApiProperty()
  impactAreasTargets?: any[];

  @ApiProperty()
  sdgTargest?: any[];

  @ApiProperty()
  actionAreaOutcome?: any[];

  @ApiProperty()
  targetsIndicators?: any[];

  @ApiProperty()
  is_sdg_action_impact: boolean;

  @ApiProperty()
  toc_progressive_narrative: string;

  @ApiProperty()
  toc_level_id: number;
}
