import { ApiProperty } from '@nestjs/swagger';
import { CreateResultDto } from '../../results/dto/create-result.dto';
import { ResultsKnowledgeProductDto } from '../../results/results-knowledge-products/dto/results-knowledge-product.dto';
import { ContributorResultTocResult } from '../../results/results-toc-results/dto/create-results-toc-result.dto';

export class ResultsFrameworkTocIndicatorDto {
  @ApiProperty({
    description:
      'Identifier of the ToC indicator (Integration DB primary key).',
  })
  toc_result_indicator_id: number;
}

export class CreateResultsFrameworkResultDto {
  @ApiProperty({ type: () => CreateResultDto })
  result: CreateResultDto;

  @ApiProperty({
    required: false,
    type: () => ResultsKnowledgeProductDto,
    description:
      'Knowledge product payload required when the result type corresponds to knowledge products.',
  })
  knowledge_product?: ResultsKnowledgeProductDto;

  @ApiProperty({
    required: false,
    description:
      'Identifier of the ToC result to link the newly created result against.',
  })
  toc_result_id?: number;

  @ApiProperty({
    required: false,
    description:
      'Optional progressive narrative to store alongside the ToC link.',
  })
  toc_progressive_narrative?: string;

  @ApiProperty({
    required: false,
    type: () => [ResultsFrameworkTocIndicatorDto],
    description:
      'List of ToC indicators (from the Integration catalogue) that the result contributes to.',
  })
  toc_results?: ResultsFrameworkTocIndicatorDto[];

  @ApiProperty({
    required: false,
    type: () => [ContributorResultTocResult],
    description:
      'Contributing initiatives to associate with the result for the ToC linkage.',
  })
  contributors_result_toc_result?: ContributorResultTocResult[];
}
