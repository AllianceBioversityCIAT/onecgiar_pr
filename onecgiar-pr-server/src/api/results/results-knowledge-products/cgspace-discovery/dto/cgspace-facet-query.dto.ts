import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALL_REPOSITORIES,
  KP_REPOSITORY_VALUES,
  KpRepository,
  normalizeRepositoryParam,
} from '../repositories.config';

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
    description: 'Maximum facet values to return, PER SOURCE',
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

  @ApiPropertyOptional({
    description:
      'Repositories to union the facet over: repeatable (`repository=cgspace&repository=melspace`) or comma-separated (`repository=cgspace,melspace`). Case-insensitive, deduped. Defaults to all three when omitted. Any other value returns 400.',
    isArray: true,
    enum: KP_REPOSITORY_VALUES,
    default: KP_REPOSITORY_VALUES,
  })
  @Transform(({ value }) => normalizeRepositoryParam(value))
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(KP_REPOSITORY_VALUES, { each: true })
  repository?: KpRepository[] = [...ALL_REPOSITORIES];
}
