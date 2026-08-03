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
