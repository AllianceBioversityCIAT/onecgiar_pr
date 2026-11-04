import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * E4 body (design §4.1). Every field is optional (draft saves); `null` clears a stored value.
 * There is no global ValidationPipe (design P-8), so `ImpactLevelService` re-checks every rule
 * and is the actual gate — these decorators document and back it up where a pipe is applied.
 */
export class SaveImpactLevelDto {
  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  impact_study_type_id?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'At most 100 words and 5000 characters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  cgiar_contribution?: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @IsBoolean()
  previously_reported?: boolean | null;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  previous_result_ids?: number[];
}
