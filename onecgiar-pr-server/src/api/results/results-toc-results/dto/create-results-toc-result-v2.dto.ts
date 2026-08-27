import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class ContributingInitiativeTocFlagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description:
      'Indicates the science program was prefilled from Theory of Change mapping.',
  })
  @IsOptional()
  @IsBoolean()
  from_toc?: boolean;
}

export class ResultTocResultItemDto {
  @ApiPropertyOptional()
  result_toc_result_id?: number;

  @ApiPropertyOptional()
  toc_result_id?: number;

  @ApiPropertyOptional()
  toc_progressive_narrative?: string;

  @ApiPropertyOptional()
  toc_level_id?: number;

  @ApiPropertyOptional({
    description:
      'Whether the Program invested financial resources in this result (2026 Contributors & Partners).',
  })
  @IsOptional()
  @IsBoolean()
  program_invested_financial_resources?: boolean | null;

  @ApiPropertyOptional({
    description: 'ToC indicators and per-target contribution values (P2-3089).',
    type: () => [ResultTocIndicatorDto],
  })
  indicators?: ResultTocIndicatorDto[];
}

export class ResultTocIndicatorTargetDto {
  @ApiPropertyOptional()
  indicators_targets?: number | null;

  @ApiPropertyOptional()
  number_target?: number | null;

  @ApiPropertyOptional({
    description:
      'Contribution to target for this indicator (accepts 0 for qualitative indicators).',
  })
  contributing_indicator?: number | null;

  @ApiPropertyOptional()
  target_date?: number | null;

  @ApiPropertyOptional()
  target_progress_narrative?: string | null;

  @ApiPropertyOptional()
  indicator_question?: boolean | null;
}

export class ResultTocIndicatorDto {
  @ApiPropertyOptional()
  result_toc_result_indicator_id?: number;

  @ApiPropertyOptional()
  toc_results_indicator_id?: string;

  @ApiPropertyOptional()
  related_node_id?: string;

  @ApiPropertyOptional({ type: () => [ResultTocIndicatorTargetDto] })
  targets?: ResultTocIndicatorTargetDto[];
}

export class ResultTocResultBlockDto {
  @ApiPropertyOptional()
  planned_result?: boolean | null;

  @ApiPropertyOptional()
  initiative_id?: number;

  @ApiPropertyOptional()
  toc_progressive_narrative?: string | null;

  @ApiPropertyOptional({
    description:
      'Whether the Program invested financial resources (2026 AC6 — unplanned / TOC = No only).',
  })
  @IsOptional()
  @IsBoolean()
  program_invested_financial_resources?: boolean | null;

  @ApiPropertyOptional({ type: () => [ResultTocResultItemDto] })
  result_toc_results?: ResultTocResultItemDto[];
}

export class ContributorTocResultDto {
  @ApiPropertyOptional()
  planned_result?: boolean | null;

  @ApiPropertyOptional()
  initiative_id?: number;

  @ApiPropertyOptional({
    description:
      'Whether the Program invested financial resources (2026 AC6 — contributor science program).',
  })
  @IsOptional()
  @IsBoolean()
  program_invested_financial_resources?: boolean | null;

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
  accepted_contributing_initiatives?: Array<
    number | ContributingInitiativeTocFlagDto
  >;

  @ApiPropertyOptional({ type: () => [ContributingInitiativeTocFlagDto] })
  pending_contributing_initiatives?: Array<
    number | ContributingInitiativeTocFlagDto
  >;

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
