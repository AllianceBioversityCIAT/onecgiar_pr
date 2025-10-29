import { ApiProperty } from '@nestjs/swagger';

export class BulkKpDto {
  @ApiProperty({
    description:
      'Array of knowledge product result codes to be synchronized in bulk operation.',
    example: [100234, 100235, 100240],
    type: [Number],
  })
  results_code!: number[];
}
