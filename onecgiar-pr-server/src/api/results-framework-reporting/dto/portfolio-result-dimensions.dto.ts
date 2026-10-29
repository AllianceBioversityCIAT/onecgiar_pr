import { ApiProperty } from '@nestjs/swagger';

// @akili-spec changes/portfolio-overview-revamp/global-filters (GLF-T-1)

/** One project of the dimensions map (id and labels only). */
export class PortfolioResultDimensionsProjectDto {
  @ApiProperty({ description: 'CLARISA project id.' })
  id: number;

  @ApiProperty({ description: 'Short name of the project.' })
  shortName: string;

  @ApiProperty({ description: 'Full name of the project.' })
  fullName: string;
}

/** One Center of the dimensions map (code and labels only). */
export class PortfolioResultDimensionsCenterDto {
  @ApiProperty({ description: 'CLARISA Center code (e.g. CENTER-03).' })
  code: string;

  @ApiProperty({
    description:
      'Acronym of the Center institution. A code with no catalogue row is labelled by the code itself.',
  })
  acronym: string;

  @ApiProperty({
    description:
      'Name of the Center institution. A code with no catalogue row is labelled by the code itself.',
  })
  name: string;
}

export class PortfolioResultDimensionsResponseDto {
  @ApiProperty({ description: 'Resolved reporting version id.' })
  versionId: number;

  @ApiProperty({
    description: 'Name of the resolved reporting phase.',
    nullable: true,
    type: String,
  })
  phaseName: string | null;

  @ApiProperty({
    description:
      'Positional pairs [resultId, projectId], one per active result / active project link, each pair once.',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
    example: [[101, 5]],
  })
  projectLinks: Array<[number, number]>;

  @ApiProperty({
    description:
      'Positional pairs [resultId, centerCode], one per active result / active Center link (lead or contributing), each pair once.',
    type: 'array',
    items: {
      type: 'array',
      items: { oneOf: [{ type: 'number' }, { type: 'string' }] },
    },
    example: [[101, 'CENTER-03']],
  })
  centerLinks: Array<[number, string]>;

  @ApiProperty({
    description: 'Labels of every project in projectLinks.',
    type: [PortfolioResultDimensionsProjectDto],
  })
  projects: PortfolioResultDimensionsProjectDto[];

  @ApiProperty({
    description: 'Labels of every Center in centerLinks.',
    type: [PortfolioResultDimensionsCenterDto],
  })
  centers: PortfolioResultDimensionsCenterDto[];

  @ApiProperty({
    description:
      'Ids of the projects linked to at least one W3 (bilateral, source API) result of the version.',
    type: [Number],
  })
  w3ProjectIds: number[];
}
