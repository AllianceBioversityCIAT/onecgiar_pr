import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ResultFieldRevisionFieldName } from '../../ai/entities/result-field-revision.entity';

/**
 * Body for `POST /api/bilateral/center/quality-assessment/:resultId/field-revisions`
 * (design.md §4 API Surface, `BIL-QTS-R-13`, `BIL-QTS-DD-9`).
 *
 * Deliberately declares no `provenance` property — the server decides it
 * (`trim(new_value) === the assessment's kept suggestion for the field`), so nothing the
 * client sends here can force `AI_SUGGESTED` for text the AI never suggested. Any extra
 * property the client sends (a forged `provenance`, for instance) is stripped by this
 * route's `ValidationPipe({ whitelist: true })` before the handler ever sees it, and even
 * if it were not, the service never reads a property outside the three declared below.
 */
export class CreateBilateralFieldRevisionDto {
  @ApiProperty({
    enum: [
      ResultFieldRevisionFieldName.TITLE,
      ResultFieldRevisionFieldName.DESCRIPTION,
    ],
    description: 'The general-information field this drawer save wrote.',
  })
  @IsIn([
    ResultFieldRevisionFieldName.TITLE,
    ResultFieldRevisionFieldName.DESCRIPTION,
  ])
  field:
    | ResultFieldRevisionFieldName.TITLE
    | ResultFieldRevisionFieldName.DESCRIPTION;

  @ApiProperty({ description: 'Stored bilateral quality-assessment id.' })
  @IsInt()
  @IsNotEmpty()
  assessment_id: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "The field's value before this save, for the audit row.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  old_value: string | null;
}
