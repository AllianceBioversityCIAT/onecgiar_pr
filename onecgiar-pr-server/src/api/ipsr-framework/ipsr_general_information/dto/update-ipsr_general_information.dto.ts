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
  gender_impact_area_id?: number | number[];

  @ApiPropertyOptional({
    description: 'Climate change tag level.',
    example: 1,
  })
  climate_change_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to climate change.',
    example: 3,
  })
  climate_impact_area_id?: number | number[];

  @ApiPropertyOptional({
    description: 'Nutrition tag level.',
    example: 2,
  })
  nutrition_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to nutrition.',
    example: 5,
  })
  nutrition_impact_area_id?: number | number[];

  @ApiPropertyOptional({
    description: 'Environmental & biodiversity tag level.',
    example: 1,
  })
  environmental_biodiversity_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to biodiversity.',
    example: 6,
  })
  environmental_biodiversity_impact_area_id?: number | number[];

  @ApiPropertyOptional({
    description: 'Poverty tag level.',
    example: 3,
  })
  poverty_tag_level_id?: number;

  @ApiPropertyOptional({
    description: 'ID of the impact area related to poverty.',
    example: 2,
  })
  poverty_impact_area_id?: number | number[];

  /**
   * P2-3210 — supporting evidence of each Impact Area tag, one link per tag.
   *
   * The client has always sent these five keys (they come straight back from
   * `GET ipsr-general-information/innovation/:resultId`, which reads them in
   * `ipsr.repository.ts`), but this DTO did not declare them and the service ignored them, so
   * anything typed in the field was silently dropped on save. Declared here and written by
   * `IpsrGeneralInformationService.saveImpactAreaEvidences`.
   *
   * Each one is stored as a row of `evidence` flagged with that tag's own column. Note that the
   * climate evidence is flagged `youth_related`: the column name is inherited from the old form and
   * does not match the label, and `ipsr.repository.ts` reads it back the same way. Not a typo.
   */
  @ApiPropertyOptional({
    description: 'Link to the evidence supporting the gender tag score.',
    example: 'https://cgspace.cgiar.org/handle/10568/000000',
  })
  evidence_gender_tag?: string;

  @ApiPropertyOptional({
    description:
      'Link to the evidence supporting the climate change tag score.',
    example: 'https://cgspace.cgiar.org/handle/10568/000000',
  })
  evidence_climate_tag?: string;

  @ApiPropertyOptional({
    description:
      'Link to the evidence supporting the nutrition, health and food security tag score.',
    example: 'https://cgspace.cgiar.org/handle/10568/000000',
  })
  evidence_nutrition_tag?: string;

  @ApiPropertyOptional({
    description:
      'Link to the evidence supporting the environmental health and biodiversity tag score.',
    example: 'https://cgspace.cgiar.org/handle/10568/000000',
  })
  evidence_environment_tag?: string;

  @ApiPropertyOptional({
    description:
      'Link to the evidence supporting the poverty reduction, livelihoods and jobs tag score.',
    example: 'https://cgspace.cgiar.org/handle/10568/000000',
  })
  evidence_poverty_tag?: string;

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
