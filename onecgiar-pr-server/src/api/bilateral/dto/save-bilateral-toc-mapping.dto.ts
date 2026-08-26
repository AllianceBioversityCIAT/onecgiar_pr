import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class BilateralTocResultItemDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  toc_level_id?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  toc_result_id?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  toc_progressive_narrative?: string;

  @ApiPropertyOptional({ type: () => [BilateralIndicatorDto] })
  @IsOptional()
  indicators?: BilateralIndicatorDto[];
}

class BilateralIndicatorDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiPropertyOptional({ type: () => [BilateralIndicatorTargetDto] })
  @IsOptional()
  targets?: BilateralIndicatorTargetDto[];
}

class BilateralIndicatorTargetDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  targetId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  contributing_indicator?: number;
}

class BilateralResultTocBlockDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  planned_result?: boolean;

  /**
   * Justification the reporter gives when `planned_result` is false ("Why is this result being
   * reported?"). Unplanned results have no ToC node to hang the text on, so the server reads it
   * from this top level — see `_handleUnplannedSpecialCase` in results-toc-results.service.ts.
   */
  @ApiPropertyOptional({
    description:
      'Justification for reporting an unplanned result. Only read when planned_result is false.',
  })
  @IsString()
  @IsOptional()
  toc_progressive_narrative?: string;

  @ApiPropertyOptional({ type: () => [BilateralTocResultItemDto] })
  @IsOptional()
  result_toc_results?: BilateralTocResultItemDto[];
}

export class SaveBilateralTocMappingDto {
  @ApiPropertyOptional({ type: () => BilateralResultTocBlockDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilateralResultTocBlockDto)
  result_toc_result?: BilateralResultTocBlockDto;
}
