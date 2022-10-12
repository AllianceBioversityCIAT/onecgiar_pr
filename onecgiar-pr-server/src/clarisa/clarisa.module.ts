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
import { ClarisaMeliaStudyTypeRepository } from './clarisa-melia-study-type/ClariasaMeliasStudyType.repository';
import { ClarisaInitiativesModule } from './clarisa-initiatives/clarisa-initiatives.module';

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
        ClarisaInitiativesModule
    ],
    controllers: [],
    providers: [
        ClarisaCronsService,
        ClarisaTaskService
    ],
    exports: [
        ClarisaActionAreasModule,
        ClarisaActionAreasOutcomesIndicatorsModule,
        ClarisaGlobalTargetModule,
        ClarisaImpactAreaModule,
        ClarisaImpactAreaIndicatorsModule,
        ClarisaInstitutionsModule,
        ClarisaInstitutionsTypeModule,
        ClarisaMeliaStudyTypeModule,
        ClarisaCronsService,
        ClarisaTaskService
    ]
})
export class ClarisaModule {}
