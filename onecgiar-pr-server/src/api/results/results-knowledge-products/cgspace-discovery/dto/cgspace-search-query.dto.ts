import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALL_REPOSITORIES,
  KP_REPOSITORY_VALUES,
  KpRepository,
  normalizeRepositoryParam,
} from '../repositories.config';

export class CgspaceSearchQueryDto {
  @ApiPropertyOptional({
    description:
      'Free-text search (3-200 chars). Required when no type/year/center filter is set.',
    minLength: 3,
    maxLength: 200,
    example: 'maize',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (o: CgspaceSearchQueryDto) =>
      (!o.type && !o.center && !o.year) ||
      (o.query !== undefined && o.query !== null && o.query !== ''),
  )
  @IsNotEmpty({ message: 'query is required when no filters are set' })
  @IsString()
  @Length(3, 200)
  query?: string;

  @ApiPropertyOptional({
    description: 'Zero-based page',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({
    description:
      'Page size, PER SOURCE (not the merged total): the merged page holds at most size × selected repositories.',
    default: 10,
    minimum: 1,
    maximum: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  size?: number = 10;

  @ApiPropertyOptional({
    description: 'Item type filter (CGSpace `itemtype` facet value)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @ApiPropertyOptional({
    description: 'Publication year filter (4 digits)',
    example: '2026',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'year must be a 4-digit number' })
  year?: string;

  @ApiPropertyOptional({
    description:
      'Center / affiliation filter (CGSpace `affiliation` facet value)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  center?: string;

  @ApiPropertyOptional({
    description:
      'Repositories to search: repeatable (`repository=cgspace&repository=melspace`) or comma-separated (`repository=cgspace,melspace`). Case-insensitive, deduped. Defaults to all three when omitted. Any other value returns 400.',
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
