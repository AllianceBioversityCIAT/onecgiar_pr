// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IndicatorDescriptionResolver } from './indicator-description-resolver';

/**
 * Concrete {@link IndicatorDescriptionResolver} — resolves
 * `toc_results_indicator_id[] -> indicator_description` labels for
 * `theory_of_change.indicator` (design.md §5 "Payload builder" / `BIL-QAI-DD-2`).
 *
 * Queries `${DB_TOC}.toc_results_indicators` directly through the already-injected
 * `DataSource` — the same connection `BilateralService` already uses for raw queries and
 * repository lookups (e.g. `bilateral.service.ts` `buildLastSubmissionMetadata`'s
 * `this.dataSource.query(...)`, `buildInnovationUseBilateralSummary`'s
 * `this.dataSource.getRepository(...)`) — mirroring the join
 * `ResultsService.getTocMetadata` runs (`results.service.ts:3257-3313`:
 * `tri.related_node_id`, `tri.indicator_description`, `tri.is_active = 1`).
 *
 * Deliberately NOT routed through `TocResultsRepository`
 * (`onecgiar-pr-server/src/toc/toc-results/toc-results.repository.ts:941`): its owning
 * `TocResultsModule` (`toc/toc-results/toc-results.module.ts`) imports `MQAPModule`,
 * `SharePointModule`, `BilateralVersioningRulesModule` and `forwardRef`s to
 * `VersioningModule`, `ResultInnovationPackageModule` and `InnovationPathwayModule` — several
 * of which already sit on `BilateralModule`'s own import graph. Importing that whole module
 * into `BilateralModule` for one lookup risks growing a cycle this task has no way to fully
 * verify; a direct query against the same schema carries none of that risk.
 */
@Injectable()
export class TocIndicatorDescriptionResolver
  implements IndicatorDescriptionResolver
{
  constructor(private readonly dataSource: DataSource) {}

  async resolveIndicatorDescriptions(
    tocResultsIndicatorIds: string[],
  ): Promise<Record<string, string | null>> {
    const ids = Array.from(
      new Set(
        (tocResultsIndicatorIds ?? []).filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    );

    if (!ids.length) {
      return {};
    }

    const placeholders = ids.map(() => '?').join(', ');
    const query = `
      SELECT
        tri.related_node_id AS toc_results_indicator_id,
        tri.indicator_description
      FROM ${process.env.DB_TOC}.toc_results_indicators tri
      WHERE tri.related_node_id IN (${placeholders})
        AND tri.is_active = 1
    `;

    const rows: Array<{
      toc_results_indicator_id: string | null;
      indicator_description: string | null;
    }> = await this.dataSource.query(query, ids);

    const lookup: Record<string, string | null> = {};
    for (const row of rows ?? []) {
      if (row?.toc_results_indicator_id != null) {
        lookup[row.toc_results_indicator_id] =
          row.indicator_description ?? null;
      }
    }
    return lookup;
  }
}
