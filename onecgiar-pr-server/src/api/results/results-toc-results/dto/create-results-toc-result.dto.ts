import { ApiProperty } from '@nestjs/swagger';

export class CreateResultsTocResultDto {
  @ApiProperty({ required: false })
  result_id?: number;

  @ApiProperty({ required: false })
  contributing_initiatives?: {
    accepted_contributing_initiatives: InitiativeInterface[];
    pending_contributing_initiatives: ShareResultRequestInterface[];
  };

  @ApiProperty({ type: () => [DonorInterfaceToc], required: false })
  contributing_np_projects?: DonorInterfaceToc[];

  @ApiProperty({ type: () => [CenterInterfaceToc], required: false })
  contributing_center?: CenterInterfaceToc[];

  @ApiProperty()
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: ResultToResultInterfaceToc[];
  };

  @ApiProperty({ type: () => [ContributorResultTocResult], required: false })
  contributors_result_toc_result?: ContributorResultTocResult[];

  @ApiProperty({ type: () => [ResultTocImpactsInterface], required: false })
  impacts?: ResultTocImpactsInterface[];

  // @ApiProperty({ type: () => [ShareResultRequestInterface], required: false })
  // pending_contributing_initiatives?: ShareResultRequestInterface[];

  @ApiProperty({ type: () => [Object], required: false })
  bodyNewTheoryOfChanges?: any[];

  @ApiProperty({ type: () => [Object], required: false })
  impactsTarge?: any[];

  @ApiProperty({ type: () => [Object], required: false })
  sdgTargets?: any[];

  @ApiProperty({ type: () => [Object], required: false })
  bodyActionArea?: any[];

  @ApiProperty()
  changePrimaryInit: number;

  @ApiProperty({ required: false })
  email_template?: string;
}

export class ContributorResultTocResult {
  @ApiProperty()
  planned_result: boolean;

  @ApiProperty()
  initiative_id: number;

  @ApiProperty()
  result_toc_results: ResultToResultInterfaceToc[];
}

export class ResultTocImpactsInterface {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  target: TargetTocInterface[];

  @ApiProperty()
  indicators: IndicatorsTocInterface[];
}

export class TargetTocInterface {
  @ApiProperty()
  targetId: number;

  @ApiProperty({ required: false })
  target?: string;
}

export class IndicatorsTocInterface {
  @ApiProperty()
  id: number;

  @ApiProperty()
  indicator_statement?: string;
}

export class InitiativeInterface {
  @ApiProperty()
  id: number;
}

export class DonorInterfaceToc {
  @ApiProperty()
  funder: number;

  @ApiProperty()
  grant_title: string;

  @ApiProperty()
  center_grant_id: string;

  @ApiProperty()
  lead_center: string;
}

export class CenterInterfaceToc {
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
