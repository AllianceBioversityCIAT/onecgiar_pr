// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
import { ApiProperty } from '@nestjs/swagger';
import {
  BilateralQualityAssessmentAiStatus,
  BilateralQualityAssessmentStatus,
  BilateralQualityAssessmentUnavailableReason,
} from '../../../entities/bilateral-quality-assessment.entity';
import {
  QualityEvidenceItem,
  QualitySectionKey,
  QualitySectionResult,
  QualityVerdict,
} from '../bilateral-quality-rules';

/**
 * `overall` block of `AssessmentResponseDto` (design.md §4.1). All three fields are nullable
 * because an `unavailable` row never produced a verdict (`overall_verdict`/`overall_score`/
 * `overall_summary` are all nullable columns, `design.md` §3.1).
 */
export class AssessmentOverallDto {
  @ApiProperty({ enum: ['green', 'amber', 'red', 'grey'], nullable: true })
  verdict: QualityVerdict | null;

  @ApiProperty({
    nullable: true,
    description: 'Verbatim AI score, 0-100 (BIL-QAI-R-12).',
  })
  score: number | null;

  @ApiProperty({ nullable: true })
  summary: string | null;
}

/**
 * `POST /api/bilateral/center/quality-assessment/:resultId` (200) and
 * `GET /api/bilateral/center/quality-assessment/:resultId/latest` (200) response shape
 * (design.md §4.1 / §4.2). `ai_status` and `degraded_reason` are always-present keys, `null`
 * when they do not apply (contract v0.2, design.md §4.5 / `BIL-QAI-R-8` scenario "A degraded
 * run is legible to the reviewer") — never omitted, so a caller can tell "not applicable" from
 * "field missing".
 */
export class AssessmentResponseDto {
  @ApiProperty() id: number;

  @ApiProperty() result_id: number;

  @ApiProperty({
    enum: ['running', 'completed', 'unavailable', 'skipped_kp_rule'],
  })
  status: BilateralQualityAssessmentStatus;

  @ApiProperty({ enum: ['completed', 'partial'], nullable: true })
  ai_status: BilateralQualityAssessmentAiStatus | null;

  @ApiProperty({ nullable: true })
  degraded_reason: string | null;

  @ApiProperty({
    description:
      'True when the stored content hash still matches the persisted result (design.md §5 DD-3).',
  })
  is_current: boolean;

  @ApiProperty({ example: '0.2' })
  contract_version: string;

  @ApiProperty({ type: AssessmentOverallDto })
  overall: AssessmentOverallDto;

  @ApiProperty({
    type: Object,
    description:
      'Keyed by the five form sections (`general_information`, `contributors_and_partners`, ' +
      '`geographic_location`, `evidence`, `type_specific`); each verdict may be `grey` (v0.2).',
  })
  /** Only the sections the result actually has — `type_specific` is absent for the types
   * (Other output, Other outcome) that have no such section in the editor. */
  sections: Partial<Record<QualitySectionKey, QualitySectionResult>>;

  @ApiProperty({ type: [Object] })
  evidence: QualityEvidenceItem[];

  @ApiProperty({ nullable: true })
  criteria_version: string | null;

  @ApiProperty({ nullable: true })
  elapsed_ms: number | null;

  @ApiProperty({
    enum: [
      'timeout',
      'http_error',
      'malformed',
      'not_configured',
      'ai_unavailable',
    ],
    nullable: true,
  })
  unavailable_reason: BilateralQualityAssessmentUnavailableReason | null;

  @ApiProperty()
  created_at: Date;
}

/**
 * `POST` response when a `running` row younger than window+grace already exists for the
 * result (design.md §4.1 "Response 202" / §5 orchestrator step 3, `BIL-QAI-R-1` scenario "No
 * second submission while the check runs"). Deliberately a smaller shape than
 * {@link AssessmentResponseDto} — no verdict exists yet.
 */
export class RunningAssessmentDto {
  @ApiProperty() id: number;

  @ApiProperty() result_id: number;

  @ApiProperty({ enum: ['running'] })
  status: 'running';

  @ApiProperty()
  is_current: true;
}

/** `GET .../latest` (200) when no assessment has ever run for the result (design.md §4.2). */
export class LatestAssessmentEmptyDto {
  @ApiProperty({ nullable: true, default: null })
  latest: null;
}
