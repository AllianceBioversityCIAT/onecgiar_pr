import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Minimal shape for phase filter (version.id) */
export class BasicReportPhaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  id?: string | number;
}

/** Minimal shape for initiative filter (clarisa_initiatives.id / official_code) */
export class BasicReportInitiativeDto {
  @ApiPropertyOptional()
  @IsOptional()
  id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  official_code?: string;
}

/** Minimal shape for indicator category filter (result_type.id) */
export class BasicReportIndicatorCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  id?: number;
}

/** Minimal shape for status filter (result_status.result_status_id) */
export class BasicReportStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  status_id?: string | number;
}

/** Minimal shape for portfolio filter (clarisa_portfolios.id) */
export class BasicReportPortfolioDto {
  @ApiPropertyOptional()
  @IsOptional()
  id?: number;
}

/** Funding source: W1/W2 -> Result, W3/Bilateral -> API */
export class BasicReportFundingSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  id?: number;
  @ApiPropertyOptional({ example: 'W1/W2' })
  @IsOptional()
  name?: string;
}

/** Lead center filter (results_center.center_id, is_leading_result = 1) */
export class BasicReportLeadCenterDto {
  @ApiPropertyOptional()
  @IsOptional()
  code?: string;
}

export class BasicReportFiltersDto {
  @ApiPropertyOptional({
    description: 'Start date for created_date filter (YYYY-MM-DD). Optional.',
  })
  @IsOptional()
  @IsString()
  initDate?: string;

  @ApiPropertyOptional({
    description: 'End date for created_date filter (YYYY-MM-DD). Optional.',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by phases (version.id).',
    type: [BasicReportPhaseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportPhaseDto)
  phases?: BasicReportPhaseDto[];

  @ApiPropertyOptional({
    description: 'Search in title and result_code.',
  })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional({
    description: 'Filter by initiatives (clarisa_initiatives).',
    type: [BasicReportInitiativeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportInitiativeDto)
  inits?: BasicReportInitiativeDto[];

  @ApiPropertyOptional({
    description: 'Filter by indicator categories (result_type.id).',
    type: [BasicReportIndicatorCategoryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportIndicatorCategoryDto)
  indicatorCategories?: BasicReportIndicatorCategoryDto[];

  @ApiPropertyOptional({
    description: 'Filter by result status.',
    type: [BasicReportStatusDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportStatusDto)
  status?: BasicReportStatusDto[];

  @ApiPropertyOptional({
    description: 'Filter by Clarisa portfolios (version.portfolio_id).',
    type: [BasicReportPortfolioDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportPortfolioDto)
  clarisaPortfolios?: BasicReportPortfolioDto[];

  @ApiPropertyOptional({
    description: 'Funding source: W1/W2 = Result, W3/Bilateral = API.',
    type: [BasicReportFundingSourceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportFundingSourceDto)
  fundingSource?: BasicReportFundingSourceDto[];

  @ApiPropertyOptional({
    description:
      'Filter by lead centers (results_center.is_leading_result = 1).',
    type: [BasicReportLeadCenterDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasicReportLeadCenterDto)
  leadCenters?: BasicReportLeadCenterDto[];
}

/** Normalized filters for the repository (IDs and values only). */
export interface BasicReportFiltersNormalized {
  initDate?: string;
  endDate?: string;
  phaseIds?: number[];
  searchText?: string;
  initiativeIds?: number[];
  initiativeCodes?: string[];
  resultTypeIds?: number[];
  statusIds?: number[];
  portfolioIds?: number[];
  sourceValues?: string[];
  leadCenterCodes?: string[];
}
