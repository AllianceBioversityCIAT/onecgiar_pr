import { Module } from '@nestjs/common';
import { BilateralAccessService } from './bilateral-access.service';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocImpactAreaTargetRepository } from '../results-toc-results/repositories/result-toc-impact-area.repository';
import { ResultsTocSdgTargetRepository } from '../results-toc-results/repositories/result-toc-sdg-target.repository';
import { ResultsSdgTargetRepository } from '../results-toc-results/repositories/results-sdg-targets.repository';
import { ResultsActionAreaOutcomeRepository } from '../results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from '../results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

/**
 * Mirrors `ResultInnovationMergeSplitModule` (P2-3292; prtest outage, 3 Sep 2026,
 * `result-innovation-merge-split.module.ts`).
 *
 * 🛑 This module exists because of that outage class, and the shape is not optional.
 *
 * `ResultsService` takes `BilateralAccessService` as a required constructor param and is declared
 * directly in `ResultsModule`, `DeleteRecoverDataModule` (`delete-recover-data.module.ts`) and
 * `ResultsKnowledgeProductsModule` (`results-knowledge-products.module.ts`). Nest resolves a
 * provider's dependencies inside the module that DECLARES it, so `BilateralAccessService` being a
 * provider of only one of those three modules would throw `UnknownDependenciesException` at
 * bootstrap for the other two — the exact failure `ResultInnovationMergeSplitModule` was built to
 * stop from recurring. No Jest suite catches this: nothing compiles those modules' full DI graphs,
 * and their controller specs mock `ResultsService`/`DeleteRecoverDataService` wholesale.
 *
 * The fix is the same pattern: `BilateralAccessService` and everything IT needs — the two
 * membership reads (`RoleByUserRepository`, `ResultByInitiativesRepository`) and, for the DD-7
 * row-ownership check, `ResultsTocResultRepository` plus the six trivial sub-repos its own
 * constructor takes (all of them need only `DataSource` — app-wide via `TypeOrmModule.forRoot` —
 * and `HandlersError`) — are self-contained here. Every module that declares `ResultsService`
 * imports this one module instead of copying providers into three separate lists.
 *
 * Only `BilateralAccessService` is exported — the three modules above already declare
 * `RoleByUserRepository` and `ResultByInitiativesRepository` themselves (or get the latter via
 * `ResultsByInititiativesModule`), so nothing needs them from here too.
 *
 * **No `forwardRef`, no cycle:** nothing this module imports is a `@Module` (every provider here
 * is a plain `@Injectable()` repository whose own constructor takes only `DataSource` and/or
 * `HandlersError`), so `BilateralAccessModule` cannot be part of an import cycle. Confirmed by a
 * full app boot.
 */
@Module({
  providers: [
    BilateralAccessService,
    RoleByUserRepository,
    ResultByInitiativesRepository,
    ResultsTocResultRepository,
    ResultsTocResultIndicatorsRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsTocSdgTargetRepository,
    ResultsSdgTargetRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    HandlersError,
  ],
  exports: [BilateralAccessService],
})
export class BilateralAccessModule {}
