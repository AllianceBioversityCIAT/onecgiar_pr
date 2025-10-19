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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsNotEmpty()
  aow_compose_code: string;

  @ApiProperty({
    description: 'Title of the Theory of Change result',
    example: 'Climate-resilient crop systems adopted',
  })
  @IsString()
  @IsNotEmpty()
  result_title: string;

  @ApiProperty({
    description: 'Indicator description linked to the ToC result',
    example: 'Number of climate resilient practices documented',
  })
  @IsString()
  @IsNotEmpty()
  result_indicator_description: string;

  @ApiProperty({
    description: 'Type name of the indicator (e.g. Output, Outcome)',
    example: 'Output',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
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

  @ApiProperty({
    description: 'List of AGROVOC keywords associated with the product',
    example: ['climate change', 'beans', 'Andes'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  agrovoc_keywords: string[];
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
    type: [TocMappingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TocMappingDto)
  toc_mapping: TocMappingDto[];

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

  @ApiProperty({
    description: 'Knowledge product associated with the bilateral project',
    type: () => KnowledgeProductDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => KnowledgeProductDto)
  knowledge_product: KnowledgeProductDto;
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
  @ApiProperty({
    description: 'Collection of bilateral result records to be processed',
    type: [ResultBilateralDto],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ResultBilateralDto)
  results: ResultBilateralDto[];
}
