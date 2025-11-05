import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import {
  AiReviewEventFieldName,
  AiReviewEventType,
} from '../entities/ai-review-event.entity';

export class CreateEventDto {
  @IsInt()
  @IsNotEmpty()
  session_id: number;

  @IsInt()
  @IsNotEmpty()
  result_id: number;

  @IsInt()
  @IsNotEmpty()
  user_id: number;

  @IsEnum(AiReviewEventType)
  @IsNotEmpty()
  event_type: AiReviewEventType;

  @IsEnum(AiReviewEventFieldName)
  @IsOptional()
  field_name?: AiReviewEventFieldName;
}
