import { ApiProperty } from '@nestjs/swagger';

// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-2)

/** The three counts shared by `totals`, every `byProgram` item and every `byCenter` item. */
export class BilateralProjectCountsDto {
  @ApiProperty({
    description:
      'Active projects of the phase with at least one approved Program / Accelerator mapping (allocation > 0).',
  })
  mapped: number;

  @ApiProperty({
    description:
      'Mapped projects with at least one active W3 (bilateral) result of the requested version, any status except Discontinued. Never greater than mapped.',
  })
  withBilateralResults: number;

  @ApiProperty({
    description:
      'Mapped projects linked to at least one active W1/W2 result of the requested version (no status filter). Never greater than mapped.',
  })
  w1w2Contributors: number;
}

/** One Program or Accelerator of the open portfolio. */
export class BilateralProjectsByProgramDto extends BilateralProjectCountsDto {
  @ApiProperty({ description: 'CLARISA official code (e.g. SP01, A3).' })
  code: string;

  @ApiProperty({ description: 'Short name of the Program / Accelerator.' })
  shortName: string;

  @ApiProperty({ description: 'Full name of the Program / Accelerator.' })
  name: string;
}

/** One owning Center (or the Unassigned bucket) of the mapped projects. */
export class BilateralProjectsByCenterDto extends BilateralProjectCountsDto {
  @ApiProperty({
    description:
      'CLARISA Center code (CENTER-xx); null for the Unassigned bucket.',
    nullable: true,
    type: String,
  })
  code: string | null;

  @ApiProperty({
    description:
      'Acronym of the Center institution; null for Unassigned or when the alias code has no Center row.',
    nullable: true,
    type: String,
  })
  acronym: string | null;

  @ApiProperty({
    description:
      'Name of the Center institution; null for Unassigned or when the alias code has no Center row.',
    nullable: true,
    type: String,
  })
  name: string | null;
}

/** Payload (`response`) of `GET portfolio/bilateral-projects`. */
export class PortfolioBilateralProjectsResponseDto {
  @ApiProperty({
    description: 'Reporting version (phase) the figures belong to.',
  })
  versionId: number;

  @ApiProperty({
    description: 'Phase name of the version, when it is configured.',
    nullable: true,
    type: String,
  })
  phaseName: string | null;

  @ApiProperty({ description: 'Phase year of the version.' })
  phaseYear: number;

  @ApiProperty({
    description: 'Each mapped project counted once.',
    type: () => BilateralProjectCountsDto,
  })
  totals: BilateralProjectCountsDto;

  @ApiProperty({
    description:
      'Every active Program and Accelerator of the open portfolio, zeros included. A project mapped to several appears under each. Unordered.',
    type: () => [BilateralProjectsByProgramDto],
  })
  byProgram: BilateralProjectsByProgramDto[];

  @ApiProperty({
    description:
      'Owning Centers with at least one mapped project, plus an Unassigned bucket (code null) when needed. Unordered.',
    type: () => [BilateralProjectsByCenterDto],
  })
  byCenter: BilateralProjectsByCenterDto[];

  @ApiProperty({
    description:
      'Projects with W3 results of the version but no approved mapping (not counted in the figures above).',
  })
  unmappedWithBilateralResults: number;
}
