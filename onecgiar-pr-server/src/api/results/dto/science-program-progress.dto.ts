import { ApiProperty } from '@nestjs/swagger';

export class StatusBreakdownDto {
  @ApiProperty({ description: 'Identifier of the result status.' })
  statusId: number;

  @ApiProperty({ description: 'Human readable status name.' })
  statusName: string;

  @ApiProperty({ description: 'Number of results in this status.' })
  count: number;
}

export class VersionProgressDto {
  @ApiProperty({ description: 'Version identifier (phase id).' })
  versionId: number;

  @ApiProperty({ description: 'Phase name as registered in the system.' })
  phaseName: string;

  @ApiProperty({
    description: 'Reporting year associated to the phase.',
    nullable: true,
  })
  phaseYear: number | null;

  @ApiProperty({
    description: 'Total number of results reported for this version.',
  })
  totalResults: number;

  @ApiProperty({
    description: 'Result status distribution for the version.',
    type: () => [StatusBreakdownDto],
  })
  statuses: StatusBreakdownDto[];
}

export class ScienceProgramProgressDto {
  @ApiProperty({ description: 'Initiative identifier.' })
  initiativeId: number;

  @ApiProperty({ description: 'Official code for the initiative.' })
  initiativeCode: string;

  @ApiProperty({ description: 'Full initiative name.' })
  initiativeName: string;

  @ApiProperty({ description: 'Short initiative name.', required: false })
  initiativeShortName?: string;

  @ApiProperty({
    description: 'Associated portfolio identifier.',
    required: false,
  })
  portfolioId?: number;

  @ApiProperty({ description: 'Associated portfolio name.', required: false })
  portfolioName?: string;

  @ApiProperty({
    description: 'Associated portfolio acronym.',
    required: false,
  })
  portfolioAcronym?: string;

  @ApiProperty({ description: 'CGIAR entity type code.', required: false })
  entityTypeCode?: number;

  @ApiProperty({ description: 'CGIAR entity type name.', required: false })
  entityTypeName?: string;

  @ApiProperty({
    description: 'Total number of results linked to the initiative.',
    nullable: true,
  })
  totalResults: number | null;

  @ApiProperty({ description: 'Completion percentage for the initiative.' })
  progress: number;

  @ApiProperty({
    description: 'Per-version breakdown for the initiative.',
    type: () => [VersionProgressDto],
  })
  versions: VersionProgressDto[];
}

export class ScienceProgramProgressResponseDto {
  @ApiProperty({
    description:
      'Science programs where the authenticated user has edit permissions.',
    type: () => [ScienceProgramProgressDto],
  })
  mySciencePrograms: ScienceProgramProgressDto[];

  @ApiProperty({
    description: 'Science programs where the authenticated user is a guest.',
    type: () => [ScienceProgramProgressDto],
  })
  otherSciencePrograms: ScienceProgramProgressDto[];
}
