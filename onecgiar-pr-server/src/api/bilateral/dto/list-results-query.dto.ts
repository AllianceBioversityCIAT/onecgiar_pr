import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Source filter: Result (W1/W2) or API (W3/Bilateral) */
export enum ListResultsSourceEnum {
  Result = 'Result',
  API = 'API',
}

/** Result type filter by name (result_type.name) */
export enum ListResultsResultTypeEnum {
  PolicyChange = 'Policy change',
  InnovationUse = 'Innovation use',
  OtherOutcome = 'Other outcome',
  CapacitySharingForDevelopment = 'Capacity sharing for development',
  KnowledgeProduct = 'Knowledge product',
  InnovationDevelopment = 'Innovation development',
  OtherOutput = 'Other output',
  ImpactContribution = 'Impact contribution',
  InnovationPackage = 'Innovation Package',
}

/** Result status filter by status_name (result_status.status_name) */
export enum ListResultsStatusEnum {
  Editing = 'Editing',
  QualityAssessed = 'Quality Assessed',
  Submitted = 'Submitted',
  Discontinued = 'Discontinued',
  PendingReview = 'Pending Review',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class ListResultsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based). Default: 1',
    example: 1,
    minimum: 1,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : DEFAULT_PAGE,
  )
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: `Number of items per page. Default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT}`,
    example: 10,
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : DEFAULT_LIMIT,
  )
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Filter by source: Result (W1/W2) or API (W3/Bilateral)',
    enum: ListResultsSourceEnum,
    example: 'API',
  })
  @IsOptional()
  @IsEnum(ListResultsSourceEnum)
  @Transform(({ value }) => {
    if (value === undefined || value === '') return undefined;
    const v = String(value).trim().toLowerCase();
    if (v === 'w1/w2' || v === 'result') return ListResultsSourceEnum.Result;
    if (v === 'w3/bilateral' || v === 'api') return ListResultsSourceEnum.API;
    return value;
  })
  source?: ListResultsSourceEnum;

  @ApiPropertyOptional({
    description:
      'Filter by portfolio acronym (clarisa_portfolios.acronym, e.g. P22, P25)',
    example: 'P22',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : undefined,
  )
  portfolio?: string;

  @ApiPropertyOptional({
    description: 'Filter by phase year (version.phase_year)',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  phase_year?: number;

  @ApiPropertyOptional({
    description: 'Filter by result type name',
    enum: ListResultsResultTypeEnum,
    example: ListResultsResultTypeEnum.KnowledgeProduct,
  })
  @IsOptional()
  @IsEnum(ListResultsResultTypeEnum)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? value : undefined,
  )
  result_type?: ListResultsResultTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by result status ID (1–7)',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  status_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by result status name',
    enum: ListResultsStatusEnum,
    example: ListResultsStatusEnum.PendingReview,
  })
  @IsOptional()
  @IsEnum(ListResultsStatusEnum)
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? value : undefined,
  )
  status?: ListResultsStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter results last updated on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  last_updated_from?: string;

  @ApiPropertyOptional({
    description:
      'Filter results last updated on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  last_updated_to?: string;

  @ApiPropertyOptional({
    description: 'Filter results created on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  created_from?: string;

  @ApiPropertyOptional({
    description: 'Filter results created on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  created_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by leading center: center ID (code) or acronym',
    example: 'IRRI',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : undefined,
  )
  center?: string;

  @ApiPropertyOptional({
    description:
      'Filter by initiative official_code: returns results where this initiative is the lead (role 1 in results_by_initiative)',
    example: 'CRP-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : undefined,
  )
  initiative_lead_code?: string;

  @ApiPropertyOptional({
    description: 'Search in result title (safe parameterized search)',
    example: 'climate',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : undefined,
  )
  search?: string;
}

export const LIST_RESULTS_PAGINATION = {
  defaultPage: DEFAULT_PAGE,
  defaultLimit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT,
} as const;
