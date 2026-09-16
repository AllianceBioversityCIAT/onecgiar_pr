// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { Inject, Injectable } from '@nestjs/common';
import { BilateralService } from '../../bilateral.service';
import { ResultsService } from '../../../results/results.service';
import { QualityPayload } from './bilateral-quality-rules';
import { mapResultHeader } from './mappers/result-header.mapper';
import { mapGeneralInformation } from './mappers/general-information.mapper';
import { mapContributorsAndPartners } from './mappers/contributors-and-partners.mapper';
import { mapGeographicLocation } from './mappers/geographic-location.mapper';
import { mapEvidence } from './mappers/evidence.mapper';
import { mapTypeSpecific } from './mappers/type-specific.mapper';
import { stripIdentifiers } from './mappers/strip-identifiers';
import { BilateralResultFormReadError } from './mappers/errors';
import {
  INDICATOR_DESCRIPTION_RESOLVER,
  IndicatorDescriptionResolver,
} from './indicator-description-resolver';

export {
  UnresolvableLabelError,
  BilateralResultFormReadError,
} from './mappers/errors';

/** Frozen outbound contract version (design.md §4.5, `docs/bilateral-module/integration-contracts.md`). */
export const BILATERAL_QUALITY_CONTRACT_VERSION = '0.1';

/**
 * `build(resultId, opts)` inputs beyond the persisted result itself — the caller (the
 * orchestrator, `BIL-QAI-T-6`) derives `timeout_seconds` from
 * `BILATERAL_AI_QUALITY_TIMEOUT_MS`; this builder never hard-codes a default (forward pointer
 * from the `T-1` review).
 */
export interface BilateralQualityPayloadBuildOptions {
  requestId: string;
  timeoutSeconds: number;
}

/**
 * Definitions-only payload builder for the bilateral QA AI traffic light
 * (design.md §5 "Payload builder"; `BIL-QAI-DD-2`; `BIL-QAI-R-2`, `R-3`).
 *
 * Projects the enriched bilateral detail (`BilateralService.findOne`) and the centre-form
 * detail (`ResultsService.getBilateralResultById`) to the five contract sections, entirely in
 * labels, then applies a final denylist pass (`stripIdentifiers`) as a safety net over the
 * mappers' output.
 *
 * `project()` is the pure entry point: no Nest, no I/O, so fixture-driven tests can call it
 * directly. `build()` is the thin async wrapper that fetches both reads and delegates.
 */
@Injectable()
export class BilateralQualityPayloadBuilder {
  constructor(
    private readonly bilateralService: BilateralService,
    private readonly resultsService: ResultsService,
    // Required in production: `bilateral.module.ts` binds `TocIndicatorDescriptionResolver`
    // (`./toc-indicator-description-resolver.service.ts`) to this token, next to the other
    // BIL-QAI-T-2/T-4 providers. No `@Optional()` — a missing binding should fail DI graph
    // compilation, not degrade silently. The `?` here is TypeScript-only, so fixture-driven
    // unit tests can still `new` this class without a resolver when a test's fixtures carry
    // no ToC indicator (`project()` never needs it in that case).
    @Inject(INDICATOR_DESCRIPTION_RESOLVER)
    private readonly indicatorDescriptionResolver?: IndicatorDescriptionResolver,
  ) {}

  async build(
    resultId: number,
    opts: BilateralQualityPayloadBuildOptions,
  ): Promise<QualityPayload> {
    const [detailResult, formDetailResult] = await Promise.all([
      this.bilateralService.findOne(resultId),
      this.resultsService.getBilateralResultById(resultId),
    ]);

    const formStatus = (formDetailResult as { status?: number })?.status;
    if (typeof formStatus === 'number' && formStatus >= 400) {
      throw new BilateralResultFormReadError(
        resultId,
        formStatus,
        (formDetailResult as { message?: string })?.message,
      );
    }

    const detail =
      (detailResult as { response?: Record<string, any> })?.response ?? {};
    const formDetail =
      (formDetailResult as { response?: Record<string, any> })?.response ?? {};

    const indicatorNodeIds = collectIndicatorNodeIds(formDetail);
    const indicatorDescriptions =
      indicatorNodeIds.length && this.indicatorDescriptionResolver
        ? await this.indicatorDescriptionResolver.resolveIndicatorDescriptions(
            indicatorNodeIds,
          )
        : {};

    return this.project(detail, formDetail, opts, indicatorDescriptions);
  }

  project(
    detail: Record<string, any>,
    formDetail: Record<string, any>,
    opts: BilateralQualityPayloadBuildOptions,
    indicatorDescriptions: Record<string, string | null> = {},
  ): QualityPayload {
    const result = mapResultHeader(detail);
    const sections = {
      general_information: mapGeneralInformation(detail, formDetail),
      contributors_and_partners: mapContributorsAndPartners(
        detail,
        formDetail,
        indicatorDescriptions,
      ),
      geographic_location: mapGeographicLocation(detail),
      evidence: mapEvidence(detail),
      type_specific: mapTypeSpecific(detail, formDetail),
    };

    return {
      contract_version: BILATERAL_QUALITY_CONTRACT_VERSION,
      request_id: opts.requestId,
      result: stripIdentifiers(result),
      sections: stripIdentifiers(sections) as QualityPayload['sections'],
      constraints: { timeout_seconds: opts.timeoutSeconds },
    };
  }
}

/**
 * Unique `toc_results_indicator_id`s across every ToC mapping the form read carries
 * (`formDetail.tocMetadata.result_toc_results[].indicators[]` —
 * `results-toc-results.service.ts:729-741`), so `build()` asks the resolver for exactly the
 * ids `project()` might need and no more.
 */
function collectIndicatorNodeIds(formDetail: Record<string, any>): string[] {
  const rows: any[] = Array.isArray(formDetail?.tocMetadata?.result_toc_results)
    ? formDetail.tocMetadata.result_toc_results
    : [];

  const ids = new Set<string>();
  for (const row of rows) {
    const indicators = Array.isArray(row?.indicators) ? row.indicators : [];
    for (const indicator of indicators) {
      if (
        typeof indicator?.toc_results_indicator_id === 'string' &&
        indicator.toc_results_indicator_id
      ) {
        ids.add(indicator.toc_results_indicator_id);
      }
    }
  }
  return Array.from(ids);
}
