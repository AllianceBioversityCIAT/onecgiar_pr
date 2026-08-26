import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstitutionDto {
  @ApiPropertyOptional({ description: 'Institution ID', example: 501 })
  @IsNumber()
  @IsOptional()
  institution_id?: number;

  @ApiPropertyOptional({ description: 'Institution acronym', example: 'CIAT' })
  @IsString()
  @IsOptional()
  acronym?: string;

  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Alliance Bioversity - CIAT',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class BilateralProjectDto {
  @ApiProperty({ description: 'Project ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  project_id: number;

  @ApiPropertyOptional({
    description: 'Is lead project (1/0 or true/false)',
    example: 1,
  })
  @IsOptional()
  is_lead?: number | boolean;

  @ApiPropertyOptional({ description: 'Budget in USD', example: 15000 })
  @IsNumber()
  @IsOptional()
  usd_budget?: number;

  @ApiPropertyOptional({
    description: 'Budget to be determined',
    example: false,
  })
  @IsOptional()
  is_determined?: boolean;
}

/**
 * P2-3443 — External partners.
 *
 * Mirrors the shape pool funding already sends on `SavePartnersV2Dto.institutions`
 * (`api/results/results_by_institutions/dto/save-partners-v2.dto.ts:57`, typed as
 * `ResultsByInstitution`): the CLARISA institution id travels as `institutions_id` (plural
 * `institutions`, singular `id`). It is NOT the `institution_id` used by `InstitutionDto` above —
 * that one is a CGIAR centre and resolves to a `clarisa_center.code`. Two different catalogues,
 * two different field names; do not unify them.
 */
export class PartnerInstitutionDto {
  @ApiProperty({ description: 'CLARISA institution ID', example: 3178 })
  @IsNumber()
  @IsNotEmpty()
  institutions_id: number;

  @ApiPropertyOptional({
    description:
      'Marks this partner as the one leading the result. Only meaningful when is_lead_by_partner is true.',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  is_leading_result?: boolean;
}

export class SaveBilateralContributorsDto {
  @ApiPropertyOptional({
    description: 'List of contributing CGIAR centers',
    type: [InstitutionDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InstitutionDto)
  contributing_center?: InstitutionDto[];

  @ApiPropertyOptional({
    description: 'List of contributing bilateral projects',
    type: [BilateralProjectDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BilateralProjectDto)
  contributing_bilateral_projects?: BilateralProjectDto[];

  @ApiPropertyOptional({
    description:
      'List of external (non-CGIAR) partner institutions contributing to the result. Sending the key replaces the whole set; omitting it leaves the stored partners untouched.',
    type: [PartnerInstitutionDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PartnerInstitutionDto)
  institutions?: PartnerInstitutionDto[];

  @ApiPropertyOptional({
    description:
      'Explicit declaration that the result has no external partners. Persisted on `result.no_applicable_partner` — the same column pool funding writes. When true, every stored partner is deactivated.',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  no_external_partners?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether the result is led by a partner instead of a CGIAR centre. Persisted on `result.is_lead_by_partner`.',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  is_lead_by_partner?: boolean;
}
