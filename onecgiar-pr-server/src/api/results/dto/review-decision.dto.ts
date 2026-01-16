import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export enum ReviewDecisionEnum {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewDecisionDto {
  @ApiProperty({
    description: 'Decision to approve or reject the bilateral result',
    enum: ReviewDecisionEnum,
    example: ReviewDecisionEnum.APPROVE,
  })
  @IsEnum(ReviewDecisionEnum, {
    message: 'Decision must be either APPROVE or REJECT',
  })
  @IsNotEmpty()
  decision: ReviewDecisionEnum;

  @ApiProperty({
    description:
      'Justification for rejection. Required when decision is REJECT',
    example: 'The result does not meet the quality standards',
    required: false,
  })
  @ValidateIf((o) => o.decision === ReviewDecisionEnum.REJECT)
  @IsNotEmpty({ message: 'Justification is required when decision is REJECT' })
  @IsOptional()
  justification?: string;
}
