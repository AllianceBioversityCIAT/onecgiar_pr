import { Module } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultInnovationMergeSplitRepository } from './result-innovation-merge-split.repository';

/**
 * P2-3292 Step 3.
 *
 * 🛑 This module exists because of an outage, and the shape is not optional.
 *
 * `ResultInnovationMergeSplitRepository` was injected into `ResultsService` and registered only in
 * `ResultsModule`'s providers. But `ResultsService` is ALSO provided by `DeleteRecoverDataModule`
 * and `ResultsKnowledgeProductsModule`, and Nest resolves a provider's dependencies inside the
 * module that declares it. Both of those contexts lacked the repository, so the application threw
 * `UnknownDependenciesException` at bootstrap and the backend never came up — while the build
 * stayed green, because the deploy runs `docker run -d`, which returns before the app serves.
 * prtest was down for the whole team for ~25 minutes on 3 Sep 2026.
 *
 * The fix is the pattern the sibling dependency already used:
 * `ResultsInvestmentDiscontinuedOptionsModule` provides and exports its repository, and every
 * module that declares `ResultsService` imports it. Doing the same here means the next module to
 * declare `ResultsService` gets the repository by importing one thing, instead of having to know
 * to copy a provider into two lists.
 */
@Module({
  providers: [ResultInnovationMergeSplitRepository, HandlersError],
  exports: [ResultInnovationMergeSplitRepository],
})
export class ResultInnovationMergeSplitModule {}
