import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Body for `POST /api/bilateral/center/handoff` (`design.md` §4.1, `BIL-HO-T-5`).
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-5, requirements.md §6 R-2, R-5, R-30)
 */
export class HandoffStartDto {
  @ApiProperty({
    description:
      'CLARISA centre code the caller wants a handoff for (`OQ-3`: the code, not the acronym).',
    example: 'CENTER-05',
    maxLength: 45,
  })
  @IsString()
  @MaxLength(45)
  @Matches(/^CENTER-\d+$/, {
    message: 'center_code must match the CENTER-<digits> format',
  })
  center_code: string;

  @ApiPropertyOptional({
    description:
      'Partner audience to mint the code for. Omit to use the environment default; only ' +
      'configured audiences are accepted (R-30).',
    example: 'w3-bilateral-uploader:test',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9:_.-]+$/, {
    message: 'audience contains unsupported characters',
  })
  audience?: string;
}
