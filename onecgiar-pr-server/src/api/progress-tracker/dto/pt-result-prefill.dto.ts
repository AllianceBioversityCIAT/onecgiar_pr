import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PtPrefillEvidenceLinkDto {
  @ApiProperty({ description: 'Absolute http(s) URL of the evidence.' })
  url: string;

  @ApiPropertyOptional({
    description: 'Title PT gave the link; stored as the evidence description.',
  })
  title?: string;
}

export class PtPrefillPartnerDto {
  @ApiProperty({
    description:
      'CLARISA institution id PT matched (`match_status` = matched).',
  })
  clarisa_id: number;

  @ApiPropertyOptional({
    description: 'Partner name as PT sent it — only echoed back when skipped.',
  })
  name?: string;
}

export class PtPrefillGeoCountryDto {
  @ApiProperty({
    description: 'CLARISA country id PT matched (`match_status` = matched).',
  })
  clarisa_id: number;

  @ApiPropertyOptional({
    description:
      'ISO alpha-2 PT sent; when present it must agree with the CLARISA id.',
  })
  iso_alpha_2?: string | null;

  @ApiPropertyOptional({
    description: 'Country name — only echoed back when skipped.',
  })
  name?: string;
}

export class PtPrefillGeoRegionDto {
  @ApiProperty({
    description: 'CLARISA region UM49 code (`clarisa_regions.um49Code`).',
  })
  id: number;

  @ApiPropertyOptional({
    description: 'Region name — only echoed back when skipped.',
  })
  name?: string;
}

export class PtPrefillGeoSubnationalDto {
  @ApiPropertyOptional({
    description: 'CLARISA subnational code (ISO 3166-2).',
  })
  code?: string;

  @ApiPropertyOptional({ description: 'CLARISA subnational id.' })
  clarisa_id?: number;
}

/**
 * `PTB-R-18b` (2026-10-19) — the geography a PT pick resolves to, already mapped to PRMS
 * geographic focus ids by the client (`pt-prefill.util.ts`): 1 Global, 2 Regional, 3 Country
 * (one or many), 5 Sub-national. The server re-validates every id against CLARISA.
 */
export class PtPrefillGeographyDto {
  @ApiProperty({ enum: [1, 2, 3, 5] })
  geo_scope_id: number;

  @ApiPropertyOptional({ type: () => [PtPrefillGeoCountryDto] })
  countries?: PtPrefillGeoCountryDto[];

  @ApiPropertyOptional({ type: () => [PtPrefillGeoRegionDto] })
  regions?: PtPrefillGeoRegionDto[];

  @ApiPropertyOptional({ type: () => [PtPrefillGeoSubnationalDto] })
  subnational?: PtPrefillGeoSubnationalDto[];
}

/** PT impact-area keys → score 0 Not targeted · 1 Significant · 2 Principal. */
export type PtImpactAreaKey =
  | 'gender'
  | 'climate'
  | 'nutrition'
  | 'environment'
  | 'poverty';

/**
 * `PTB-R-18a` (2026-10-19) — optional block on `POST /api/results-framework-reporting/create`,
 * sent next to `progress_tracker_provenance` (whose DTO is closed). Applied best-effort after the
 * result exists by `ProgressTrackerPrefillService`: it never fails the create, so it is sanitized
 * there rather than validated into a 400.
 */
export class PtResultPrefillDto {
  @ApiPropertyOptional({ type: () => [PtPrefillEvidenceLinkDto] })
  evidence_links?: PtPrefillEvidenceLinkDto[];

  @ApiPropertyOptional({ type: () => [PtPrefillPartnerDto] })
  partners?: PtPrefillPartnerDto[];

  // PTB-R-18b (2026-10-19)
  @ApiPropertyOptional({ type: () => PtPrefillGeographyDto })
  geography?: PtPrefillGeographyDto;

  @ApiPropertyOptional({
    description:
      'Impact-area scores (0 | 1 | 2) by PT key: gender, climate, nutrition, environment, poverty.',
  })
  impact_areas?: Partial<Record<PtImpactAreaKey, number>>;
}

/** What the prefill step did — returned as `response.progressTrackerPrefill`. */
export interface PtPrefillSummary {
  evidence_links_saved: number;
  partners_saved: number;
  /** Names of partners that were not saved (unknown / inactive CLARISA id, a CGIAR center, or a failure). */
  partners_skipped: string[];
  /** `PTB-R-18b`: PRMS geographic focus written (1 | 2 | 3 | 5), or `null` when none was. */
  geography_applied?: number | null;
  /** Why no geography was written: `not_empty` · `no_valid_location` · `failed`. */
  geography_skipped_reason?: string | null;
  /** Countries / regions / subnational areas dropped (unknown in CLARISA or inconsistent). */
  geography_skipped: string[];
  /** PT impact-area keys whose score was written. */
  impact_areas_applied: PtImpactAreaKey[];
  /** PT impact-area keys not written (already scored on the result, or a failure). */
  impact_areas_skipped: PtImpactAreaKey[];
}
