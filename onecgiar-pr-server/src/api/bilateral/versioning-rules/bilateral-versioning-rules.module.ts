import { Module } from '@nestjs/common';
import { BilateralVersioningRulesService } from './bilateral-versioning-rules.service';
import { ResultRepository } from '../../results/result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

/**
 * Leaf module: it imports nothing and is imported by both `BilateralModule` and
 * `VersioningModule`, which is what lets the two versioning entry points share one copy of
 * the eligibility rules without closing a dependency cycle between them.
 *
 * The repositories are provided **directly** rather than by importing the modules that own
 * them, for the same reason — importing `VersioningModule` here would recreate the cycle this
 * module exists to avoid. Both are plain `Repository` subclasses over `DataSource`, so
 * providing them costs nothing.
 *
 * Keep this module import-free. `app.module.spec.ts` is the regression test: if the graph
 * ever stops compiling, that is what will say so.
 */
@Module({
  providers: [
    BilateralVersioningRulesService,
    ResultRepository,
    VersionRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [BilateralVersioningRulesService],
})
export class BilateralVersioningRulesModule {}
