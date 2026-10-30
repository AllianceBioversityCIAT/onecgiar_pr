import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * E5 query (design section 4.1). Query-string values arrive as strings and there is no global
 * pipe, so `ImpactLevelSearchService` parses and validates every field (it is the real gate).
 */
export class ImpactPreviousResultsSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Free text: result code (exact) or title (contains)',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Restrict to one phase (version id)',
  })
  @IsOptional()
  versionId?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Restrict to one portfolio id',
  })
  @IsOptional()
  portfolioId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Comma-separated result type ids, e.g. 1,7',
  })
  @IsOptional()
  typeIds?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Result id to leave out (the impact result being edited)',
  })
  @IsOptional()
  excludeResultId?: string;

  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  limit?: string;
}

/** E6 query: both fields are required integers. */
export class ImpactCountsQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'Required. Initiative (program) id',
  })
  @IsOptional()
  initiativeId?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Required. Phase (version) id',
  })
  @IsOptional()
  versionId?: string;
}
