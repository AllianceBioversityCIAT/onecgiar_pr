import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AiReviewProposalFieldName } from '../entities/ai-review-proposal.entity';

export class SaveFieldDto {
  @ApiProperty({
    description: 'The field name being saved',
    enum: AiReviewProposalFieldName,
    example: AiReviewProposalFieldName.TITLE,
  })
  @IsEnum(AiReviewProposalFieldName)
  @IsNotEmpty()
  field_name: AiReviewProposalFieldName;

  @ApiProperty({
    description: 'The final text value to save to the result',
    example: 'Improved title text chosen by user',
  })
  @IsString()
  @IsNotEmpty()
  new_value: string;

  @ApiProperty({
    description: 'Reason for the change (optional)',
    example: 'Applied AI suggestion with minor modifications',
    required: false,
  })
  @IsString()
  @IsOptional()
  change_reason?: string;

  @ApiProperty({
    description: 'Whether this change was based on an AI suggestion',
    example: true,
    required: false,
  })
  @IsOptional()
  was_ai_suggested?: boolean;

  @ApiProperty({
    description: 'User feedback on the AI suggestion (optional)',
    example: 'AI suggestion was helpful but needed some adjustments',
    required: false,
  })
  @IsString()
  @IsOptional()
  user_feedback?: string;
}

export class SaveChangesDto {
  @ApiProperty({
    description: 'Array of fields to save with their final values',
    type: [SaveFieldDto],
  })
  @IsNotEmpty()
  fields: SaveFieldDto[];

  @ApiProperty({
    description: 'ID of the user making the changes',
    example: 456,
  })
  @IsInt()
  @IsNotEmpty()
  user_id: number;
}
