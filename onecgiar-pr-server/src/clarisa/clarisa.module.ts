/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { ClarisaActionAreasOutcomesIndicatorsModule } from './clarisa-action-areas-outcomes-indicators/clarisa-action-areas-outcomes-indicators.module';
import { ClarisaActionAreasModule } from './clarisa-action-areas/clarisa-action-areas.module';
import { ClarisaGlobalTargetModule } from './clarisa-global-target/clarisa-global-target.module';
import { ClarisaImpactAreaIndicatorsModule } from './clarisa-impact-area-indicators/clarisa-impact-area-indicators.module';
import { ClarisaImpactAreaModule } from './clarisa-impact-area/clarisa-impact-area.module';
import { ClarisaInstitutionsTypeModule } from './clarisa-institutions-type/clarisa-institutions-type.module';
import { ClarisaInstitutionsModule } from './clarisa-institutions/clarisa-institutions.module';
import { ClarisaMeliaStudyTypeModule } from './clarisa-melia-study-type/clarisa-melia-study-type.module';
import { ClarisaCronsService } from './clarisaCron.service';
import { ClarisaCountriesModule } from './clarisa-countries/clarisa-countries.module';
import { ClarisaRegionsModule } from './clarisa-regions/clarisa-regions.module';
import { ClarisaCountriesRegionsModule } from './clarisa-countries-regions/clarisa-countries-regions.module';
import { ClarisaOutcomeIndicatorsModule } from './clarisa-outcome-indicators/clarisa-outcome-indicators.module';
import { ClarisaRegionTypesModule } from './clarisa-region-types/clarisa-region-types.module';
import { ClarisaTaskService } from './clarisatask.service';
import { ClarisaInitiativesModule } from './clarisa-initiatives/clarisa-initiatives.module';
import { HttpModule } from '@nestjs/axios';
import { ClarisaInnovationCharacteristicsModule } from './clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';
import { ClarisaInnovationTypeModule } from './clarisa-innovation-type/clarisa-innovation-type.module';
import { ClarisaInnovationReadinessLevelsModule } from './clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaPolicyStagesModule } from './clarisa-policy-stages/clarisa-policy-stages.module';
import { ClarisaConnectionsModule } from './clarisa-connections/clarisa-connections.module';
import { ClarisaGeographicScopesModule } from './clarisa-geographic-scopes/clarisa-geographic-scopes.module';
import { ClarisaActionAreaOutcomeModule } from './clarisa-action-area-outcome/clarisa-action-area-outcome.module';
import { ClarisaActionAreaOutcomesActionAreaModule } from './clarisa-action-area-outcomes-action-area/clarisa-action-area-outcomes-action-area.module';
import { ClarisaCentersModule } from './clarisa-centers/clarisa-centers.module';
import { TocResultsRepository } from '../toc/toc-results/toc-results.repository';
import { ClarisaPolicyTypesModule } from './clarisa-policy-types/clarisa-policy-types.module';
import { ClarisaRegionsCgiarModule } from './clarisa-regions-cgiar/clarisa-regions-cgiar.module';
import { ClarisaSdgsModule } from './clarisa-sdgs/clarisa-sdgs.module';
import { ClarisaSdgsTargetsModule } from './clarisa-sdgs-targets/clarisa-sdgs-targets.module';
import { ClarisaSecondOrderAdministrativeDivisionModule } from './clarisa-second-order-administrative-division/clarisa-second-order-administrative-division.module';
import { ClarisaFirstOrderAdministrativeDivisionModule } from './clarisa-first-order-administrative-division/clarisa-first-order-administrative-division.module';
import { ClarisaInnovationUseLevelsModule } from './clarisa-innovation-use-levels/clarisa-innovation-use-levels.module';
import { ClarisaTocPhasesModule } from './clarisa-toc-phases/clarisa-toc-phases.module';
import { ClarisaSubnationalScopeModule } from './clarisa-subnational-scope/clarisa-subnational-scope.module';
import { ClarisaCgiarEntityTypesModule } from './clarisa-cgiar-entity-types/clarisa-cgiar-entity-types.module';
import { ClarisaInitiativeStageModule } from './clarisa-initiative-stage/clarisa-initiative-stage.module';

@Module({
  imports: [
    ClarisaActionAreasModule,
    ClarisaActionAreasOutcomesIndicatorsModule,
    ClarisaGlobalTargetModule,
    ClarisaImpactAreaModule,
    ClarisaImpactAreaIndicatorsModule,
    ClarisaInstitutionsModule,
    ClarisaInstitutionsTypeModule,
    ClarisaMeliaStudyTypeModule,
    ClarisaCountriesModule,
    ClarisaRegionsModule,
    ClarisaCountriesRegionsModule,
    ClarisaOutcomeIndicatorsModule,
    ClarisaRegionTypesModule,
    ClarisaInitiativesModule,
    HttpModule,
    ClarisaInnovationCharacteristicsModule,
    ClarisaInnovationTypeModule,
    ClarisaInnovationReadinessLevelsModule,
    ClarisaPolicyStagesModule,
    ClarisaConnectionsModule,
    ClarisaGeographicScopesModule,
    ClarisaActionAreaOutcomeModule,
    ClarisaActionAreaOutcomesActionAreaModule,
    ClarisaCentersModule,
    ClarisaPolicyTypesModule,
    ClarisaRegionsCgiarModule,
    ClarisaSdgsModule,
    ClarisaSdgsTargetsModule,
    ClarisaSecondOrderAdministrativeDivisionModule,
    ClarisaFirstOrderAdministrativeDivisionModule,
    ClarisaInnovationUseLevelsModule,
    ClarisaTocPhasesModule,
    ClarisaSubnationalScopeModule,
    ClarisaCgiarEntityTypesModule,
    ClarisaInitiativeStageModule,
  ],
  controllers: [],
  providers: [ClarisaCronsService, ClarisaTaskService, TocResultsRepository],
  exports: [
    ClarisaActionAreasModule,
    ClarisaActionAreasOutcomesIndicatorsModule,
    ClarisaGlobalTargetModule,
    ClarisaImpactAreaModule,
    ClarisaImpactAreaIndicatorsModule,
    ClarisaInstitutionsModule,
    ClarisaInstitutionsTypeModule,
    ClarisaMeliaStudyTypeModule,
    ClarisaCountriesModule,
    ClarisaRegionsModule,
    ClarisaCountriesRegionsModule,
    ClarisaOutcomeIndicatorsModule,
    ClarisaRegionTypesModule,
    ClarisaInitiativesModule,
    HttpModule,
    ClarisaInnovationCharacteristicsModule,
    ClarisaInnovationTypeModule,
    ClarisaInnovationReadinessLevelsModule,
    ClarisaPolicyStagesModule,
    ClarisaCronsService,
    ClarisaTaskService,
    ClarisaSdgsModule,
    ClarisaSdgsTargetsModule,
    ClarisaInitiativeStageModule,
  ],
})
export class ClarisaModule {}
