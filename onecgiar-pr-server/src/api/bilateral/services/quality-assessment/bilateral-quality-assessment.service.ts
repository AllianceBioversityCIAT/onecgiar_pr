// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../../../shared/constants/result-type.enum';
import { Result } from '../../../results/entities/result.entity';
import { ResultsKnowledgeProductsRepository } from '../../../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductMetadata } from '../../../results/results-knowledge-products/entities/results-knowledge-product-metadata.entity';
import { BilateralQualityAssessmentRepository } from '../../repositories/bilateral-quality-assessment.repository';
import {
  BilateralQualityAssessment,
  BilateralQualityAssessmentAiStatus,
  BilateralQualityAssessmentStatus,
  BilateralQualityAssessmentUnavailableReason,
} from '../../entities/bilateral-quality-assessment.entity';
import {
  BILATERAL_QUALITY_CONTRACT_VERSION,
  BilateralQualityPayloadBuilder,
  BilateralResultFormReadError,
  UnresolvableLabelError,
} from './bilateral-quality-payload.builder';
import { BilateralQualityAssessmentClient } from './bilateral-quality-assessment.client';
import {
  applyGreyRule,
  contentHash,
  evaluateKpRule,
  KpMetadataRow,
  QualityEvidenceItem,
  QualityPayload,
  QualitySectionKey,
  QualitySectionResult,
  QualityVerdict,
} from './bilateral-quality-rules';
import {
  AssessmentResponseDto,
  RunningAssessmentDto,
} from './dto/assessment-response.dto';

/**
 * Orchestrator for the AI quality-assessment flow (design.md §2.2 primary flow, §5
 * "Orchestrator"; `BIL-QAI-T-6`). Owns none of the submit preconditions — those live on
 * `BilateralCenterService.assertSubmittable` (`BIL-QAI-DD-5`: the orchestrator is a
 * collaborator, not the permission owner) — and is handed an already-validated `Result` row
 * by its caller.
 *
 * Flow per `design.md` §5, steps 2-5 (step 1, preconditions, is the caller's job):
 * 2. Build the definitions-only payload, hash it, short-circuit on a matching completed/
 *    `skipped_kp_rule` row.
 * 3. Otherwise atomically claim a `running` row (SQL-side age check — never JS `Date` math,
 *    per the MySQL `NOW()` vs JS `Date` timezone rule) or return the existing young one (202).
 * 4. Branch Knowledge Product (deterministic rule, no HTTP) vs AI call; update the row to its
 *    terminal state regardless of whether the HTTP client's caller is still listening.
 * 5. Log one structured line; return the DTO.
 */
@Injectable()
export class BilateralQualityAssessmentService {
  private readonly logger = new Logger(BilateralQualityAssessmentService.name);

  /**
   * Added to the AI timeout to decide whether an existing `running` row is still "in
   * progress" or stale enough to start a new run (design.md §2.2/§5 "window+grace"; §2.3
   * mirrors the same window on the client poll). No exact number is pinned in the spec for
   * the *server* lock (only the client's own `window + 10s` RxJS timeout, `design.md` §6.2)
   * — 10s is reused here for the same margin on the server side; flagged as an authored
   * choice, not a copied literal, in the Implementer report.
   */
  private static readonly RUNNING_LOCK_GRACE_SECONDS = 10;

  constructor(
    private readonly repository: BilateralQualityAssessmentRepository,
    private readonly payloadBuilder: BilateralQualityPayloadBuilder,
    private readonly client: BilateralQualityAssessmentClient,
    private readonly resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
  ) {}

  /**
   * Runs (or reuses) the assessment for `result`. The caller (`BilateralCenterService.assess`)
   * has already run `assertSubmittable` — this method never re-checks status, centre
   * permission, Science Program assignment or the Innovation Use MDS gate.
   */
  async assess(
    user: TokenDto,
    result: Result,
  ): Promise<{
    dto: AssessmentResponseDto | RunningAssessmentDto;
    httpStatus: 200 | 202;
  }> {
    const resultId = Number(result.id);
    const userEmail = user.email?.trim();
    if (!userEmail) {
      throw new BadRequestException(
        'Unable to identify the signed-in user for the quality check.',
      );
    }
    const requestId = randomUUID();
    const timeoutSeconds = this.client.timeoutSeconds();

    const payload = await this.buildPayloadOrThrow(
      resultId,
      requestId,
      timeoutSeconds,
    );
    const hash = contentHash(payload);

    const latest = await this.repository.findLatestByResultId(resultId);
    if (latest && this.isReusable(latest) && latest.content_hash === hash) {
      return { dto: this.toDto(latest, true), httpStatus: 200 };
    }

    const claim = await this.claimRunningRow(resultId, hash, result, user.id);
    if ('runningId' in claim) {
      const dto: RunningAssessmentDto = {
        id: claim.runningId,
        result_id: resultId,
        status: 'running',
        is_current: true,
      };
      return { dto, httpStatus: 202 };
    }

    const evidenceCount = payload.sections.evidence.length;
    const isKp =
      Number(result.result_type_id) === ResultTypeEnum.KNOWLEDGE_PRODUCT;
    const patch = isKp
      ? await this.runKpRule(resultId, evidenceCount)
      : await this.runAiCall(payload, resultId, userEmail);

    await this.repository.update({ id: claim.claimed.id }, patch);

    this.logger.log(
      `event=bilateral_quality_assessment result_id=${resultId} status=${patch.status} ` +
        `ai_status=${patch.ai_status ?? 'null'} overall=${patch.overall_verdict ?? 'null'} ` +
        `elapsed_ms=${patch.elapsed_ms ?? 0} criteria_version=${patch.criteria_version ?? 'null'}`,
    );

    const stored: BilateralQualityAssessment = {
      ...claim.claimed,
      ...patch,
    } as BilateralQualityAssessment;
    return { dto: this.toDto(stored, true), httpStatus: 200 };
  }

  /**
   * `GET .../quality-assessment/:resultId/latest` (design.md §4.2). Unlike the additive
   * `quality_assessment` block T-7 adds to the result reads, this endpoint deliberately
   * includes a `running` row too — the client polls it while a check is in flight (design.md
   * §2.3 "Reopen after closing the tab").
   */
  async getLatest(
    resultId: number,
  ): Promise<AssessmentResponseDto | { latest: null }> {
    const parsedResultId = Number(resultId);
    const latest = await this.repository.findLatestByResultId(parsedResultId);
    if (!latest) {
      return { latest: null };
    }

    const payload = await this.buildPayloadOrThrow(
      parsedResultId,
      randomUUID(),
      this.client.timeoutSeconds(),
    );
    const isCurrent = contentHash(payload) === latest.content_hash;

    return this.toDto(latest, isCurrent);
  }

  private isReusable(row: BilateralQualityAssessment): boolean {
    return row.status === 'completed' || row.status === 'skipped_kp_rule';
  }

  /**
   * `BilateralResultFormReadError` interpolates the upstream form-read status/message into its
   * own `.message` (`mappers/errors.ts`) — that text must never reach the client or a log line
   * (`.cursorrules`; forward pointer carried into `BIL-QAI-T-6`). Mapped to a generic 4xx
   * instead. `UnresolvableLabelError` carries no upstream body — its own message is safe to
   * surface and is mapped to the same 400 path any other precondition failure uses, per its
   * own doc comment.
   */
  private async buildPayloadOrThrow(
    resultId: number,
    requestId: string,
    timeoutSeconds: number,
  ): Promise<QualityPayload> {
    try {
      return await this.payloadBuilder.build(resultId, {
        requestId,
        timeoutSeconds,
      });
    } catch (error) {
      if (error instanceof BilateralResultFormReadError) {
        throw new BadRequestException(
          'Unable to read the bilateral result needed for the quality check. Try again, or contact support if this continues.',
        );
      }
      if (error instanceof UnresolvableLabelError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Atomically claims the right to start a new run: inside one transaction, first checks (in
   * SQL, never in JS — mysql2 serialises a JS `Date` in the connection's local time while
   * MySQL's own `NOW()` is UTC) whether a `running` row younger than window+grace already
   * exists; if so, returns its id without inserting anything. Otherwise inserts a new
   * `running` row (design.md §5 "Orchestrator" step 3).
   */
  private async claimRunningRow(
    resultId: number,
    hash: string,
    result: Result,
    createdBy: number,
  ): Promise<{ runningId: number } | { claimed: BilateralQualityAssessment }> {
    const maxAgeSeconds =
      this.client.timeoutSeconds() +
      BilateralQualityAssessmentService.RUNNING_LOCK_GRACE_SECONDS;

    return this.repository.manager.transaction(async (manager) => {
      // Lock the existing result row first. The running-row query alone is not
      // enough: two transactions can both observe no young row and insert a
      // duplicate before either transaction commits. The result is already
      // validated by assertSubmittable and is the stable per-result mutex.
      const lockedResult = await manager.query(
        'SELECT id FROM result WHERE id = ? FOR UPDATE',
        [resultId],
      );
      if (lockedResult.length === 0) {
        throw new BadRequestException('Bilateral result not found');
      }

      const youngRunning: Array<{ id: string | number }> = await manager.query(
        `SELECT id FROM bilateral_quality_assessments ` +
          `WHERE result_id = ? AND status = 'running' ` +
          `AND created_at > (NOW() - INTERVAL ? SECOND) ` +
          `ORDER BY created_at DESC, id DESC LIMIT 1`,
        [resultId, maxAgeSeconds],
      );

      if (youngRunning.length > 0) {
        return { runningId: Number(youngRunning[0].id) };
      }

      // `sections`/`evidence` are `json NOT NULL` with no column default (entity file,
      // `T-6` forward pointer) — an insert omitting them dies with
      // `ER_NO_DEFAULT_FOR_FIELD`. The entity types `sections` as
      // `Record<QualitySectionKey, QualitySectionResult>` (all five keys mandatory)
      // because every OTHER reader of a terminal row (this DTO's `toDto`, T-7's decision
      // stamping, T-9's dialog) may assume that shape once `status` leaves `running`.
      // Loosening the entity's own type to `Partial<...>` would weaken that guarantee for
      // all of them to accommodate the one row-shape that never has it — this pre-terminal
      // insert. A single narrow cast here, and only here, keeps the promise for everyone
      // else.
      const entity = manager.create(BilateralQualityAssessment, {
        result_id: resultId,
        version_id:
          result.version_id == null ? null : Number(result.version_id),
        content_hash: hash,
        contract_version: BILATERAL_QUALITY_CONTRACT_VERSION,
        status: 'running',
        unavailable_reason: null,
        ai_status: null,
        degraded_reason: null,
        overall_verdict: null,
        overall_score: null,
        overall_summary: null,
        sections: {} as Partial<
          Record<QualitySectionKey, QualitySectionResult>
        >,
        evidence: [] as QualityEvidenceItem[],
        criteria_version: null,
        elapsed_ms: null,
        decision: null,
        had_outstanding_flags: null,
        decided_at: null,
        created_by: createdBy,
      });

      const claimed = await manager.save(BilateralQualityAssessment, entity);
      return { claimed };
    });
  }

  /**
   * Knowledge Products never call the AI (`BIL-QAI-R-9`) — the verdict comes from the
   * deterministic decision tree in `bilateral-quality-rules.ts`. `is_melia` and
   * `knowledge_product_type` are read directly off `results_knowledge_product` (the enriched
   * `BilateralService.findOne` detail deletes this array for KP results after building the
   * public `knowledge_product_summary`, `bilateral.service.ts` `enrichBilateralResultResponse`
   * — it carries the handle only, not `is_melia`).
   */
  private async runKpRule(
    resultId: number,
    evidenceCount: number,
  ): Promise<TerminalPatch> {
    const kpRow = await this.resultsKnowledgeProductsRepository.findOne({
      where: { results_id: resultId, is_active: true },
      relations: { result_knowledge_product_metadata_array: true },
    });

    const metadataRows = (
      kpRow?.result_knowledge_product_metadata_array ?? []
    ).filter((row) => row.is_active !== false);
    // Same "not CGSpace ⇒ WoS" rule already used for these same two rows elsewhere
    // (results-knowledge-products.service.ts:2035-2037 `getWarnings`) — deliberately not a
    // literal `'WoS'` match, since nothing in this codebase asserts that exact string is what
    // production data carries for the non-CGSpace row.
    const cgspaceRow = metadataRows.find((row) => row.source === 'CGSpace');
    const wosRow = metadataRows.find((row) => row.source !== 'CGSpace');

    const outcome = evaluateKpRule({
      is_melia: !!kpRow?.is_melia,
      knowledge_product_type: kpRow?.knowledge_product_type ?? '',
      cgspace: this.toKpMetadataRow(cgspaceRow),
      wos: this.toKpMetadataRow(wosRow),
      // Forward pointer (`BIL-QAI-T-6` brief): always pass `evidence_count` — it is optional
      // on the type, and a caller that forgets it silently drops the KP evidence listing
      // design §5 asks for.
      evidence_count: evidenceCount,
    });

    return {
      status: 'skipped_kp_rule',
      unavailable_reason: null,
      ai_status: null,
      degraded_reason: null,
      overall_verdict: outcome.overall.verdict,
      overall_score: null,
      overall_summary: outcome.overall.summary,
      sections: outcome.sections,
      evidence: outcome.evidence,
      criteria_version: null,
      elapsed_ms: null,
    };
  }

  private toKpMetadataRow(
    row: ResultsKnowledgeProductMetadata | undefined,
  ): KpMetadataRow | null {
    if (!row) {
      return null;
    }
    return {
      year: row.year == null ? null : Number(row.year),
      is_isi: row.is_isi ?? null,
      is_peer_reviewed: row.is_peer_reviewed ?? null,
      accesibility: row.accesibility ?? null,
    };
  }

  /**
   * Runs the AI call and maps its outcome to a terminal row patch per the PRMS status
   * mapping table (design.md §4.5): AI `completed`/`partial` ⇒ row `completed` with
   * `ai_status`/`degraded_reason` set; AI `unavailable` ⇒ row `unavailable` with
   * `unavailable_reason = 'ai_unavailable'`, reason kept; the four transport failures ⇒ row
   * `unavailable` with their own reason and both new columns `null`. `sections`/`evidence`
   * are omitted from every non-`ok` patch on purpose — the running-row insert already left
   * them `{}`/`[]`, and no verdict exists to overwrite them with.
   */
  private async runAiCall(
    payload: QualityPayload,
    resultId: number,
    userEmail: string,
  ): Promise<TerminalPatch> {
    const outcome = await this.client.assess(payload, { resultId, userEmail });

    if (outcome.outcome === 'ok') {
      const graded = applyGreyRule(outcome.response, payload);
      return {
        status: 'completed',
        unavailable_reason: null,
        ai_status: outcome.ai_status,
        degraded_reason: outcome.degraded_reason,
        overall_verdict: graded.overall?.verdict ?? null,
        overall_score: graded.overall?.score ?? null,
        // `overall.summary` is not guaranteed by the client's schema check (known over-wide
        // spot documented on `isValidAiResponse`) — read defensively.
        overall_summary: graded.overall?.summary ?? null,
        sections: graded.sections,
        evidence: graded.evidence,
        criteria_version: graded.criteria_version ?? null,
        elapsed_ms: outcome.elapsed_ms,
      };
    }

    if (outcome.outcome === 'ai_unavailable') {
      return {
        status: 'unavailable',
        unavailable_reason: 'ai_unavailable',
        ai_status: null,
        degraded_reason: outcome.degraded_reason,
        overall_verdict: null,
        overall_score: null,
        overall_summary: null,
        criteria_version: null,
        elapsed_ms: outcome.elapsed_ms,
      };
    }

    // The remaining `AiClientFailureOutcome` members (`not_configured` | `timeout` |
    // `http_error` | `malformed`) are, by construction, the exact `unavailable_reason`
    // literal for a transport no-answer (design.md §4.5 mapping table row 4).
    return {
      status: 'unavailable',
      unavailable_reason: outcome.outcome,
      ai_status: null,
      degraded_reason: null,
      overall_verdict: null,
      overall_score: null,
      overall_summary: null,
      criteria_version: null,
      elapsed_ms: outcome.elapsed_ms,
    };
  }

  private toDto(
    row: BilateralQualityAssessment,
    isCurrent: boolean,
  ): AssessmentResponseDto {
    return {
      id: Number(row.id),
      result_id: Number(row.result_id),
      status: row.status,
      ai_status: row.ai_status,
      degraded_reason: row.degraded_reason,
      is_current: isCurrent,
      contract_version: row.contract_version,
      overall: {
        verdict: row.overall_verdict,
        score: row.overall_score,
        summary: row.overall_summary,
      },
      sections: row.sections,
      evidence: row.evidence,
      criteria_version: row.criteria_version,
      elapsed_ms: row.elapsed_ms,
      unavailable_reason: row.unavailable_reason,
      created_at: row.created_at,
    };
  }
}

interface TerminalPatch {
  status: BilateralQualityAssessmentStatus;
  unavailable_reason: BilateralQualityAssessmentUnavailableReason | null;
  ai_status: BilateralQualityAssessmentAiStatus | null;
  degraded_reason: string | null;
  overall_verdict: QualityVerdict | null;
  overall_score: number | null;
  overall_summary: string | null;
  criteria_version: string | null;
  elapsed_ms: number | null;
  sections?: Partial<Record<QualitySectionKey, QualitySectionResult>>;
  evidence?: QualityEvidenceItem[];
}
