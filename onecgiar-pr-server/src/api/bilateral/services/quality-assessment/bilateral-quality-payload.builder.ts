// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilateralService } from '../../bilateral.service';
import { ResultsService } from '../../../results/results.service';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { ResultTypeEnum } from '../../../../shared/constants/result-type.enum';
import { QualityPayload } from './bilateral-quality-rules';
import { mapResultHeader } from './mappers/result-header.mapper';
import { mapGeneralInformation } from './mappers/general-information.mapper';
import { mapContributorsAndPartners } from './mappers/contributors-and-partners.mapper';
import { mapGeographicLocation } from './mappers/geographic-location.mapper';
import { mapEvidence } from './mappers/evidence.mapper';
import {
  mapTypeSpecific,
  RawInnovationUseActorHowMany,
} from './mappers/type-specific.mapper';
import { mapImpactAreas } from './mappers/impact-areas.mapper';
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

/**
 * Frozen outbound contract version (design.md §4.5, `docs/bilateral-module/integration-
 * contracts.md`). v0.2 amended 2026-09-16 — supersedes v0.1 in place (`BIL-QAI-DD-11`).
 */
export const BILATERAL_QUALITY_CONTRACT_VERSION = '0.2';

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
    // `BIL-QAI-T-4b` gate fix: source of the un-post-processed `result_actors` rows for
    // Innovation Use's "Number of people using" total (see `loadRawInnovationUseActors` below
    // and `RawInnovationUseActorHowMany` in `./mappers/type-specific.mapper.ts` for why
    // `formDetail.resultTypeResponse[0].actors` alone cannot be trusted for `how_many`). Same
    // convention as `indicatorDescriptionResolver` above: required in production (`DataSource`
    // resolves application-wide — `BilateralService` and `TocIndicatorDescriptionResolver`
    // already inject it in this same module with no extra `bilateral.module.ts` wiring), `?` is
    // TypeScript-only so fixture-driven unit tests can still `new` this class, and `project()`
    // never touches it.
    private readonly dataSource?: DataSource,
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

    const rawInnovationUseActors = await this.loadRawInnovationUseActors(
      resultId,
      detail,
    );

    return this.project(
      detail,
      formDetail,
      opts,
      indicatorDescriptions,
      rawInnovationUseActors,
    );
  }

  /**
   * Queries `result_actors` directly through the already-injected `DataSource` — the same
   * connection `BilateralService.buildInnovationUseBilateralSummary` uses for its own
   * `dataSource.getRepository(ResultActor).find(...)` call (`bilateral.service.ts:3235-3242`) —
   * so `how_many` reaches the mapper before `InnovationUseService.getActorsData` overwrites it
   * (`innovation-use.service.ts:901-933`). Only Innovation Use needs this; every other type
   * returns `[]` without a query.
   */
  private async loadRawInnovationUseActors(
    resultId: number,
    detail: Record<string, any>,
  ): Promise<RawInnovationUseActorHowMany[]> {
    if (
      Number(detail?.result_type_id) !== ResultTypeEnum.INNOVATION_USE ||
      !this.dataSource
    ) {
      return [];
    }

    const rows = await this.dataSource.getRepository(ResultActor).find({
      where: { result_id: resultId, is_active: true },
    });

    return rows.map((row) => ({
      result_actors_id: Number(row.result_actors_id),
      how_many: row.how_many == null ? null : Number(row.how_many),
    }));
  }

  project(
    detail: Record<string, any>,
    formDetail: Record<string, any>,
    opts: BilateralQualityPayloadBuildOptions,
    indicatorDescriptions: Record<string, string | null> = {},
    rawInnovationUseActors: RawInnovationUseActorHowMany[] = [],
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
      type_specific: mapTypeSpecific(
        detail,
        formDetail,
        rawInnovationUseActors,
      ),
    };

    return {
      contract_version: BILATERAL_QUALITY_CONTRACT_VERSION,
      request_id: opts.requestId,
      result: stripIdentifiers(result),
      sections: stripIdentifiers(sections) as QualityPayload['sections'],
      // Sibling of `sections`, not stripped through the id denylist — its only values are the
      // frozen pillar/score labels and the seeded sub-component names, none of which are
      // id-shaped (design.md §5 "Impact-areas mapper"). Inside the content hash by construction
      // (contentHash spreads the whole payload minus request_id/constraints).
      impact_areas: mapImpactAreas(detail),
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
