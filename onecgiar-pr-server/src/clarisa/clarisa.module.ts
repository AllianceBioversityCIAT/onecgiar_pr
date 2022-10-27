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
import { HttpModule, HttpService } from '@nestjs/axios';
import { ClarisaInnovationCharacteristicsModule } from './clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';
import { ClarisaInnovationTypeModule } from './clarisa-innovation-type/clarisa-innovation-type.module';
import { ClarisaInnovationReadinessLevelsModule } from './clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaPolicyStagesModule } from './clarisa-policy-stages/clarisa-policy-stages.module';
import { ClarisaConnectionsModule } from './clarisa-connections/clarisa-connections.module';

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
    ClarisaConnectionsModule
  ],
  controllers: [],
  providers: [ClarisaCronsService, ClarisaTaskService],
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
  ],
})
export class ClarisaModule {}
