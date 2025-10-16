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
} from 'class-validator';
import { Type } from 'class-transformer';

/* -------------------------------------------------------------------------- */
/*                               SUB-OBJECTS                                   */
/* -------------------------------------------------------------------------- */

export class SubmittedByDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  submitted_date: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class TocMappingDto {
  @IsString()
  @IsNotEmpty()
  science_program_id: string;

  @IsString()
  @IsNotEmpty()
  aow_compose_code: string;

  @IsString()
  @IsNotEmpty()
  result_title: string;

  @IsString()
  @IsNotEmpty()
  result_indicator_description: string;

  @IsString()
  @IsNotEmpty()
  result_indicator_type_name: string;
}


export class RegionDto {
  @ValidateIf((o) => !o.name)
  @IsNumber()
  um49code?: number;

  @ValidateIf((o) => !o.um49code)
  @IsString()
  name?: string;
}

/**
 * DTO para país
 */
export class CountryDto {
  @ValidateIf((o) => !o.name && !o.iso_alpha_3 && !o.iso_alpha_2)
  @IsNumber()
  id?: number;

  @ValidateIf((o) => !o.id && !o.iso_alpha_3 && !o.iso_alpha_2)
  @IsString()
  name?: string;

  @ValidateIf((o) => !o.id && !o.name && !o.iso_alpha_2)
  @IsString()
  iso_alpha_3?: string;

  @ValidateIf((o) => !o.id && !o.name && !o.iso_alpha_3)
  @IsString()
  iso_alpha_2?: string;
}

/**
 * DTO para área subnacional
 */
export class SubnationalAreaDto {
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;
}

/**
 * DTO principal: GeoFocus
 */
export class GeoFocusDto {
  // --- Scope ---
  @ValidateIf((o) => !o.scope_label)
  @IsNumber()
  @IsIn([1, 2, 4, 5, 50])
  scope_code?: number;

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
  @ValidateIf(
    (o) =>
      o.scope_code === 2 || o.scope_label === 'Regional',
  )
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegionDto)
  regions?: RegionDto[];

  // --- Countries ---
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
  @ValidateIf(
    (o) =>
      o.scope_code === 5 ||
      o.scope_label === 'Sub-national',
  )
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
  @ValidateIf((o) => !o.acronym && !o.name)
  @IsNumber()
  institution_id?: number;

  @ValidateIf((o) => !o.institution_id && !o.name)
  @IsString()
  acronym?: string;

  @ValidateIf((o) => !o.institution_id && !o.acronym)
  @IsString()
  name?: string;
}

export class EvidenceDto {
  @IsUrl()
  @IsNotEmpty()
  link: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class BilateralProjectDto {
  @IsString()
  @IsNotEmpty()
  grant_title: string;
}

/* -------------------------------------------------------------------------- */
/*                               MAIN DTO                                     */
/* -------------------------------------------------------------------------- */

export class CreateBilateralDto {
  @ValidateNested()
  @Type(() => SubmittedByDto)
  @IsNotEmpty()
  submitted_by: SubmittedByDto;

  @IsString()
  @IsNotEmpty()
  lead_center: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TocMappingDto)
  toc_mapping: TocMappingDto[];

  @ValidateNested()
  @Type(() => GeoFocusDto)
  @IsNotEmpty()
  geo_focus: GeoFocusDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  @IsNotEmpty()
  contributing_center: InstitutionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  @IsNotEmpty()
  contributing_partners: InstitutionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  @IsNotEmpty()
  evidence: EvidenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BilateralProjectDto)
  @IsNotEmpty()
  contributing_bilateral_projects: BilateralProjectDto[];
}