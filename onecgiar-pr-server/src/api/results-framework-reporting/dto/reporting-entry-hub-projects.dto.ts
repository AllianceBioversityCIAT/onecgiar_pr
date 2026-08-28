// @akili-spec changes/reporting-entry-hub
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HubProjectLeadCenterDto {
  @ApiProperty({ example: 46 })
  id: number;

  @ApiProperty({ example: 'Alliance of Bioversity and CIAT' })
  name: string;

  @ApiProperty({ example: 'Alliance' })
  acronym: string;
}

export class HubProjectScienceProgramDto {
  @ApiProperty({ example: 1 })
  programId: number;

  @ApiProperty({ example: 'SP02' })
  programCode: string;

  @ApiProperty({
    example: '40.00',
    description:
      'clarisa_project_mappings.allocation is decimal(5,2) and arrives as a string.',
  })
  allocation: string;

  @ApiPropertyOptional({ example: 'Sustainable Farming' })
  spName?: string;

  @ApiPropertyOptional({ example: 'SF' })
  spShortName?: string;
}

export class HubProjectDto {
  // Mirrors the upstream getProjectsByCenter() item shape: ClarisaProject.id
  // is a bigint PK, so this arrives as a numeric-looking STRING at runtime
  // (same caveat as `allocation`) — never `===` it against a number.
  @ApiProperty({ example: 1368 })
  id: number;

  @ApiProperty({ example: 'B-A1368' })
  shortName: string;

  @ApiProperty({ example: 'Project full name' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Trimmed to 200 characters.' })
  summary?: string;

  @ApiPropertyOptional({ description: 'Trimmed to 200 characters.' })
  description?: string;

  @ApiPropertyOptional({ type: HubProjectLeadCenterDto, nullable: true })
  leadCenter?: HubProjectLeadCenterDto | null;

  @ApiProperty({ type: [HubProjectScienceProgramDto] })
  sciencePrograms: HubProjectScienceProgramDto[];

  @ApiProperty({
    example: 40,
    description:
      'Number(mapping.allocation) for the requested program — never sort the raw string.',
  })
  allocation: number;
}

export class CenterProjectsDto {
  @ApiProperty({ example: 'CENTER-03', description: 'CLARISA center code.' })
  code: string;

  @ApiProperty({ example: 'Alliance of Bioversity and CIAT' })
  name: string;

  @ApiProperty({ example: 'Alliance' })
  acronym: string;

  @ApiProperty({
    example: 198,
    description: "The center's active projects in the active reporting year.",
  })
  total: number;

  @ApiProperty({
    example: 44,
    description: 'Projects with an allocation to the requested program.',
  })
  matching: number;

  @ApiPropertyOptional({
    example: false,
    description: "True when this center's project lookup failed.",
  })
  error?: boolean;

  @ApiProperty({ type: [HubProjectDto] })
  projects: HubProjectDto[];
}

export class ReportingEntryHubProjectsDto {
  @ApiProperty({ example: 'SP02' })
  programCode: string;

  @ApiPropertyOptional({ example: 2026, nullable: true })
  activeYear: number | null;

  @ApiProperty({
    example: false,
    description: 'True when the 300-project cap trimmed the response.',
  })
  truncated: boolean;

  @ApiProperty({ type: [CenterProjectsDto] })
  centers: CenterProjectsDto[];
}
