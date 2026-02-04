import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for versioning endpoint.
 * Limits returned fields to prevent large payloads exceeding Lambda's 6MB response limit.
 * @see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
 */
export class VersioningResponseDto {
  @ApiProperty({ description: 'Phase ID' })
  id: number;

  @ApiProperty({ description: 'Phase name' })
  phase_name: string;

  @ApiProperty({ description: 'Start date', nullable: true })
  start_date?: string;

  @ApiProperty({ description: 'End date', nullable: true })
  end_date?: string;

  @ApiProperty({ description: 'Phase year', nullable: true })
  phase_year?: number;

  @ApiProperty({ description: 'Status (open/closed)' })
  status: boolean;

  @ApiProperty({ description: 'Previous phase ID', nullable: true })
  previous_phase?: number;

  @ApiProperty({ description: 'Application module ID' })
  app_module_id: number;

  @ApiProperty({ description: 'Reporting phase ID', nullable: true })
  reporting_phase?: number;

  @ApiProperty({ description: 'Portfolio ID', nullable: true })
  portfolio_id?: number;

  @ApiProperty({ description: 'Previous phase name', nullable: true })
  previous_phase_name?: string;

  @ApiProperty({ description: 'Reporting phase name', nullable: true })
  reporting_phase_name?: string;

  @ApiProperty({ description: 'Portfolio acronym', nullable: true })
  portfolio_acronym?: string;

  @ApiProperty({ description: 'Whether this phase can be deleted' })
  can_be_deleted: boolean;
}

/**
 * Paginated response wrapper for versioning endpoint.
 * Ensures responses never exceed Lambda's 6MB payload limit.
 */
export class PaginatedVersioningResponseDto {
  @ApiProperty({ type: [VersioningResponseDto], description: 'List of phases' })
  items: VersioningResponseDto[];

  @ApiProperty({ description: 'Current page number (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items matching the query' })
  total: number;

  @ApiProperty({ description: 'Whether there are more pages available' })
  hasNext: boolean;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
