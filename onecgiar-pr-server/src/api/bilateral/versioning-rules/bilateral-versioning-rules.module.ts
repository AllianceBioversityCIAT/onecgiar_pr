import { Module } from '@nestjs/common';
import { BilateralVersioningRulesService } from './bilateral-versioning-rules.service';
import { ResultRepository } from '../../results/result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
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
 *
 * `ResultsCenterRepository` joined the same way (`@akili-spec
 * changes/bilateral-create-upsert-by-code`, UBC-DD-6): `assertCallerMayVersion`'s lead-centre
 * fallback moved here from `bvs` and needs it, and it is a plain `Repository` subclass over
 * `DataSource` just like the two above — providing it directly costs nothing and imports
 * nothing that could close a cycle.
 */
@Module({
  providers: [
    BilateralVersioningRulesService,
    ResultRepository,
    VersionRepository,
    ResultsCenterRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [BilateralVersioningRulesService],
})
export class BilateralVersioningRulesModule {}
