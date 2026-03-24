import { ApiProperty } from '@nestjs/swagger';
import { ResultsByInstitution } from '../entities/results_by_institution.entity';
import { ResultsCenterDto } from '../../results-centers/dto/results-center.dto';

export class BilateralProjectLinkDto {
  @ApiProperty({
    description: 'Internal identifier of the bilateral project to link.',
  })
  project_id: number | string;

  @ApiProperty({
    required: false,
    description: 'Optional identifier of the related ToC result.',
  })
  toc_result_id?: number;

  @ApiProperty({
    required: false,
    description: 'Official code of the initiative owning the project.',
  })
  official_code?: string;

  @ApiProperty({
    required: false,
    description: 'Display name of the bilateral project.',
  })
  project_name?: string;

  @ApiProperty({
    required: false,
    description: 'Additional information about the bilateral project.',
  })
  project_summary?: string;
}

export class SavePartnersV2Dto {
  @ApiProperty()
  result_id: number;

  @ApiProperty({
    required: false,
    description: 'Flag that indicates there are no applicable partners.',
  })
  no_applicable_partner?: boolean;

  @ApiProperty({
    required: false,
    description: 'Flag that indicates whether the result is lead by a partner.',
  })
  is_lead_by_partner?: boolean;

  @ApiProperty({
    type: () => [ResultsByInstitution],
    required: false,
    description: 'List of partner institutions to store for the result.',
  })
  institutions?: ResultsByInstitution[];

  @ApiProperty({
    type: () => [ResultsByInstitution],
    required: false,
    description:
      'Optional MQAP institutions payload to update predicted institutions.',
  })
  mqap_institutions?: ResultsByInstitution[];

  @ApiProperty({
    type: () => [ResultsCenterDto],
    required: false,
    description: 'Centers contributing to the result.',
  })
  contributing_center?: ResultsCenterDto[];

  @ApiProperty({
    required: false,
    type: () => [BilateralProjectLinkDto],
    description:
      'List of bilateral projects to link. Each item can be an ID or an object with metadata.',
  })
  bilateral_project?: Array<number | string | BilateralProjectLinkDto>;
}
