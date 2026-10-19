// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { ProgressTrackerService } from './progress-tracker.service';
import { ProgressTrackerResolveService } from './progress-tracker-resolve.service';
import { PtPorbRepository } from './repositories/pt-porb.repository';
import { ProgressTrackerController } from './progress-tracker.controller';
import { ProgressTrackerResultProvenance } from './entities/progress-tracker-result-provenance.entity';
import { ProgressTrackerProvenanceService } from './progress-tracker-provenance.service';
import { ProgressTrackerActivityService } from './progress-tracker-activity.service';
import { ProgressTrackerPrefillService } from './progress-tracker-prefill.service';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';

/**
 * `PTM-T-2` — module skeleton for the Progress Tracker Interoperability surface
 * (`design.md` §2.1 "Where this lives in the system", §4.1 "New endpoints").
 *
 * Bare `HttpModule` import, no options — mirrors
 * `results-knowledge-products.module.ts:67-68`. The upstream call timeout is
 * configured per-request in `PTM-T-3`'s service via `progress-tracker.config.ts`,
 * not on the module (`HttpModule.register()` is deliberately not used here).
 *
 * `PTM-T-3` adds `TypeOrmModule.forFeature` for the two repositories the proxy
 * service reads directly (`ProgressTrackerIndicatorMap` for the mapping lookup,
 * `Version` for the active reporting phase — a lightweight `Repository<Version>`
 * injection rather than the many-dependency `VersioningService`, since this module
 * only needs the one `findOne` `$_findActivePhase` already uses) and registers the
 * service as a provider, exported for `PTM-T-4`'s controller.
 *
 * `PTM-T-4` adds `ProgressTrackerController` — the two read routes over
 * `ProgressTrackerService` (`design.md` §4.1).
 *
 * `PTM-T-5` adds `ProgressTrackerResolveService` (the `/resolve` fill routine) and its
 * `PtPorbRepository` dependency (PORB-text reads from `env.DB_TOC`, read-only —
 * `PTM-R-12`). Both are providers only, no new export: the resolve route is reached
 * exclusively through `ProgressTrackerController`, this module's own controller.
 *
 * `PTM-T-7` adds `ProgressTrackerProvenanceService` over `ProgressTrackerResultProvenance`,
 * exported for `ResultsFrameworkReportingModule`'s create handler (`design.md` §2.3).
 *
 * `ProgressTrackerActivityService` joins ready-counts with the map for the Reporting tab's
 * per-row `PT · N` badges (`GET programs/:programId/indicator-activity`).
 *
 * `ProgressTrackerPrefillService` (`PTB-R-18a`) saves a pick's evidence links and matched partners
 * after create; plain `Repository<>` injections, same reasoning as `Version` above.
 */
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ProgressTrackerIndicatorMap,
      ProgressTrackerResultProvenance,
      Version,
      Evidence,
      ResultsByInstitution,
      ClarisaInstitution,
    ]),
  ],
  controllers: [ProgressTrackerController],
  providers: [
    ProgressTrackerService,
    ProgressTrackerResolveService,
    PtPorbRepository,
    ProgressTrackerProvenanceService,
    ProgressTrackerActivityService,
    ProgressTrackerPrefillService,
  ],
  exports: [
    ProgressTrackerService,
    ProgressTrackerProvenanceService,
    ProgressTrackerPrefillService,
  ],
})
export class ProgressTrackerModule {}
