import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  AiReviewEventFieldName,
  AiReviewEventType,
} from '../entities/ai-review-event.entity';

export class CreateEventDto {
  @ApiProperty({
    description: 'ID of the AI review session',
    example: 123,
  })
  @IsInt()
  @IsNotEmpty()
  session_id: number;

  @ApiProperty({
    description: 'ID of the result being reviewed',
    example: 456,
  })
  @IsInt()
  @IsNotEmpty()
  result_id: number;

  @ApiProperty({
    description: 'Type of event being logged',
    enum: AiReviewEventType,
    example: AiReviewEventType.CLICK_REVIEW,
  })
  @IsEnum(AiReviewEventType)
  @IsNotEmpty()
  event_type: AiReviewEventType;

  @ApiProperty({
    description: 'Field name related to the event (optional)',
    enum: AiReviewEventFieldName,
    example: AiReviewEventFieldName.TITLE,
    required: false,
  })
  @IsEnum(AiReviewEventFieldName)
  @IsOptional()
  field_name?: AiReviewEventFieldName;
}
