import { ApiProperty } from '@nestjs/swagger';

export class ResultsCenterDto {
  @ApiProperty({
    description: 'Primary identifier of the results_center record.',
  })
  id: number;

  @ApiProperty({
    description:
      'Flag that indicates the center metadata was created from CGSpace sync.',
  })
  from_cgspace: boolean;

  @ApiProperty({
    description:
      'Whether the relation between the result and the center is active.',
  })
  is_active: boolean;

  @ApiProperty({
    description:
      'Timestamp when the relation between result and center was created.',
  })
  created_date: Date;

  @ApiProperty({
    description: 'Timestamp of the last update applied to the relation.',
  })
  last_updated_date: Date;

  @ApiProperty({
    description: 'Identifier of the result associated with the center.',
  })
  result_id: number;

  @ApiProperty({
    description: 'User identifier that created the linkage.',
  })
  created_by: number;

  @ApiProperty({
    description: 'User identifier that last updated the linkage.',
  })
  last_updated_by: number;

  @ApiProperty({
    description: 'Unique center code used across CGIAR.',
  })
  code: string;

  @ApiProperty({
    description: 'Full name of the center.',
  })
  name: string;

  @ApiProperty({
    description: 'Acronym of the center.',
  })
  acronym: string;

  @ApiProperty({
    description:
      'Flag that marks whether the center is leading the reported result.',
  })
  is_leading_result: boolean;
}
