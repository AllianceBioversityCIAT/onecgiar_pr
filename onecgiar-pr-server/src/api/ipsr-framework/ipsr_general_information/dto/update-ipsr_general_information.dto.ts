import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADUser } from '../../../../auth/services/active-directory.service';

export class UpdateIpsrGeneralInformationDto {
  @ApiPropertyOptional({
    description: 'General title of the IPSR.',
    example: 'Improved drought-resistant seed variety',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'General description of the IPSR.',
    example: 'This IPSR focuses on improving resilience to drought…',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Full name of the main contact person.',
    example: 'Jane Doe',
  })
  lead_contact_person?: string;

  @ApiPropertyOptional({
    description: 'Active Directory user information for the main contact.',
  })
  lead_contact_person_data?: ADUser;

  @ApiPropertyOptional({
    description: 'Gender tag level.',
    example: 2,
  })
  gender_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to gender.',
    example: 4,
  })
  gender_impact_area_id?: number;

  @ApiPropertyOptional({
    description: 'Climate change tag level.',
    example: 1,
  })
  climate_change_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to climate change.',
    example: 3,
  })
  climate_impact_area_id?: number;

  @ApiPropertyOptional({
    description: 'Nutrition tag level.',
    example: 2,
  })
  nutrition_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to nutrition.',
    example: 5,
  })
  nutrition_impact_area_id?: number;

  @ApiPropertyOptional({
    description: 'Environmental & biodiversity tag level.',
    example: 1,
  })
  environmental_biodiversity_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to biodiversity.',
    example: 6,
  })
  environmental_biodiversity_impact_area_id?: number;

  @ApiPropertyOptional({
    description: 'Poverty tag level.',
    example: 3,
  })
  poverty_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to poverty.',
    example: 2,
  })
  poverty_impact_area_id?: number;

  @ApiProperty({
    description: 'Indicates if the IPSR was discontinued.',
    example: false,
  })
  is_discontinued!: boolean;

  @ApiProperty({
    description: 'Selected options in case the IPSR is discontinued.',
    type: [String],
    example: ['Lack of evidence', 'Replaced by new result'],
  })
  discontinued_options!: any[];
}
