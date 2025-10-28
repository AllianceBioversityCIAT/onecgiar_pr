import { ApiProperty } from '@nestjs/swagger';

export class FilterInitiativesDto {
  @ApiProperty({
    description:
      'Role identifier of the requesting user (used for permission scoping / filtering).',
    example: 3,
  })
  rol_user: number;

  @ApiProperty({
    description:
      'Array of initiative IDs to include in the completeness / report scope.',
    example: [12, 18, 27],
    type: [Number],
  })
  initiatives: number[];

  @ApiProperty({
    description:
      'Array of phase identifiers or objects representing reporting phases. Accepts numeric IDs (preferred).',
    example: [1, 2],
    isArray: true,
  })
  phases: any[];
}
