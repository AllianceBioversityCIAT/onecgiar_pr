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

export class SubnationalAreaDto {
  @ValidateIf((o) => !o.name)
  @IsNumber()
  id?: number;

  @ValidateIf((o) => !o.id)
  @IsString()
  name?: string;
}

export class GeoFocusDto {
  @ValidateIf((o) => !o.scope_label)
  @IsNumber()
  scope_code?: number;

  @ValidateIf((o) => !o.scope_code)
  @IsString()
  scope_label?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegionDto)
  regions?: RegionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CountryDto)
  countries?: CountryDto[];

  @IsArray()
  @ArrayMinSize(1)
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