import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  ValidateIf,
  IsUrl,
  IsIn,
  IsObject,
  IsBoolean,
  IsDefined,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/* -------------------------------------------------------------------------- */
/*                               SUB-OBJECTS                                   */
/* -------------------------------------------------------------------------- */

export class SubmittedByDto {
  @ApiProperty({
    description: 'Email of the person who submitted the bilateral record',
    example: 'jane.doe@cgiar.org',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Name of the person who submitted the bilateral record',
    example: 'Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'ISO date string representing when the bilateral was submitted',
    example: '2025-09-30',
  })
  @IsDateString()
  @IsNotEmpty()
  submitted_date: string;

  @ApiPropertyOptional({
    description: 'Optional comment from the submitter',
    example: 'Pending partner confirmation',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreatedByDto {
  @ApiProperty({
    description: 'Email of the person who created the bilateral entry',
    example: 'john.smith@cgiar.org',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Name of the creator of the bilateral entry',
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class TocMappingDto {
  @ApiProperty({
    description:
      'Official code of the science program related to the bilateral',
    example: 'CLIMATE',
  })
  @IsString()
  @IsNotEmpty()
  science_program_id: string;

  @ApiProperty({
    description: 'Composite code of the area of work (program-area)',
    example: 'CLIMATE-AGROECOLOGICAL',
  })
  @IsString()
  aow_compose_code: string;

  @ApiProperty({
    description: 'Title of the Theory of Change result',
    example: 'Climate-resilient crop systems adopted',
  })
  @IsString()
  result_title: string;

  @ApiProperty({
    description: 'Indicator description linked to the ToC result',
    example: 'Number of climate resilient practices documented',
  })
  @IsString()
  result_indicator_description: string;

  @ApiProperty({
    description: 'Type name of the indicator (e.g. Output, Outcome)',
    example: 'Output',
  })
  @IsString()
  result_indicator_type_name: string;
}

export class RegionDto {
  @ApiPropertyOptional({
    description: 'UN M49 numeric code of the region',
    example: 150,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  um49code?: number;

  @ApiPropertyOptional({
    description: 'Human readable region name',
    example: 'Europe',
  })
  @ValidateIf((o) => !o.um49code)
  @IsString()
  name?: string;
}

/**
 * DTO para país
 */
export class CountryDto {
  @ApiPropertyOptional({
    description: 'Internal country identifier (if available)',
    example: 32,
  })
  @ValidateIf((o) => !o.name && !o.iso_alpha_3 && !o.iso_alpha_2)
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Country name', example: 'Argentina' })
  @ValidateIf((o) => !o.id && !o.iso_alpha_3 && !o.iso_alpha_2)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Three-letter ISO alpha-3 code',
    example: 'ARG',
  })
  @ValidateIf((o) => !o.id && !o.name && !o.iso_alpha_2)
  @IsString()
  iso_alpha_3?: string;

  @ApiPropertyOptional({
    description: 'Two-letter ISO alpha-2 code',
    example: 'AR',
  })
  @ValidateIf((o) => !o.id && !o.name && !o.iso_alpha_3)
  @IsString()
  iso_alpha_2?: string;
}

/**
 * DTO para área subnacional
 */
export class SubnationalAreaDto {
  @ApiPropertyOptional({
    description: 'Internal identifier for the subnational area',
    example: 101,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Name of the subnational area',
    example: 'Antioquia',
  })
  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;
}

export class PeopleTrainedBreakdownDto {
  @ApiProperty({
    description: 'Number of women that attended the training',
    example: 150,
  })
  @IsNumber()
  @Min(0)
  women: number;

  @ApiProperty({
    description: 'Number of men that attended the training',
    example: 120,
  })
  @IsNumber()
  @Min(0)
  men: number;

  @ApiPropertyOptional({
    description: 'Number of non-binary people that attended the training',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  non_binary?: number;

  @ApiPropertyOptional({
    description: 'Number of attendees whose gender was not disclosed',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unknown?: number;
}

export class CapacitySharingDto {
  @ApiProperty({
    description: 'Breakdown of trained people by gender',
    type: () => PeopleTrainedBreakdownDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => PeopleTrainedBreakdownDto)
  number_people_trained: PeopleTrainedBreakdownDto;

  @ApiProperty({
    description: 'Length of the training session',
    enum: ['Short-term', 'Long-term', 'Master', 'PhD'],
    example: 'Short-term',
  })
  @IsString()
  length_training: string;

  @ApiProperty({
    description: 'Delivery method used to provide the training',
    enum: ['Virtual / Online', 'In person', 'Blended (in-person and virtual)'],
    example: 'In person',
  })
  @IsString()
  delivery_method: string;
}

export class InnovationTypologyDto {
  @ApiPropertyOptional({
    description: 'Numeric code identifying the innovation typology (12-15)',
    example: 12,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  @IsIn([12, 13, 14, 15])
  code?: number;

  @ApiPropertyOptional({
    description: 'Human readable typology name',
    example: 'Technological innovation',
  })
  @ValidateIf((o) => !o.code)
  @IsString()
  name?: string;
}

export class InnovationReadinessLevelDto {
  @ApiPropertyOptional({
    description:
      'Numeric level of innovation readiness (e.g., 0-9). Either level or name must be provided.',
    example: 3,
  })
  @ValidateIf((o) => o.level !== undefined && o.level !== null)
  @IsNumber()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({
    description:
      'Human readable readiness level name. Either level or name must be provided.',
    example: 'Proven under field conditions',
  })
  @ValidateIf((o) => o.name !== undefined && o.name !== null)
  @IsString()
  name?: string;
}

export class InnovationDevelopmentDetailsDto {
  @ApiProperty({
    description:
      'Typology information for the innovation (code or name must be provided).',
    type: () => InnovationTypologyDto,
  })
  @ValidateNested()
  @Type(() => InnovationTypologyDto)
  innovation_typology: InnovationTypologyDto;

  @ApiProperty({
    description: 'Comma separated list (or text) of innovation developers',
    example: 'John Doe; Marie Curie; Nikola Tesla',
  })
  @IsString()
  @IsNotEmpty()
  innovation_developers: string;

  @ApiProperty({
    description:
      'Readiness level information for the innovation (level or name must be provided).',
    type: () => InnovationReadinessLevelDto,
  })
  @ValidateNested()
  @Type(() => InnovationReadinessLevelDto)
  innovation_readiness_level: InnovationReadinessLevelDto;
}

export class InnovationUseActorDto {
  @ApiPropertyOptional({
    description: 'Actor result ID',
    example: 123,
  })
  @IsOptional()
  result_actors_id?: string | number;

  @ApiPropertyOptional({
    description: 'Actor type identifier',
    example: 1,
  })
  @ValidateIf((o) => !o.actor_type_name)
  actor_type_id?: string | number;

  @ApiPropertyOptional({
    description: 'Actor type name',
    example: 'Farmers',
  })
  @ValidateIf((o) => !o.actor_type_id)
  @IsString()
  actor_type_name?: string;

  @ApiPropertyOptional({
    description:
      'Other actor type description (required if actor_type_id is 5)',
    example: 'Custom actor type',
  })
  @ValidateIf((o) => o.actor_type_id === 5 || o.actor_type_id === '5')
  @IsString()
  other_actor_type?: string | null;

  @ApiPropertyOptional({
    description: 'Whether sex and age disaggregation is provided',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  sex_and_age_disaggregation?: boolean | null;

  @ApiPropertyOptional({
    description:
      'Total number of actors (required if sex_and_age_disaggregation is true)',
    example: 1000,
  })
  @ValidateIf((o) => o.sex_and_age_disaggregation === true)
  how_many?: string | number | null;

  @ApiPropertyOptional({
    description: 'Number of women',
    example: 400,
  })
  @IsOptional()
  women?: string | number | null;

  @ApiPropertyOptional({
    description: 'Number of women youth',
    example: 100,
  })
  @IsOptional()
  women_youth?: string | number | null;

  @ApiPropertyOptional({
    description: 'Number of men',
    example: 450,
  })
  @IsOptional()
  men?: string | number | null;

  @ApiPropertyOptional({
    description: 'Number of men youth',
    example: 50,
  })
  @IsOptional()
  men_youth?: string | number | null;

  @ApiPropertyOptional({
    description: 'Previous number of women',
    example: 350,
  })
  @IsOptional()
  previousWomen?: string | number | null;
}

export class InnovationUseOrganizationDto {
  @ApiPropertyOptional({
    description: 'Institution type identifier',
    example: 3,
  })
  @ValidateIf((o) => !o.institution_types_name)
  institution_types_id?: string | number;

  @ApiPropertyOptional({
    description: 'Institution type name',
    example: 'Research Organization',
  })
  @ValidateIf((o) => !o.institution_types_id)
  @IsString()
  institution_types_name?: string;

  @ApiPropertyOptional({
    description: 'Institution sub-type identifier',
    example: 10,
  })
  @IsOptional()
  institution_sub_type_id?: string | number | null;

  @ApiPropertyOptional({
    description: 'Institution sub-type name',
    example: 'University',
  })
  @IsOptional()
  @IsString()
  institution_sub_type_name?: string;

  @ApiPropertyOptional({
    description:
      'Other institution description (required if institution_types_id is 78)',
    example: 'Custom institution type',
  })
  @ValidateIf(
    (o) => o.institution_types_id === 78 || o.institution_types_id === '78',
  )
  @IsString()
  other_institution?: string | null;

  @ApiPropertyOptional({
    description: 'Number of organizations',
    example: 5,
  })
  @IsOptional()
  how_many?: string | number | null;

  @ApiPropertyOptional({
    description: 'Whether to hide this organization',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hide?: boolean;
}

export class InnovationUseMeasureDto {
  @ApiProperty({
    description: 'Unit of measure',
    example: 'hectares',
  })
  @IsString()
  @IsNotEmpty()
  unit_of_measure: string;

  @ApiPropertyOptional({
    description: 'Quantity measured',
    example: 5000,
  })
  @IsOptional()
  quantity?: string | number;
}

export class CurrentInnovationUseNumbersDto {
  @ApiProperty({
    description: 'If true, no actors data is required',
    example: false,
  })
  @IsBoolean()
  @IsDefined()
  innov_use_to_be_determined: boolean;

  @ApiPropertyOptional({
    description:
      'List of actors (required if innov_use_to_be_determined is false)',
    type: [InnovationUseActorDto],
  })
  @ValidateIf((o) => o.innov_use_to_be_determined === false)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseActorDto)
  actors?: InnovationUseActorDto[];

  @ApiPropertyOptional({
    description: 'List of organizations',
    type: [InnovationUseOrganizationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseOrganizationDto)
  organization?: InnovationUseOrganizationDto[];

  @ApiPropertyOptional({
    description: 'List of measures',
    type: [InnovationUseMeasureDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseMeasureDto)
  measures?: InnovationUseMeasureDto[];
}

export class InnovationUseLevelDto {
  @ApiPropertyOptional({
    description: 'Numeric level of innovation use',
    example: 2,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: 'Human readable use level name',
    example: 'Proven under field conditions',
  })
  @ValidateIf((o) => !o.level)
  @IsString()
  name?: string;
}

export class InnovationUseDetailsDto {
  @ApiProperty({
    description: 'Current innovation use numbers',
    type: () => CurrentInnovationUseNumbersDto,
  })
  @ValidateNested()
  @Type(() => CurrentInnovationUseNumbersDto)
  current_innovation_use_numbers: CurrentInnovationUseNumbersDto;

  @ApiPropertyOptional({
    description: 'Innovation use level (level or name must be provided)',
    type: () => InnovationUseLevelDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InnovationUseLevelDto)
  innovation_use_level?: InnovationUseLevelDto;
}

export class PolicyStatusAmountDto {
  @ApiPropertyOptional({
    description: 'Status amount identifier',
    example: 1,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Status amount name',
    example: 'Funded',
  })
  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;
}

export class PolicyTypeDto {
  @ApiPropertyOptional({
    description: 'Policy type identifier',
    example: 1,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Policy type name',
    example: 'Funding instrument',
  })
  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Status amount (required if policy type id is 1)',
    type: () => PolicyStatusAmountDto,
  })
  @ValidateIf((o) => o.id === 1)
  @ValidateNested()
  @Type(() => PolicyStatusAmountDto)
  status_amount?: PolicyStatusAmountDto;

  @ApiPropertyOptional({
    description: 'Amount value (required if policy type id is 1)',
    example: 500000,
  })
  @ValidateIf((o) => o.id === 1)
  @IsNumber()
  amount?: number;
}

export class PolicyStageDto {
  @ApiPropertyOptional({
    description: 'Policy stage identifier',
    example: 2,
  })
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Policy stage name',
    example: 'Formulation',
  })
  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;
}

export class PolicyImplementingOrganizationDto {
  @ApiPropertyOptional({
    description: 'Institution identifier',
    example: 123,
  })
  @ValidateIf((o) => !o.institutions_acronym && !o.institutions_name)
  @IsNumber()
  institutions_id?: number;

  @ApiPropertyOptional({
    description: 'Institution acronym',
    example: 'CIAT',
  })
  @ValidateIf((o) => !o.institutions_id && !o.institutions_name)
  @IsString()
  institutions_acronym?: string;

  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'International Center for Tropical Agriculture',
  })
  @ValidateIf((o) => !o.institutions_id && !o.institutions_acronym)
  @IsString()
  institutions_name?: string;
}

export class PolicyChangeDetailsDto {
  @ApiProperty({
    description: 'Policy type information',
    type: () => PolicyTypeDto,
  })
  @ValidateNested()
  @Type(() => PolicyTypeDto)
  policy_type: PolicyTypeDto;

  @ApiProperty({
    description: 'Policy stage information',
    type: () => PolicyStageDto,
  })
  @ValidateNested()
  @Type(() => PolicyStageDto)
  policy_stage: PolicyStageDto;

  @ApiProperty({
    description: 'List of implementing organizations (at least one required)',
    type: [PolicyImplementingOrganizationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PolicyImplementingOrganizationDto)
  implementing_organization: PolicyImplementingOrganizationDto[];
}

/**
 * DTO principal: GeoFocus
 */
export class GeoFocusDto {
  // --- Scope ---
  @ApiPropertyOptional({
    description: 'Numeric code for the geographic scope.',
    enum: [1, 2, 4, 5, 50],
    example: 2,
  })
  @ValidateIf((o) => !o.scope_label)
  @IsNumber()
  @IsIn([1, 2, 4, 5, 50])
  scope_code?: number;

  @ApiPropertyOptional({
    description: 'Label for the geographic scope.',
    enum: [
      'Global',
      'Regional',
      'National',
      'Sub-national',
      'This is yet to be determined',
    ],
    example: 'Regional',
  })
  @ValidateIf((o) => !o.scope_code)
  @IsString()
  @IsIn([
    'Global',
    'Regional',
    'National',
    'Sub-national',
    'This is yet to be determined',
  ])
  scope_label?: string;

  // --- Regions ---
  @ApiPropertyOptional({
    description: 'Regions included when scope is Regional.',
    type: [RegionDto],
  })
  @ValidateIf((o) => o.scope_code === 2 || o.scope_label === 'Regional')
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegionDto)
  regions?: RegionDto[];

  // --- Countries ---
  @ApiPropertyOptional({
    description: 'Countries included when scope is National or Sub-national.',
    type: [CountryDto],
  })
  @ValidateIf(
    (o) =>
      o.scope_code === 4 ||
      o.scope_label === 'National' ||
      o.scope_code === 5 ||
      o.scope_label === 'Sub-national',
  )
  @IsArray()
  @ArrayMinSize(1, {
    message:
      'countries debe tener al menos un elemento cuando el alcance es National o Sub-national',
  })
  @ValidateNested({ each: true })
  @Type(() => CountryDto)
  countries?: CountryDto[];

  // --- Subnational areas ---
  @ApiPropertyOptional({
    description: 'Subnational areas included when scope is Sub-national.',
    type: [SubnationalAreaDto],
  })
  @ValidateIf((o) => o.scope_code === 5 || o.scope_label === 'Sub-national')
  @IsArray()
  @ArrayMinSize(1, {
    message:
      'subnational_areas debe tener al menos un elemento cuando el alcance es Sub-national',
  })
  @ValidateNested({ each: true })
  @Type(() => SubnationalAreaDto)
  subnational_areas?: SubnationalAreaDto[];
}

export class InstitutionDto {
  @ApiPropertyOptional({
    description: 'Internal institution identifier',
    example: 501,
  })
  @ValidateIf((o) => !o.acronym && !o.name)
  @IsNumber()
  institution_id?: number;

  @ApiPropertyOptional({ description: 'Institution acronym', example: 'CIAT' })
  @ValidateIf((o) => !o.institution_id && !o.name)
  @IsString()
  acronym?: string;

  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Alliance Bioversity - CIAT',
  })
  @ValidateIf((o) => !o.institution_id && !o.acronym)
  @IsString()
  name?: string;
}

export class EvidenceDto {
  @ApiProperty({
    description: 'URL linking to supporting evidence for the bilateral',
    example: 'https://doi.org/10.1234/abcd.2025.01',
  })
  @IsUrl()
  @IsNotEmpty()
  link: string;

  @ApiProperty({
    description: 'Short description of the evidence',
    example: 'Peer-reviewed article documenting outcomes',
  })
  @IsString()
  description: string;
}

export class BilateralProjectDto {
  @ApiProperty({
    description: 'Title of the contributing bilateral project grant',
    example: 'Scaling climate-smart beans in Andean regions',
  })
  @IsString()
  @IsNotEmpty()
  grant_title: string;
}

export class MetadataCGDto {
  @ApiProperty({
    description:
      'Source system or repository where the knowledge product is indexed',
    example: 'CGSpace',
  })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({
    description: 'Whether the knowledge product is openly accessible',
    example: true,
  })
  @IsBoolean()
  @IsDefined()
  accessibility: boolean;

  @ApiProperty({
    description: 'Indicates if the product is indexed in ISI',
    example: false,
  })
  @IsBoolean()
  @IsDefined()
  is_isi: boolean;

  @ApiProperty({
    description: 'Indicates if the product is peer reviewed',
    example: true,
  })
  @IsBoolean()
  @IsDefined()
  is_peer_reviewed: boolean;

  @ApiProperty({ description: 'Year of publication or issue', example: 2025 })
  @IsNumber()
  @IsDefined()
  issue_year: number;
}

export class KnowledgeProductDto {
  @ApiProperty({
    description:
      'Handle or identifier of the knowledge product in the source repository',
    example: '10568/135621',
  })
  @IsString()
  @IsNotEmpty()
  handle: string;

  @ApiProperty({
    description: 'Type or category of the knowledge product',
    example: 'Journal Article',
  })
  @IsString()
  @IsNotEmpty()
  knowledge_product_type: string;

  @ApiProperty({
    description: 'Metadata information from CGSpace or related source',
    type: () => MetadataCGDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MetadataCGDto)
  metadataCG: MetadataCGDto;

  @ApiProperty({
    description: 'Licence under which the knowledge product is distributed',
    example: 'CC-BY-4.0',
  })
  @IsString()
  @IsNotEmpty()
  licence: string;
}

export class LeadCenterDto {
  @ApiPropertyOptional({
    description: 'Lead center name',
    example: 'Alliance Bioversity - CIAT',
  })
  @ValidateIf((o) => !o.acronym && !o.institution_id)
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Lead center acronym', example: 'CIAT' })
  @ValidateIf((o) => !o.name && !o.institution_id)
  @IsString()
  acronym?: string;

  @ApiPropertyOptional({
    description: 'Clarisa institution id for the lead center',
    example: 501,
  })
  @ValidateIf((o) => !o.name && !o.acronym)
  @IsNumber()
  institution_id?: number;
}

/* -------------------------------------------------------------------------- */
/*                               MAIN DTO                                     */
/* -------------------------------------------------------------------------- */

export class CreateBilateralDto {
  @ApiProperty({
    description: 'Result type identifier for the bilateral',
    example: 6,
  })
  @IsInt()
  @IsNotEmpty()
  result_type_id: number;

  @ApiProperty({
    description: 'Result level identifier for the bilateral',
    example: 4,
  })
  @IsInt()
  @IsNotEmpty()
  result_level_id: number;

  @ApiProperty({
    description:
      'ISO date string representing when the bilateral record was created',
    example: '2025-09-15',
  })
  @IsString()
  @IsNotEmpty()
  created_date: string;

  @ApiProperty({
    description: 'Information about the submitter of the bilateral',
    type: () => SubmittedByDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SubmittedByDto)
  submitted_by: SubmittedByDto;

  @ApiProperty({
    description: 'Information about the creator of the bilateral',
    type: () => CreatedByDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CreatedByDto)
  created_by: CreatedByDto;

  @ApiProperty({
    description:
      'Lead center responsible for the bilateral project (at least one of name, acronym, institution_id)',
    type: () => LeadCenterDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LeadCenterDto)
  lead_center: LeadCenterDto;

  @ApiProperty({
    description: 'Title of the bilateral project',
    example: 'Sustainable intensification of Andean bean systems',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the bilateral project',
    example:
      'This project aims to scale climate resilient bean varieties across Andean regions.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description:
      'Mapping information linking the bilateral to Theory of Change elements',
    type: () => TocMappingDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TocMappingDto)
  toc_mapping: TocMappingDto;

  @ApiProperty({
    description: 'Geographic focus definition for the bilateral',
    type: () => GeoFocusDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GeoFocusDto)
  geo_focus: GeoFocusDto;

  @ApiProperty({
    description: 'List of contributing CGIAR centers',
    type: [InstitutionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  contributing_center: InstitutionDto[];

  @ApiProperty({
    description: 'List of contributing partner institutions',
    type: [InstitutionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  contributing_partners: InstitutionDto[];

  @ApiProperty({
    description: 'Evidence references supporting the bilateral project',
    type: [EvidenceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence: EvidenceDto[];

  @ApiProperty({
    description: 'List of contributing bilateral project grants',
    type: [BilateralProjectDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BilateralProjectDto)
  contributing_bilateral_projects: BilateralProjectDto[];

  @ApiPropertyOptional({
    description:
      'Knowledge product associated with the bilateral project (required only for KNOWLEDGE_PRODUCT results)',
    type: () => KnowledgeProductDto,
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT)
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => KnowledgeProductDto)
  knowledge_product?: KnowledgeProductDto;

  @ApiPropertyOptional({
    description:
      'Capacity sharing metadata (required when result_type_id is CAPACITY_CHANGE)',
    type: () => CapacitySharingDto,
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.CAPACITY_CHANGE)
  @IsDefined()
  @ValidateNested()
  @Type(() => CapacitySharingDto)
  capacity_sharing?: CapacitySharingDto;

  @ApiPropertyOptional({
    description:
      'Innovation development metadata (required when result_type_id is INNOVATION_DEVELOPMENT)',
    type: () => InnovationDevelopmentDetailsDto,
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.INNOVATION_DEVELOPMENT)
  @IsDefined()
  @ValidateNested()
  @Type(() => InnovationDevelopmentDetailsDto)
  innovation_development?: InnovationDevelopmentDetailsDto;

  @ApiPropertyOptional({
    description:
      'Innovation use metadata (required when result_type_id is INNOVATION_USE)',
    type: () => InnovationUseDetailsDto,
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.INNOVATION_USE)
  @IsDefined()
  @ValidateNested()
  @Type(() => InnovationUseDetailsDto)
  innovation_use?: InnovationUseDetailsDto;

  @ApiPropertyOptional({
    description:
      'Policy change metadata (required when result_type_id is POLICY_CHANGE)',
    type: () => PolicyChangeDetailsDto,
  })
  @ValidateIf((o) => o.result_type_id === ResultTypeEnum.POLICY_CHANGE)
  @IsDefined()
  @ValidateNested()
  @Type(() => PolicyChangeDetailsDto)
  policy_change?: PolicyChangeDetailsDto;
}

export class ResultBilateralDto {
  @ApiProperty({
    description: 'Result record type identifier',
    example: 'BILATERAL',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Payload containing the bilateral project details',
    type: () => CreateBilateralDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateBilateralDto)
  data: CreateBilateralDto;
}

export class RootResultsDto {
  @ApiPropertyOptional({
    description:
      'Single bilateral result record to be processed when sending one item at a time',
    type: () => ResultBilateralDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResultBilateralDto)
  result?: ResultBilateralDto;

  @ApiPropertyOptional({
    description:
      'Collection of bilateral result records to be processed in bulk mode',
    type: [ResultBilateralDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResultBilateralDto)
  results?: ResultBilateralDto[];

  @ApiPropertyOptional({
    description:
      'Event type identifier when receiving single payloads directly from external systems.',
    example: 'knowledge_product',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description:
      'Timestamp indicating when the upstream system delivered the payload.',
    example: '2025-10-21T15:38:58.642Z',
  })
  @IsOptional()
  @IsDateString()
  received_at?: string;

  @ApiPropertyOptional({
    description: 'Unique idempotency key provided by the upstream source.',
    example: 'b4e66fb305296fe4be52',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Tenant or source identifier associated with the payload.',
    example: 'prms.result-management.api',
  })
  @IsOptional()
  @IsString()
  tenant?: string;

  @ApiPropertyOptional({
    description: 'Operation code provided by the upstream source.',
    example: 'dataset.ingest.requested',
  })
  @IsOptional()
  @IsString()
  op?: string;

  @ApiPropertyOptional({
    description:
      'Single bilateral payload when the upstream source sends the dataset directly under "data".',
    type: () => CreateBilateralDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBilateralDto)
  data?: CreateBilateralDto;
}
