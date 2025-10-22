import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateResultsTocResultV2Dto } from '../../../results/results-toc-results/dto/create-results-toc-result-v2.dto';
import { SavePartnersV2Dto } from '../../../results/results_by_institutions/dto/save-partners-v2.dto';

export class UpdateContributorsPartnersDto {
  @ApiPropertyOptional({
    type: () => CreateResultsTocResultV2Dto,
    description: 'Payload to update ToC mapping (P25).',
  })
  toc_mapping?: CreateResultsTocResultV2Dto;

  @ApiPropertyOptional({
    type: () => SavePartnersV2Dto,
    description:
      'Payload to update partners, centers, and bilateral projects (P25).',
  })
  partners?: SavePartnersV2Dto;
}
