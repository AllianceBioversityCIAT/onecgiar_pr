import { ApiProperty } from '@nestjs/swagger';

// @akili-spec changes/portfolio-overview-revamp/toc-kpi-progress (TKP-T-2)

/** A total / covered pair of ToC KPIs (distinct ToC indicators). */
export class TocKpiCountsDto {
  @ApiProperty({
    description:
      'Distinct in-scope ToC KPIs (indicators). A KPI counts once, however many targets or Areas of Work reach it.',
  })
  total: number;

  @ApiProperty({
    description:
      'Distinct KPIs covered by at least one active pooled result (source Result, status Quality Assessed or Submitted) of the requested version, linked through an active, applicable indicator link. Never greater than total.',
  })
  covered: number;
}

/** One Program or Accelerator of the open portfolio. */
export class PortfolioTocCoverageProgramDto extends TocKpiCountsDto {
  @ApiProperty({ description: 'CLARISA official code (e.g. SP01, A3).' })
  code: string;

  @ApiProperty({ description: 'Short name of the Program / Accelerator.' })
  shortName: string;

  @ApiProperty({ description: 'Full name of the Program / Accelerator.' })
  name: string;

  @ApiProperty({
    description: 'KPIs of Output nodes.',
    type: () => TocKpiCountsDto,
  })
  outputs: TocKpiCountsDto;

  @ApiProperty({
    description: 'KPIs of Outcome nodes.',
    type: () => TocKpiCountsDto,
  })
  outcomes: TocKpiCountsDto;
}

/** Payload (`response`) of `GET toc-results/portfolio-coverage`. */
export class PortfolioTocCoverageResponseDto {
  @ApiProperty({ description: 'Version (phase) the figures belong to.' })
  versionId: number;

  @ApiProperty({
    description: 'Phase name of the version, when it is configured.',
    nullable: true,
  })
  phaseName: string | null;

  @ApiProperty({ description: 'Reporting year of the version.' })
  reportingYear: number;

  @ApiProperty({
    description:
      'Every active Program and Accelerator of the open portfolio, including those with zero KPIs. Unordered.',
    type: () => [PortfolioTocCoverageProgramDto],
  })
  programs: PortfolioTocCoverageProgramDto[];

  @ApiProperty({
    description: 'Sum over the programs listed.',
    type: () => TocKpiCountsDto,
  })
  portfolio: TocKpiCountsDto;
}
