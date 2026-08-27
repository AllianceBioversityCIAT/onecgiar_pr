import {
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
    description: 'Page size',
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
    description: 'Source repository',
    enum: ['cgspace'],
    default: 'cgspace',
  })
  @IsOptional()
  @IsIn(['cgspace'])
  repository?: string = 'cgspace';
}
