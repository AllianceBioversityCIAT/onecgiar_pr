// @akili-spec quality-assurance/qa-field-catalog
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt } from 'class-validator';

/**
 * QAC-R-9: `phase_year` is required and must be an integer. Only a strictly numeric string is
 * converted; anything else (`abc`, `''`, `2026.5`) is left as-is so `@IsInt()` rejects it with 400
 * (a plain `Number('')` would silently become 0).
 */
export class QaCatalogQueryDto {
  @ApiProperty({ example: 2026, description: 'Phase year to describe' })
  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  phase_year: number;
}
