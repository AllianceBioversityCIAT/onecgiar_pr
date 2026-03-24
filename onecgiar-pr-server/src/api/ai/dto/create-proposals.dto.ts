import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AiReviewProposalFieldName } from '../entities/ai-review-proposal.entity';

export class CreateProposalDto {
  @ApiProperty({
    description: 'The field name this proposal is for',
    enum: AiReviewProposalFieldName,
    example: AiReviewProposalFieldName.TITLE,
  })
  @IsEnum(AiReviewProposalFieldName)
  @IsNotEmpty()
  field_name: AiReviewProposalFieldName;

  @ApiProperty({
    description: 'The original text from the result field',
    example: 'Original title text',
    required: false,
  })
  @IsString()
  @IsOptional()
  original_text?: string;

  @ApiProperty({
    description: 'The improved text proposed by AI',
    example: 'Improved title text with better clarity',
    required: false,
  })
  @IsString()
  @IsOptional()
  proposed_text?: string;

  @ApiProperty({
    description: 'Whether the AI determined this field needs improvement',
    example: true,
    required: false,
  })
  @IsOptional()
  needs_improvement?: boolean;
}

export class CreateProposalsDto {
  @ApiProperty({
    description: 'Array of AI-generated proposals for different fields',
    type: [CreateProposalDto],
  })
  @IsNotEmpty()
  proposals: CreateProposalDto[];
}
