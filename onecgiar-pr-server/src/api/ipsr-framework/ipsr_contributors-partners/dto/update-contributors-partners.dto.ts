import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateResultsTocResultV2Dto } from '../../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { ResultsByInstitution } from '../../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultsCenterDto } from '../../../results/results-centers/dto/results-center.dto';
import { BilateralProjectLinkDto } from '../../../results/results_by_institutions/dto/save-partners-v2.dto';
import { CreateResultsTocResultDto } from '../../../results/results-toc-results/dto/create-results-toc-result.dto';

export class UpdateContributorsPartnersDto extends CreateResultsTocResultV2Dto {
  @ApiPropertyOptional({
    description: 'Flag that indicates there are no applicable partners.',
  })
  no_applicable_partner?: boolean;

  @ApiPropertyOptional({
    description: 'Flag that indicates whether the result is lead by a partner.',
  })
  is_lead_by_partner?: boolean;

  @ApiPropertyOptional({
    description:
      'Detailed contributing initiatives payload including accepted and pending arrays.',
    type: () => Object,
  })
  contributing_initiatives?: CreateResultsTocResultDto['contributing_initiatives'];

  @ApiPropertyOptional({
    type: () => [ResultsByInstitution],
    description: 'Partner institutions to associate with the result.',
  })
  institutions?: ResultsByInstitution[];

  @ApiPropertyOptional({
    type: () => [ResultsByInstitution],
    description: 'MQAP institutions predicted for the result.',
  })
  mqap_institutions?: ResultsByInstitution[];

  @ApiPropertyOptional({
    type: () => [ResultsCenterDto],
    description: 'Centers contributing to the result.',
  })
  contributing_center?: ResultsCenterDto[];

  @ApiPropertyOptional({
    type: () => [BilateralProjectLinkDto],
    description: 'Bilateral projects linked to the result.',
  })
  bilateral_projects?: Array<number | string | BilateralProjectLinkDto>;

  @ApiPropertyOptional({
    description:
      'Indicator if innovation result has linked innovations. Applicable for innovation development and innovation use results.',
  })
  has_innovation_link?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Result identifiers linked to the innovation. Only considered when has_innovation_link is true.',
  })
  linked_results?: Array<number | string>;
}
