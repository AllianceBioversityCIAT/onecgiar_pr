import { Routes } from '@nestjs/core';
import { ClarisaActionAreasOutcomesIndicatorsModule } from './clarisa-action-areas-outcomes-indicators.module';

export const ClarisaActionAreasOutcomesIndicatorsRoutes: Routes = [
    {
        path:'',
        module: ClarisaActionAreasOutcomesIndicatorsModule
    }
];