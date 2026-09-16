// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * Resolves `toc_results_indicator_id` -> `indicator_description` labels for the ToC indicator
 * `mapContributorsAndPartners`'s `theory_of_change.indicator` needs (design.md §5 "Payload
 * builder" / `BIL-QAI-DD-2` Consequences: "a label missing from the enriched detail needs a
 * mapper fallback to a repository").
 *
 * Neither read the builder already consumes exposes this label — only the id:
 * `ResultsTocResultsService.getTocByResultV2`'s `result_toc_result.result_toc_results[]
 * .indicators[].toc_results_indicator_id` (`results-toc-results.service.ts:729-741`, the same
 * shape `ResultsService.getBilateralResultById` forwards as `formDetail.tocMetadata` —
 * `results.service.ts:3708`). The label itself lives in
 * `${DB_TOC}.toc_results_indicators.indicator_description`, joined exactly as
 * `ResultsService.getTocMetadata` already does (`results.service.ts:3257-3313`) and as
 * `TocResultsRepository.getCatalogTargetsByIndicatorNodeIds` does
 * (`onecgiar-pr-server/src/toc/toc-results/toc-results.repository.ts:941`) — neither of which
 * `BilateralModule` can reach today without a module edit: `getTocMetadata` is a private
 * method on `ResultsService`, and `ResultsTocResultsModule` (imported at
 * `bilateral.module.ts:124`) exports `ResultsTocResultRepository`, `ResultsTocResultsService`,
 * `ResultsTocResultIndicatorsRepository` and `ResultsTocTargetIndicatorRepository` — never
 * `TocResultsRepository` (`results-toc-results.module.ts` exports list, checked 2026-09-16).
 *
 * `BilateralQualityPayloadBuilder` therefore depends on this interface, not a concrete
 * repository, so `bilateral.module.ts` stays untouched. `BIL-QAI-T-6` provides and registers
 * the concrete implementation under `INDICATOR_DESCRIPTION_RESOLVER`. Until it does, `build()`
 * runs with no resolver bound (`@Optional()`) and every mapped indicator is treated as
 * unresolvable — `UnresolvableLabelError`, per design.md "never emit an empty label silently".
 * That loud failure is the correct behaviour for a dependency that has not been wired yet, not
 * a defect to paper over in this file.
 */
export const INDICATOR_DESCRIPTION_RESOLVER = Symbol(
  'INDICATOR_DESCRIPTION_RESOLVER',
);

export interface IndicatorDescriptionResolver {
  /**
   * Returns a `{ [toc_results_indicator_id]: indicator_description }` lookup for the given
   * node ids. An id with no matching indicator (or an inactive one) is omitted from the
   * result rather than mapped to `null` — the caller treats "no entry" and "entry is
   * null/empty" the same way (unresolvable).
   */
  resolveIndicatorDescriptions(
    tocResultsIndicatorIds: string[],
  ): Promise<Record<string, string | null>>;
}
