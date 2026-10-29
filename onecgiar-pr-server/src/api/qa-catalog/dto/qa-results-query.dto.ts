// @akili-spec quality-assurance/qa-results-feed
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  QA_RESULTS_PAGE_MAX,
  QA_RESULTS_PAGE_SIZE_DEFAULT,
  QA_RESULTS_PAGE_SIZE_MAX,
  QA_RESULTS_PHASE_YEAR_MAX,
  QA_RESULTS_PHASE_YEAR_MIN,
  QA_RESULTS_PROGRAM_ID_MAX,
} from '../qa-results.constants';

/** Only a strictly numeric string is converted; anything else stays as-is so `@IsInt()` rejects it (400). */
const toStrictInt = (value: unknown) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

/** `a,b` or a repeated `?k=a&k=b` -> trimmed non-empty tokens; absent or empty -> `[]` (no filter). */
const toTokens = (value: unknown): string[] | unknown => {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  if (!raw.every((v) => typeof v === 'string')) return value;
  return raw
    .flatMap((v: string) => v.split(','))
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

/**
 * QRF-R-2 / R-4 / R-5. `phase_year` is mandatory and is never derived from the clock or the open
 * phase: there is deliberately no default, so a missing value is a 400. The range only rejects
 * implausible years (400); a plausible year with no catalog is the service's 404.
 */
export class QaResultsQueryDto {
  @ApiProperty({ example: 2026, description: 'Phase year (required)' })
  @Transform(({ value }) => toStrictInt(value))
  @IsInt()
  @Min(QA_RESULTS_PHASE_YEAR_MIN)
  @Max(QA_RESULTS_PHASE_YEAR_MAX)
  phase_year: number;

  @ApiPropertyOptional({
    example: '5,7',
    description:
      'Comma-separated CLARISA program ids; matches the LEAD program only. Absent or empty = no filter',
    type: String,
  })
  @Transform(({ value }) => {
    const tokens = toTokens(value);
    return Array.isArray(tokens) ? tokens.map(toStrictInt) : tokens;
  })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(QA_RESULTS_PROGRAM_ID_MAX, { each: true })
  program_ids: number[] = [];

  @ApiPropertyOptional({
    example: 'policy_change,knowledge_product',
    description:
      'Comma-separated catalog result type keys. An unknown key is a 400. Absent or empty = no filter',
    type: String,
  })
  @Transform(({ value }) => toTokens(value))
  @IsString({ each: true })
  result_type_keys: string[] = [];

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    maximum: QA_RESULTS_PAGE_MAX,
  })
  @IsOptional()
  @Transform(({ value }) => toStrictInt(value))
  @IsInt()
  @Min(1)
  @Max(QA_RESULTS_PAGE_MAX)
  page: number = 1;

  @ApiPropertyOptional({
    example: QA_RESULTS_PAGE_SIZE_DEFAULT,
    default: QA_RESULTS_PAGE_SIZE_DEFAULT,
    minimum: 1,
    maximum: QA_RESULTS_PAGE_SIZE_MAX,
  })
  @IsOptional()
  @Transform(({ value }) => toStrictInt(value))
  @IsInt()
  @Min(1)
  @Max(QA_RESULTS_PAGE_SIZE_MAX)
  page_size: number = QA_RESULTS_PAGE_SIZE_DEFAULT;
}
