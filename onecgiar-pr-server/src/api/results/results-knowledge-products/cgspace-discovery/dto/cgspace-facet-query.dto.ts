import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CgspaceFacetQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive prefix to filter facet values',
    maxLength: 100,
    example: 'Jour',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Maximum facet values to return',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 50;
}
