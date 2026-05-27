import { Module } from '@nestjs/common';
import { PublicResultsFrameworkController } from './public-results-framework.controller';
import { ResultsFrameworkReportingModule } from '../results-framework-reporting/results-framework-reporting.module';

/**
 * Public, unauthenticated surface over the Results Framework reporting logic.
 *
 * Reuses `ResultsFrameworkReportingService` (exported by
 * `ResultsFrameworkReportingModule`) so there is no duplicated query/enrichment
 * logic — the public controller is a thin, auth-free front door over the same
 * business method used by the private endpoint.
 */
@Module({
  imports: [ResultsFrameworkReportingModule],
  controllers: [PublicResultsFrameworkController],
})
export class PublicResultsFrameworkModule {}
