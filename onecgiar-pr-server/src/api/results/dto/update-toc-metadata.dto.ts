import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResultTocResultBlockDto } from '../results-toc-results/dto/create-results-toc-result-v2.dto';

export class UpdateTocMetadataDto {
  @ApiProperty({
    type: () => ResultTocResultBlockDto,
    description: 'ToC result block containing ToC mapping information',
    example: {
      planned_result: true,
      initiative_id: 1,
      result_toc_results: [
        {
          result_toc_result_id: 123,
          toc_result_id: 456,
          toc_progressive_narrative: 'Updated narrative',
          toc_level_id: 1,
        },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ResultTocResultBlockDto)
  tocMetadata: ResultTocResultBlockDto;

  @ApiProperty({
    description:
      'Explanation for the update. Required when ToC metadata is modified.',
    example: 'Updated ToC mapping based on reviewer feedback',
  })
  @IsString()
  @IsNotEmpty()
  updateExplanation: string;
}
