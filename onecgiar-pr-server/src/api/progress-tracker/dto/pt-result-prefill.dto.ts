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
}

/** What the prefill step did — returned as `response.progressTrackerPrefill`. */
export interface PtPrefillSummary {
  evidence_links_saved: number;
  partners_saved: number;
  /** Names of partners that were not saved (unknown / inactive CLARISA id, a CGIAR center, or a failure). */
  partners_skipped: string[];
}
