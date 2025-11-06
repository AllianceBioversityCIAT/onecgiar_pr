import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResultTocResultItemDto {
  @ApiPropertyOptional()
  result_toc_result_id?: number;

  @ApiPropertyOptional()
  toc_result_id?: number;

  @ApiPropertyOptional()
  toc_progressive_narrative?: string;

  @ApiPropertyOptional()
  toc_level_id?: number;
}

export class ResultTocResultBlockDto {
  @ApiPropertyOptional()
  planned_result?: boolean | null;

  @ApiPropertyOptional()
  initiative_id?: number;

  @ApiPropertyOptional({ type: () => [ResultTocResultItemDto] })
  result_toc_results?: ResultTocResultItemDto[];
}

export class ContributorTocResultDto {
  @ApiPropertyOptional()
  planned_result?: boolean | null;

  @ApiPropertyOptional()
  initiative_id?: number;

  @ApiPropertyOptional({ type: () => [ResultTocResultItemDto] })
  result_toc_results?: ResultTocResultItemDto[];
}

export class CreateResultsTocResultV2Dto {
  @ApiPropertyOptional()
  result_id?: number;

  @ApiPropertyOptional()
  changePrimaryInit?: number;

  @ApiPropertyOptional()
  email_template?: string;

  @ApiPropertyOptional({ type: () => [Number] })
  accepted_contributing_initiatives?: number[];

  @ApiPropertyOptional({ type: () => [Number] })
  pending_contributing_initiatives?: number[];

  @ApiPropertyOptional({ type: () => ResultTocResultBlockDto })
  result_toc_result?: ResultTocResultBlockDto;

  @ApiPropertyOptional({ type: () => [ContributorTocResultDto] })
  contributors_result_toc_result?: ContributorTocResultDto[];

  @ApiPropertyOptional({
    description:
      'Pending contributors to cancel (share_result_request_id list).',
    type: () => [Number],
  })
  cancel_pending_requests?: number[];
}
