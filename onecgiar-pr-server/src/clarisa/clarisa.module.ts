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
import { ClarisaTasksService } from './clarisatasks.service';

@Module({
    imports: [
        ClarisaActionAreasModule,
        ClarisaActionAreasOutcomesIndicatorsModule,
        ClarisaGlobalTargetModule,
        ClarisaImpactAreaModule,
        ClarisaImpactAreaIndicatorsModule,
        ClarisaInstitutionsModule,
        ClarisaInstitutionsTypeModule,
        ClarisaMeliaStudyTypeModule
    ],
    controllers: [],
    providers: [
        ClarisaTasksService
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
        ClarisaTasksService
    ]
})
export class ClarisaModule {}
