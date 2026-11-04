import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

/** Maximum number of drafts one bulk-discard request may carry (`ABD-DD-8`). */
export const BULK_DISCARD_MAX_DRAFTS = 100;

/**
 * Body of `POST center/ai/drafts/discard` (`ABD-R-5`, design.md §6).
 * Duplicates are allowed here and removed by the service before processing.
 */
export class DiscardBilateralAiDraftsDto {
  @ApiProperty({
    type: [Number],
    description: `AI draft ids to discard (1 to ${BULK_DISCARD_MAX_DRAFTS}).`,
    example: [11, 12, 13],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(BULK_DISCARD_MAX_DRAFTS)
  @IsInt({ each: true })
  @Min(1, { each: true })
  draftIds: number[];
}
