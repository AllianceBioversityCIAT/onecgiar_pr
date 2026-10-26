import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ALL_REPOSITORIES,
  KP_REPOSITORY_VALUES,
  KpRepository,
  ProjectScope,
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
      (!o.type && !o.center && !o.year && !o.project && !o.projectScope) ||
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
      'DEPRECATED (kept one release): legacy `<code> - <title>` project label. Parsed and treated as `projectScope=linked` with `projectCode` / `projectTitle`. Prefer the `project*` params.',
    maxLength: 200,
    deprecated: true,
    example:
      'T-PJ-003942 - IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  project?: string;

  // @akili-spec changes/kp-project-strict-filter
  @ApiPropertyOptional({
    description:
      'W3/bilateral project context: CLARISA project code. Requires `projectScope`; `projectCode` or `projectTitle` is needed when `projectScope` is set.',
    maxLength: 50,
    example: 'T-PJ-003942',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @ApiPropertyOptional({
    description: 'W3/bilateral project context: CLARISA project title.',
    maxLength: 300,
    example:
      'IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  projectTitle?: string;

  @ApiPropertyOptional({
    description:
      'Lead-center acronym of the project (e.g. `IITA`). Excluded from the distinctive title words.',
    maxLength: 20,
    example: 'IITA',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  projectLeadCenter?: string;

  // @akili-spec changes/kp-related-relevance-ranking
  @ApiPropertyOptional({
    description:
      'Project description (max 1000 chars). Only read with `projectScope=related`: its distinctive words are boosted on the subject field to order the related KPs. Never changes the result set.',
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  projectDescription?: string;

  @ApiPropertyOptional({
    description:
      'Primary Science Program of the project as `<code> - <name>` (either part may be absent; max 200 chars). Only read with `projectScope=related`: boosts KPs tagged with that program. Never changes the result set.',
    maxLength: 200,
    example: 'SP13 - Genebanks',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectProgram?: string;

  @ApiPropertyOptional({
    description:
      'Full name of the project lead center (max 200 chars), e.g. `International Potato Center`. Only read with `projectScope=related`: boosts KPs whose affiliations include it. Never changes the result set.',
    maxLength: 200,
    example: 'International Potato Center',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  projectLeadCenterName?: string;

  @ApiPropertyOptional({
    description:
      'Project split: `linked` = items whose repository project field matches the project (title words or PJ code); `related` = the same search EXCLUDING those items. Absent = no project constraint. The response echoes `projectScope: { scope, applied }`; `applied=false` when the project is too generic to constrain (then `linked` returns an empty page and `related` is unconstrained).',
    enum: ['linked', 'related'],
  })
  @IsOptional()
  @IsIn(['linked', 'related'])
  @ValidateBy({
    name: 'projectScopeNeedsContext',
    validator: {
      validate: (_value, args) => {
        const dto = args?.object as CgspaceSearchQueryDto;
        return !!dto.projectCode || !!dto.projectTitle;
      },
      defaultMessage: () =>
        'projectCode or projectTitle is required with projectScope',
    },
  })
  projectScope?: ProjectScope;

  // @akili-spec changes/kp-related-strongest-first
  @ApiPropertyOptional({
    description:
      '"Only related KPs": with `projectScope=related`, keep only items matching at least one project relevance factor (subject keyword, lead center or Science Program) in the repository itself. Honored only when the related list is ranked and the full relevance block fits on every repository; otherwise ignored and `projectScope.relatedOnly` is echoed `false`. Query strings are text: only `true` enables it.',
    type: Boolean,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === true || value === 'true',
  )
  @IsOptional()
  @IsBoolean()
  projectRelatedOnly?: boolean;

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
