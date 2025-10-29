import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateResultDto } from '../../results/dto/create-result.dto';
import { ResultsKnowledgeProductDto } from '../../results/results-knowledge-products/dto/results-knowledge-product.dto';
import { ContributorResultTocResult } from '../../results/results-toc-results/dto/create-results-toc-result.dto';

export class ResultsFrameworkTocIndicatorDto {
  @ApiProperty({
    description:
      'Identifier of the ToC indicator (Integration DB primary key).',
  })
  indicator_id: number | string;

  @ApiPropertyOptional({
    description: 'Description of the ToC indicator.',
  })
  indicator_description?: string;

  @ApiPropertyOptional({
    description: 'Identifier of the ToC result indicator node.',
  })
  toc_result_indicator_id?: string;

  @ApiPropertyOptional({
    description: 'Related node identifier within the ToC structure.',
  })
  related_node_id?: string;

  @ApiPropertyOptional({
    description: 'Measurement unit associated with the indicator.',
  })
  unit_messurament?: string;

  @ApiPropertyOptional({
    description: 'Value describing the indicator type.',
  })
  type_value?: string;

  @ApiPropertyOptional({
    description: 'Name describing the indicator type.',
  })
  type_name?: string;

  @ApiPropertyOptional({
    description: 'Geographic location associated with the indicator.',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Aggregated target value for the indicator.',
  })
  target_value_sum?: string;

  @ApiPropertyOptional({
    description: 'Aggregated achieved value for the indicator.',
  })
  actual_achieved_value_sum?: string;

  @ApiPropertyOptional({
    description: 'Progress percentage for the indicator.',
  })
  progress_percentage?: string;

  @ApiPropertyOptional({
    description: 'Result level identifier resolved for the indicator.',
  })
  result_level_id?: number;

  @ApiPropertyOptional({
    description: 'Result type identifier resolved for the indicator.',
  })
  result_type_id?: number;

  @ApiPropertyOptional({
    description: 'Target number associated with this indicator.',
  })
  number_target?: string | number | null;

  @ApiPropertyOptional({
    description: 'Target date associated with this indicator.',
  })
  target_date?: string | null;

  @ApiPropertyOptional({
    description: 'Contribution value tied to this indicator target.',
  })
  contributing_indicator?: number | null;
}

export class ResultsFrameworkBilateralProjectDto {
  @ApiProperty({
    description: 'Identifier of the ToC result related to the project.',
    required: false,
  })
  toc_result_id?: number;

  @ApiProperty({
    description: 'Official code of the program/portfolio owning the project.',
    required: false,
  })
  official_code?: string;

  @ApiProperty({ description: 'Internal identifier of the bilateral project.' })
  project_id: number | string;

  @ApiProperty({
    description: 'Name of the bilateral project.',
    required: false,
  })
  project_name?: string;

  @ApiProperty({
    description: 'Summary or description of the bilateral project.',
    required: false,
  })
  project_summary?: string;
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
    type: () => ResultsFrameworkTocIndicatorDto,
    description:
      'ToC indicator payload (from the Integration catalogue). Accepts a single object or an array of objects.',
  })
  indicators?:
    | ResultsFrameworkTocIndicatorDto
    | ResultsFrameworkTocIndicatorDto[];

  @ApiProperty({
    description:
      'Identifier of the ToC result indicator (ToC results indicators table primary key).',
    required: false,
  })
  contributing_indicator?: number;

  @ApiProperty({
    description: 'Target number associated with the indicator.',
    required: false,
  })
  number_target?: string | number | null;

  @ApiProperty({
    description: 'Target date associated with the indicator.',
    required: false,
  })
  target_date?: string | null;

  @ApiProperty({
    required: false,
    type: () => [ContributorResultTocResult],
    description:
      'Contributing initiatives to associate with the result for the ToC linkage.',
  })
  contributors_result_toc_result?: ContributorResultTocResult[];

  @ApiProperty({
    required: false,
    type: () => [ResultsFrameworkBilateralProjectDto],
    description:
      'List of bilateral projects linked to the result. If provided, supersedes bilateral_project.',
  })
  bilateral_project?: ResultsFrameworkBilateralProjectDto[];
}
