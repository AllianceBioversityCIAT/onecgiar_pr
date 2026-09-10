import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/**
 * P2-3233 — type change is deliberately a centre-form contract, rather than a
 * reuse of the pooled W1/W2 endpoint. The latter deletes common W3 links.
 */
export class ChangeCenterResultTypeDto {
  @ApiProperty({ example: 3, description: 'Target W3 result level ID.' })
  @IsNumber()
  @IsNotEmpty()
  result_level_id: number;

  @ApiProperty({ example: 2, description: 'Target W3 result type ID.' })
  @IsNumber()
  @IsNotEmpty()
  result_type_id: number;

  @ApiProperty({
    example: 'The promoted draft was classified as the wrong result type.',
    description: 'Audit justification for changing a promoted AI draft.',
  })
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({
    example: '10568/175322',
    description:
      'CGSpace handle. Required when the target type is Knowledge Product.',
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  handle?: string;
}
