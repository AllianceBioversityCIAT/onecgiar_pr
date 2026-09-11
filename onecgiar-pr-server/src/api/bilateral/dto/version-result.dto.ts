import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class VersionResultDto {
  @ApiProperty({
    description:
      'The PRMS result code of the approved result to carry into the current phase. The code is stable across phases; PRMS resolves which version of it to continue. This is the identifier producers already see in the reporting tool — the internal per-version id is never part of this contract.',
    example: '28565',
  })
  @IsString()
  @IsNotEmpty()
  result_code: string;

  @ApiPropertyOptional({
    description:
      'Your own identifier for this result, echoed back verbatim in the response so you can match it to your record. Optional, and independent of any `external_reference` already stored on the result.',
    example: 'STAR-9f2c-4471',
    maxLength: 191,
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  external_reference?: string;
}
