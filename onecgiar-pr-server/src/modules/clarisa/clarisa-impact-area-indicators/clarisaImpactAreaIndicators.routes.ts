import { Routes } from '@nestjs/core';
import { ClarisaImpactAreaIndicatorsModule } from './clarisa-impact-area-indicators.module';

export const ClarisaImpactAreaIndicatorsRoutes: Routes = [
    {
        path:'',
        module: ClarisaImpactAreaIndicatorsModule
    }
];