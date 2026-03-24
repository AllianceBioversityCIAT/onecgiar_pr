import { ApiProperty } from '@nestjs/swagger';

export class FilterResultsDto {
  @ApiProperty({
    required: true,
    description:
      'Array of internal result identifiers to include in the report generation.',
    type: [Number],
  })
  resultIds: number[];

  @ApiProperty({
    required: false,
    description: 'Flag indicating whether to include full report details.',
    type: Boolean,
  })
  fullReport = false;
}
