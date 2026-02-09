import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export const ORDER_DIRECTIONS = ['ASC', 'DESC'] as const;
export type OrderDirection = (typeof ORDER_DIRECTIONS)[number];

export class GetResultRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by version (phase) ID of the result',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version_id?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of items per list (pending and done)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort direction by requested_date',
    enum: ORDER_DIRECTIONS,
  })
  @IsOptional()
  @IsIn(ORDER_DIRECTIONS)
  orderDirection?: OrderDirection;
}
