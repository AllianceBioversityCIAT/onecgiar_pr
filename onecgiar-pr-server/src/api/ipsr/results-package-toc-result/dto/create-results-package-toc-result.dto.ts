import { ApiProperty } from '@nestjs/swagger';

export class CreateResultsPackageTocResultDto {
  @ApiProperty()
  result_id: number;

  @ApiProperty({ required: false })
  contributing_initiatives?: {
    accepted_contributing_initiatives: InitiativeInterfaces[];
    pending_contributing_initiatives: ShareResultRequestInterface[];
  };

  @ApiProperty({ type: () => [DonorInterfaceToc], required: false })
  contributing_np_projects: DonorInterfaceToc[];

  @ApiProperty({ type: () => [CenterInterfacesToc], required: false })
  contributing_center: CenterInterfacesToc[];

  @ApiProperty()
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: ResultToResultInterfaceToc[];
  };

  @ApiProperty({ required: false })
  contributors_result_toc_result: [
    {
      planned_result: boolean;
      initiative_id: number;
      result_toc_results: ResultToResultInterfaceToc[];
    },
  ];
  // pending_contributing_initiatives: shareResultRequestInterface[];

  @ApiProperty({ type: () => [InitiativeInterfaces], required: false })
  institutions: InstitutionsInterface[];
  impacts?: any[];
  changePrimaryInit: number;
}

export class InstitutionsInterface {
  @ApiProperty()
  institutions_id: number;

  @ApiProperty({ required: false })
  deliveries?: number[];
}

export class InitiativeInterfaces {
  @ApiProperty()
  id: number;

  @ApiProperty()
  is_active: boolean;
}

export class DonorInterfaceToc {
  @ApiProperty()
  id: number;

  @ApiProperty()
  funder: number;

  @ApiProperty()
  grant_title: string;

  @ApiProperty()
  center_grant_id: string;

  @ApiProperty()
  lead_center: string;
}
export class CenterInterfacesToc {
  @ApiProperty()
  code: string;

  @ApiProperty({ required: false })
  primary?: boolean;
}

export class ResultToResultInterfaceToc {
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

export class ShareResultRequestInterface {
  @ApiProperty()
  id: number;

  @ApiProperty()
  share_result_request_id: number;

  @ApiProperty()
  is_active: boolean;
}
